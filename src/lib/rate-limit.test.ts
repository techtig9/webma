import { describe, it, expect } from "vitest";
import { checkRateLimit, acquireLock, releaseLock } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit(key, 5, 60_000)).allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) await checkRateLimit(key, 3, 60_000);
    const result = await checkRateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    await checkRateLimit(keyA, 1, 60_000);
    expect((await checkRateLimit(keyA, 1, 60_000)).allowed).toBe(false);
    expect((await checkRateLimit(keyB, 1, 60_000)).allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `test-${Math.random()}`;
    expect((await checkRateLimit(key, 1, 50)).allowed).toBe(true);
    expect((await checkRateLimit(key, 1, 50)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect((await checkRateLimit(key, 1, 50)).allowed).toBe(true);
  });
});

// Regression coverage for the Phase 5 fix: a double-click on "Generate" (or
// a browser retry) previously fired two identical AI-generation requests
// that both passed the credit gate and both got billed. acquireLock is the
// primitive that closes that — these tests exercise its actual contract
// (exclusive acquire, independent keys, release lets a retry through,
// automatic TTL expiry as the crash-safety net) via the in-memory fallback
// path (no UPSTASH_REDIS_REST_URL/TOKEN set in the test environment, same
// as checkRateLimit's tests above).
describe("acquireLock / releaseLock", () => {
  it("grants the lock to the first caller and denies a concurrent second caller for the same key", async () => {
    const key = `lock-${Math.random()}`;
    expect(await acquireLock(key, 5)).toBe(true);
    expect(await acquireLock(key, 5)).toBe(false);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `lock-a-${Math.random()}`;
    const keyB = `lock-b-${Math.random()}`;
    expect(await acquireLock(keyA, 5)).toBe(true);
    expect(await acquireLock(keyB, 5)).toBe(true);
  });

  it("lets a new request through immediately after release — the legitimate 'try again' path", async () => {
    const key = `lock-${Math.random()}`;
    expect(await acquireLock(key, 5)).toBe(true);
    await releaseLock(key);
    expect(await acquireLock(key, 5)).toBe(true);
  });

  it("expires automatically after the TTL even if release() is never called — a crashed request can't lock a user out forever", async () => {
    const key = `lock-${Math.random()}`;
    expect(await acquireLock(key, 0.05)).toBe(true);
    expect(await acquireLock(key, 0.05)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(await acquireLock(key, 0.05)).toBe(true);
  });

  it("releasing a key that was never locked is a harmless no-op", async () => {
    await expect(releaseLock(`never-locked-${Math.random()}`)).resolves.toBeUndefined();
  });
});
