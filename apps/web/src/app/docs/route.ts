import { handleEffectApiRequest } from '@/lib/effect-api-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = handleEffectApiRequest;
export const HEAD = handleEffectApiRequest;
