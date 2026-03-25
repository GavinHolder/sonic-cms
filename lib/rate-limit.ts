/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window counter per IP address.
 * For single-instance deployments (no Redis needed).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  /** Max requests per window */
  max: number
  /** Window duration in seconds */
  windowSec: number
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  login:   { max: 5,   windowSec: 60 },   // 5 attempts per minute
  api:     { max: 100, windowSec: 60 },   // 100 requests per minute
  upload:  { max: 10,  windowSec: 60 },   // 10 uploads per minute
  otp:     { max: 3,   windowSec: 600 },  // 3 OTP sends per 10 minutes
}

/**
 * Check rate limit for a given key (e.g., IP address + route).
 * Returns { allowed: true } or { allowed: false, retryAfterSec }.
 */
export function checkRateLimit(
  identifier: string,
  configName: keyof typeof DEFAULTS = 'api'
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  // Disable rate limiting in test environment
  if (process.env.NODE_ENV === 'test') return { allowed: true }
  const config = DEFAULTS[configName] ?? DEFAULTS.api
  const key = `${configName}:${identifier}`
  const now = Date.now()

  const entry = store.get(key)
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 })
    return { allowed: true }
  }

  if (entry.count >= config.max) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  entry.count++
  return { allowed: true }
}

/**
 * Get IP address from request headers (handles proxies).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return '127.0.0.1'
}
