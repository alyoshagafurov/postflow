import { env, features } from "@/lib/env";

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number; // epoch ms
};

// ---- In-memory fallback (per-process; fine for dev / single instance) ----
const buckets = new Map<string, { count: number; reset: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }
  bucket.count += 1;
  return {
    success: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    reset: bucket.reset,
  };
}

// Occasionally sweep expired buckets to bound memory.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }, 60_000).unref?.();
}

// ---- Optional Upstash-backed limiter (durable, multi-instance) ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const upstashLimiters: Record<string, any> = {};

async function upstashLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  const id = `${limit}:${windowSec}`;
  if (!upstashLimiters[id]) {
    upstashLimiters[id] = new Ratelimit({
      redis: new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "postflow/rl",
      analytics: false,
    });
  }
  const r = await upstashLimiters[id].limit(key);
  return { success: r.success, remaining: r.remaining, reset: r.reset };
}

export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowSec } = opts;
  if (features.upstash) {
    try {
      return await upstashLimit(key, limit, windowSec);
    } catch {
      // fall back to in-memory on transport error
    }
  }
  return memoryLimit(key, limit, windowSec * 1000);
}
