import "server-only";

// In-process sliding-window rate limiter.
//
// SCOPE: single-instance, in-memory. Buckets are lost on server restart,
// and limits are NOT shared across replicas. This is good enough for
// preventing accidental abuse and slowing brute-force attacks on a small
// deployment. For multi-instance production, swap the implementation for
// Upstash Ratelimit / Vercel KV / Redis — call sites don't need to change.
//
// Key the limiter by:
//   `action:${ip}`      → unauthenticated actions (login, signup, …)
//   `action:${userId}`  → authenticated actions   (invite, submitPayment, …)

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000; // hard ceiling to bound memory

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      // Opportunistic GC when the map gets large.
      pruneExpired(now);
    }
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0, resetAt };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    };
  }

  existing.count++;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
    resetAt: existing.resetAt,
  };
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// Convenience: humanize the retry message for toast/UI display.
export function rateLimitMessage(
  result: RateLimitResult,
  noun = "requests",
): string {
  if (result.ok) return "";
  const seconds = result.retryAfterSeconds;
  if (seconds < 60) {
    return `Too many ${noun}. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Too many ${noun}. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
