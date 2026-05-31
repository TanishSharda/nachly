import { NextRequest, NextResponse } from 'next/server';

let redisClient: any = null;
let redisEnabled = false;

async function initRedis() {
  if (redisClient || redisEnabled) return;
  const url = process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) return;
  try {
    // try dynamic import of ioredis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis');
    redisClient = new IORedis(url);
    redisEnabled = true;
  } catch (e) {
    // failed to load ioredis; leave redis disabled and fall back to memory
    console.warn('Rate limiter: ioredis not available, falling back to in-memory store');
    redisClient = null;
    redisEnabled = false;
  }
}

type Key = string;

interface Entry {
  count: number;
  windowStart: number;
}

const STORE_KEY = '__NAACHLY_RATE_LIMIT_STORE__' as const;

// store on globalThis to survive hot reloads in dev
const globalStore = (globalThis as any)[STORE_KEY] as Map<Key, Entry> | undefined;
if (!globalStore) {
  (globalThis as any)[STORE_KEY] = new Map<Key, Entry>();
}
const store: Map<Key, Entry> = (globalThis as any)[STORE_KEY];

export interface RateLimitOptions {
  windowMs?: number; // default 60s
  max?: number; // default 60
  keyPrefix?: string;
}

export function getClientIp(req: Request | NextRequest): string {
  const headers = (req as any).headers;
  const forwarded = headers?.get?.('x-forwarded-for');
  if (forwarded) return String(forwarded).split(',')[0].trim();
  const real = headers?.get?.('x-real-ip');
  if (real) return String(real);
  // fallback to host header (not ideal)
  return headers?.get?.('host') || 'unknown';
}

export async function rateLimit(req: Request | NextRequest, opts: RateLimitOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 60;
  const keyPrefix = opts.keyPrefix ?? 'rl';

  const ip = getClientIp(req);
  const route = (req as NextRequest).nextUrl?.pathname || new URL((req as Request).url).pathname || 'unknown';
  const key = `${keyPrefix}:${route}:${ip}`;

  await initRedis();

  if (redisEnabled && redisClient) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        // set expiry in ms
        await redisClient.pexpire(key, windowMs);
      }
      const ttl = await redisClient.pttl(key);
      const allowed = count <= max;
      return { allowed, remaining: Math.max(0, max - count), resetIn: Math.max(0, ttl) };
    } catch (e: any) {
      // fallback to memory store on redis errors
      console.warn('Rate limiter: redis error, falling back to memory store', e?.message ?? String(e));
    }
  }

  // in-memory fallback (synchronous)
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, resetIn: windowMs };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetIn: Math.max(0, windowMs - (now - entry.windowStart)) };
  }

  entry.count += 1;
  store.set(key, entry);
  return { allowed: true, remaining: Math.max(0, max - entry.count), resetIn: Math.max(0, windowMs - (now - entry.windowStart)) };
}

export async function enforceRateLimit(req: Request | NextRequest, opts: RateLimitOptions = {}) {
  const res = await rateLimit(req, opts);
  if (!res.allowed) {
    const body = { error: 'Too many requests', detail: 'Rate limit exceeded' };
    return NextResponse.json(body, { status: 429, headers: { 'x-rate-limit-remaining': '0' } });
  }
  return null;
}
