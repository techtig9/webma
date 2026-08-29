// Fair-use rate limiting for the AI routes, per the Security standard's explicit
// "API rate limiting" requirement.
//
// Backed by Upstash Redis so the limit is enforced across your WHOLE app, not just
// one warm serverless instance — this replaces the old in-memory Map, which only
// caught the trivial "spam the same warm instance" case on Vercel's serverless
// platform. Falls back to the old in-memory behavior automatically when
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't set (local dev without
// Upstash configured, or the test suite) — see .env.example for setup.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// One Ratelimit instance per distinct (limit, windowMs) pair, cached so repeated
// calls with the same numbers reuse it instead of constructing a new one per request.
const limiters = new Map<string, Ratelimit>();

function upstashLimiterFor(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// --- In-memory fallback (used only when Upstash isn't configured) -----------------
// Identical logic to the original implementation. Single-instance only — this is
// the exact limitation this fix closes for production, kept here purely so local
// dev and the test suite work without needing a real Redis database.
interface Bucket {
  count: number;
  windowStart: number;
}
const memoryBuckets = new Map<string, Bucket>();

function checkMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    memoryBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (now - bucket.windowStart > 10 * 60 * 1000) memoryBuckets.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * @param key Unique identifier for the thing being limited — typically `${userId}:${action}`.
 * @param limit Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!redis) return checkMemory(key, limit, windowMs);

  const result = await upstashLimiterFor(limit, windowMs).limit(key);
  if (result.success) return { allowed: true };

  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { allowed: false, retryAfterSeconds };
}

// --- In-flight request lock ---------------------------------------------
// A separate primitive from checkRateLimit above: rate limiting caps how
// many requests happen over time, but does nothing to stop the SAME
// logical request (a double-click on "Generate", or a browser retry after
// a network blip) from being processed twice CONCURRENTLY — both copies
// would pass canUseFeature's credit gate (since neither has deducted yet)
// and both would run a full, separately-billed AI generation, double-
// charging credits for what the user experienced as one action. This is
// documented as a known gap in credits.ts's canUseFeature — that comment
// is about a deeper race (decrement_credits' clamp-at-zero letting two
// truly simultaneous requests both slip under the gate near a balance
// edge), which needs a live database to redesign safely and stays
// deferred. This lock is a different, additive mechanism: it doesn't
// touch decrement_credits at all, it just stops a second identical
// request for the same user+action from starting its own expensive work
// while one is already in flight — the same idempotency-style pattern
// already used for Paddle webhook dedup (processed_webhook_events), just
// via Redis (with the same in-memory fallback as checkRateLimit above)
// instead of a database table, since this only needs to live for the
// duration of one request, not a permanent audit record.
const memoryLocks = new Set<string>();

/** Attempts to acquire an exclusive lock for `key`, expiring automatically
 * after `ttlSeconds` even if release() is never called (a crashed request,
 * a killed serverless instance) — never leaves a user permanently locked
 * out of retrying. Returns false if the key is already locked. */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const lockKey = `lock:${key}`;
  if (!redis) {
    if (memoryLocks.has(lockKey)) return false;
    memoryLocks.add(lockKey);
    setTimeout(() => memoryLocks.delete(lockKey), ttlSeconds * 1000);
    return true;
  }
  // "NX" — set only if not already present — is what makes this an atomic
  // acquire rather than a check-then-set race between concurrent requests.
  const result = await redis.set(lockKey, "1", { nx: true, ex: ttlSeconds });
  return result === "OK";
}

/** Releases a lock early (on success or failure) so a legitimate next
 * request from the same user doesn't have to wait out the full TTL. */
export async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`;
  if (!redis) {
    memoryLocks.delete(lockKey);
    return;
  }
  await redis.del(lockKey);
}
