/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach with automatic cleanup.
 *
 * For production at scale, replace with Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000);
  // Allow the process to exit without waiting for this interval
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (typically IP address).
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const key = `${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + config.windowSeconds * 1000;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  // Existing window
  entry.count++;

  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get the client IP from a request.
 * Checks x-forwarded-for header first (for reverse proxies), then falls back.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

// Pre-configured rate limiters for common use cases
export const API_RATE_LIMITS = {
  /** General API: 100 requests per minute */
  general: { limit: 100, windowSeconds: 60 },
  /** Auth endpoints (login, 2FA): 10 requests per minute */
  auth: { limit: 10, windowSeconds: 60 },
  /** Write operations (POST/PUT/DELETE): 30 requests per minute */
  write: { limit: 30, windowSeconds: 60 },
} as const;
