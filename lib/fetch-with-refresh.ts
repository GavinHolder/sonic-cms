/**
 * fetchWithRefresh — fetch for admin WRITE calls that survives an expired session.
 *
 * The 8h `access_token` cookie can expire while an admin tab sits idle (background timers are
 * throttled — see components/admin/TokenRefresher.tsx). The write endpoints answer 401 in that
 * case. This wrapper:
 *   1. sends the request once;
 *   2. on 401, refreshes the session with POST /api/auth/refresh (single-flight: concurrent
 *      callers share ONE refresh request);
 *   3. if the refresh succeeded, retries the ORIGINAL request exactly once and returns that
 *      response; otherwise returns the original 401. It never loops.
 *
 * ASSUMPTIONS:
 * 1. Guarded write handlers check auth BEFORE reading the body or touching the database, so a 401
 *    means "nothing happened" and replaying the request cannot double-apply it.
 * 2. `init.body` can be sent twice (JSON strings here; FormData / Blob / URLSearchParams also work —
 *    a one-shot ReadableStream body does not). A `Request` input is cloned before its first use.
 * 3. Browser-only (same-origin cookies, module-level in-flight state) — call from event handlers
 *    and effects, never during SSR.
 *
 * FAILURE MODES:
 * - Refresh token expired / invalid -> refresh fails -> the ORIGINAL 401 is returned unchanged, so
 *   callers keep their existing `!res.ok` handling.
 * - Network error during the refresh -> treated as a failed refresh (original 401 returned).
 * - Network error on the first or the retried request -> rejects exactly like plain fetch.
 * - Same semantics as the inline retry in components/admin/MediaPickerModal.tsx (intentionally not
 *   refactored there; the two copies should be unified in a later change).
 */

let refreshInFlight: Promise<boolean> | null = null;

/** Refresh the session cookie once, however many callers ask at the same time. */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function fetchWithRefresh(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // A Request input's body can only be consumed once, so keep a clone for the (at most one) retry.
  // `init` is reused as-is: every caller here passes a JSON string body, which fetch can send twice.
  const retryInput = typeof Request !== "undefined" && input instanceof Request ? input.clone() : input;

  const first = await fetch(input, init);
  if (first.status !== 401) return first;

  if (!(await refreshSession())) return first;
  return fetch(retryInput, init);
}
