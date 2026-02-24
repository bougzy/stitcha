/* -------------------------------------------------------------------------- */
/*  In-Memory Sliding Window Rate Limiter                                      */
/*  No external dependencies — works with Next.js Edge middleware              */
/* -------------------------------------------------------------------------- */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp when this window expires
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number; // 0 if allowed
}

/**
 * Check rate limit for a given key (e.g. IP + route).
 * Returns whether the request is allowed and how many requests remain.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired window — start fresh
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, retryAfterMs: 0 };
  }

  // Within current window
  if (entry.count < config.maxRequests) {
    entry.count++;
    return { allowed: true, remaining: config.maxRequests - entry.count, retryAfterMs: 0 };
  }

  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: entry.resetAt - now,
  };
}

/* ---- Preconfigured rate limit tiers ---- */

/** General API: 60 requests per minute */
export const RATE_LIMIT_GENERAL: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

/** Auth endpoints: 5 requests per minute */
export const RATE_LIMIT_AUTH: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 5,
};

/** Admin endpoints: 30 requests per minute */
export const RATE_LIMIT_ADMIN: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 30,
};
