import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiWebHandler } from '../src/WebHandler';

const DEFAULT_DATABASE_URL =
  'postgres://agentic_inbox:agentic_inbox@localhost:5442/agentic_inbox';

describe('createApiWebHandler', () => {
  let handler: (request: Request) => Promise<Response>;
  let dispose: () => Promise<void>;
  let previousDatabaseUrl: string | undefined;
  let previousOpenRouterKey: string | undefined;

  beforeAll(() => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
    process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
    process.env.OPENROUTER_API_KEY =
      previousOpenRouterKey && previousOpenRouterKey.length > 0
        ? previousOpenRouterKey
        : 'test-openrouter-key';
    const api = createApiWebHandler({ disableLogger: true });
    handler = api.handler;
    dispose = api.dispose;
  });

  afterAll(async () => {
    await dispose();
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousOpenRouterKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
    }
  });

  it('returns 204 for GET /api/v1/health', async () => {
    const response = await handler(
      new Request('http://localhost/api/v1/health', { method: 'GET' })
    );
    expect(response.status).toBe(204);
  });

  it('serves OpenAPI JSON at /openapi.json', async () => {
    const response = await handler(
      new Request('http://localhost/openapi.json', { method: 'GET' })
    );
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toBeTypeOf('object');
    expect(body).not.toBeNull();
    if (body === null || typeof body !== 'object') {
      throw new Error('expected openapi object');
    }
    expect('openapi' in body || 'paths' in body).toBe(true);
  });

  it('serves Scalar docs at /docs', async () => {
    const response = await handler(
      new Request('http://localhost/docs', { method: 'GET' })
    );
    expect(response.status).toBe(200);
    const contentType = response.headers.get('content-type') ?? '';
    expect(
      contentType.includes('text/html') || contentType.includes('json')
    ).toBe(true);
  });
});

describe('createApiWebHandler demo mode', () => {
  let handler: (request: Request) => Promise<Response>;
  let dispose: () => Promise<void>;
  let previousDatabaseUrl: string | undefined;
  let previousOpenRouterKey: string | undefined;

  beforeAll(() => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.OPENROUTER_API_KEY;
    const api = createApiWebHandler({ disableLogger: true });
    handler = api.handler;
    dispose = api.dispose;
  });

  afterAll(async () => {
    await dispose();
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousOpenRouterKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
    }
  });

  it('returns 204 for GET /api/v1/health without env', async () => {
    const response = await handler(
      new Request('http://localhost/api/v1/health', { method: 'GET' })
    );
    expect(response.status).toBe(204);
  });

  it('returns the seeded showcase inbox', async () => {
    const response = await handler(
      new Request('http://localhost/api/v1/inbox', { method: 'GET' })
    );
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toBeTypeOf('object');
    expect(body).not.toBeNull();
    if (body === null || typeof body !== 'object') {
      throw new Error('expected inbox object');
    }
    const record = body as {
      summary?: { processed?: number };
      items?: unknown[];
    };
    expect(Array.isArray(record.items)).toBe(true);
    expect((record.items ?? []).length).toBeGreaterThan(0);
    expect(record.summary?.processed).toBeGreaterThan(0);
  });
});
