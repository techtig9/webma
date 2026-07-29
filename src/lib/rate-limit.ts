// Fair-use rate limiting for the AI routes, per the Security standard's explicit
// "API rate limiting" requirement.
//
// PRODUCTION CAVEAT: this is an in-memory sliding window, scoped to a single running
// process. On Vercel's serverless platform each function invocation can land on a
// different instance, so this only rate-limits within one warm instance — it will
// NOT enforce a global limit across a scaled deployment. That's an acceptable MVP
// trade-off (it still stops the trivial "spam the same warm endpoint" case), but
// before relying on this for real abuse prevention, swap the Map below for a
// shared store — Upstash Redis's free tier is the natural fit here, consistent with
// the spec's free-tier-first infrastructure strategy.

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * @param key Unique identifier for the thing being limited — typically `${userId}:${action}`.
 * @param limit Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}

// Periodically clear stale buckets so this Map doesn't grow unbounded on a
// long-lived warm instance.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000);
