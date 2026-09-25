/**
 * Client-safe pieces of the public-form rate limit (no server imports), shared by the
 * server guard (lib/form-rate-limit.ts) and the front-end forms that post to
 * /api/forms/submit and /api/contact.
 */

export const FORM_RATE_LIMITED_MESSAGE = 'Too many submissions. Please try again in a few minutes.'

/** Message to show for a 429 response: the server's own text when readable, else the default. */
export async function readRateLimitMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body?.error === 'string' && body.error) return body.error
  } catch {
    /* non-JSON body — fall through */
  }
  return FORM_RATE_LIMITED_MESSAGE
}
