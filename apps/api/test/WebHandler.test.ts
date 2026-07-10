import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiWebHandler } from '../src/WebHandler';

const DEFAULT_DATABASE_URL =
  'postgres://agentic_inbox:agentic_inbox@localhost:5442/agentic_inbox';

describe('createApiWebHandler', () => {
  let handler: (request: Request) => Promise<Response>;
  let dispose: () => Promise<void>;

  beforeAll(() => {
    if (
      process.env.DATABASE_URL === undefined ||
      process.env.DATABASE_URL.length === 0
    ) {
      process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
    }
    // AppLive builds the OpenRouter model layer at construction; health/docs
    // never call it, but Config still requires a non-empty string.
    if (
      process.env.OPENROUTER_API_KEY === undefined ||
      process.env.OPENROUTER_API_KEY.length === 0
    ) {
      process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    }
    const api = createApiWebHandler({ disableLogger: true });
    handler = api.handler;
    dispose = api.dispose;
  });

  afterAll(async () => {
    await dispose();
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
