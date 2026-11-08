import { handleEffectApiRequest } from '@/lib/effect-api-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** Allow long triage/chat SSE streams on Vercel (seconds). */
export const maxDuration = 300;

export const GET = handleEffectApiRequest;
export const POST = handleEffectApiRequest;
export const PUT = handleEffectApiRequest;
export const PATCH = handleEffectApiRequest;
export const DELETE = handleEffectApiRequest;
export const HEAD = handleEffectApiRequest;
export const OPTIONS = handleEffectApiRequest;
