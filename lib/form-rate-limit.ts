/**
 * Per-visitor spam limit for the public form endpoints (stopgap until email-code verification).
 *
 * Usage (first statement of the handler, BEFORE parsing the body / touching the DB / sending mail):
 *   const limited = enforceFormRateLimit(req, 'contact')
 *   if (limited) return limited
 *
 * The limit itself (5 per 10 min) lives in lib/rate-limit.ts DEFAULTS.form. Counters are per
 * endpoint AND per client IP, in memory (single container; resets on restart).
 *
 * FAILURE MODES:
 *   - Client IP undeterminable (request did not come through the proxy) -> fail OPEN with a
 *     one-time warning; sharing one bucket would lock the form for every visitor instead.
 */

import { NextResponse } from 'next/server'
import { checkRateLimit, resolveClientIp } from '@/lib/rate-limit'
import { FORM_RATE_LIMITED_MESSAGE } from '@/lib/form-rate-limit-message'

export type FormEndpoint = 'forms-submit' | 'contact'

let warnedNoIp = false

/** Returns a 429 response when this visitor is over the limit for `endpoint`, otherwise null. */
export function enforceFormRateLimit(request: Request, endpoint: FormEndpoint): NextResponse | null {
  const ip = resolveClientIp(request)
  if (!ip) {
    if (!warnedNoIp) {
      warnedNoIp = true
      console.warn('[form-rate-limit] client IP unavailable (no valid X-Forwarded-For/X-Real-IP) - not limiting')
    }
    return null
  }
  const rl = checkRateLimit(`${endpoint}:${ip}`, 'form')
  if (rl.allowed) return null
  return NextResponse.json(
    { error: FORM_RATE_LIMITED_MESSAGE, code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
  )
}
