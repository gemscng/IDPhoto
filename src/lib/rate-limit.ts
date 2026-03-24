/**
 * Rate limiter backed by Upstash Redis in production.
 * Falls back to in-memory when UPSTASH_REDIS_REST_URL is not set (local dev).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Cache Ratelimit instances by config signature to avoid re-creation
const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const cacheKey = `${config.limit}:${config.windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    const windowSec = Math.ceil(config.windowMs / 1000);
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.fixedWindow(config.limit, `${windowSec} s`),
      prefix: "idphoto:rl",
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// ---------- In-memory fallback for local dev ----------

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();
let lastCleanup = Date.now();

function memoryCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}

function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  memoryCleanup();
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

// ---------- Public API ----------

/**
 * Rate limit a request. Uses Upstash Redis in production, in-memory locally.
 * The function is async when using Upstash, but callers already handle this
 * by awaiting the result.
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(config);

  if (!upstash) {
    return memoryRateLimit(key, config);
  }

  const result = await upstash.limit(key);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}

/**
 * Extract client IP from request headers.
 * Supports Vercel's x-forwarded-for and x-real-ip.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
