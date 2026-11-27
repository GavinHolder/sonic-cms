/**
 * Coverage lead ("Get connected" / "Notify me") field rules — the ONE place they live.
 * Client-safe (no server imports): app/coverage/CoveragePageClient.tsx uses it for inline
 * messages, app/api/coverage/lead/route.ts uses it as the authority.
 *
 * INVARIANTS:
 *   1. name, email and phone are always required, on every path (package, no-package, miss).
 *   2. A value containing CR, LF or NUL is never accepted for name/email/phone (the email
 *      lands in a Reply-To header and a mailto: link; Postgres JSON cannot store NUL).
 *   2b. The email is restricted to plain address characters — never ? & = < > " or spaces,
 *      so it cannot smuggle mailto: parameters (e.g. ?bcc=) into the admin's reply button.
 *   3. Inputs are never mutated; results are new objects.
 */

export type LeadField = "name" | "email" | "phone";
export type LeadFieldErrors = Partial<Record<LeadField, string>>;

/** Form order — decides which invalid field is reported/focused first. */
export const LEAD_FIELD_ORDER: readonly LeadField[] = ["name", "email", "phone"];

export const LEAD_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  phoneMin: 7,
  phoneMax: 30,
  addressMax: 300,
  addonMax: 20,
  idMax: 64,
} as const;

/** Shown whenever the request did not reach us (5xx, network failure). */
export const LEAD_NOT_RECEIVED_MESSAGE =
  "Sorry, your request was not received. Please try again, or phone us instead.";

/** Single plain address: no separators, whitespace, quotes or URL/mailto metacharacters. */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
/** Loose phone: digits, spaces, + - ( ) . / and an optional extension (x12, ext 12, ext. 12). */
const PHONE_RE = /^[0-9 +\-()./]+(?: ?(?:x|ext\.?) ?[0-9]{1,6})?$/i;
/** CR, LF, NUL or a Unicode line/paragraph separator (tested on the raw value: trim() would hide a trailing one). */
const CRLF_RE = /[\r\n\u0000\u2028\u2029]/;
const NUL_RE = /\u0000/;

export interface LeadContact {
  name: string;
  email: string;
  phone: string;
}

export type LeadContactResult =
  | { ok: true; value: LeadContact }
  | { ok: false; errors: LeadFieldErrors; firstInvalid: LeadField; message: string };

function nameError(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return "Enter your name.";
  if (CRLF_RE.test(raw)) return "Your name cannot contain line breaks.";
  const v = raw.trim();
  if (v.length < LEAD_LIMITS.nameMin) return `Your name must be at least ${LEAD_LIMITS.nameMin} characters.`;
  if (v.length > LEAD_LIMITS.nameMax) return `Your name must be ${LEAD_LIMITS.nameMax} characters or fewer.`;
  return null;
}

function emailError(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return "Enter your email address.";
  if (CRLF_RE.test(raw)) return "Enter a valid email address, like name@example.com.";
  const v = raw.trim();
  if (v.length > LEAD_LIMITS.emailMax || !EMAIL_RE.test(v)) return "Enter a valid email address, like name@example.com.";
  return null;
}

function phoneError(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return "Enter your phone number.";
  const invalid = "Enter a valid phone number, like 082 123 4567.";
  if (CRLF_RE.test(raw)) return invalid;
  const v = raw.trim();
  if (v.length < LEAD_LIMITS.phoneMin || v.length > LEAD_LIMITS.phoneMax || !PHONE_RE.test(v)) return invalid;
  // "(((((((" is 7 allowed characters but not a phone number.
  if (v.replace(/\D/g, "").length < LEAD_LIMITS.phoneMin) return invalid;
  return null;
}

/** Validate the three contact fields. Returns trimmed values, or a message per invalid field. */
export function validateLeadContact(input: { name: unknown; email: unknown; phone: unknown }): LeadContactResult {
  const found: Record<LeadField, string | null> = {
    name: nameError(input.name),
    email: emailError(input.email),
    phone: phoneError(input.phone),
  };
  const firstInvalid = LEAD_FIELD_ORDER.find((f) => found[f] !== null);
  if (!firstInvalid) {
    return {
      ok: true,
      value: {
        name: String(input.name).trim(),
        email: String(input.email).trim(),
        phone: String(input.phone).trim(),
      },
    };
  }
  const errors: LeadFieldErrors = Object.fromEntries(
    LEAD_FIELD_ORDER.filter((f) => found[f] !== null).map((f) => [f, found[f] as string])
  );
  return { ok: false, errors, firstInvalid, message: found[firstInvalid] as string };
}

export interface LeadPayload extends LeadContact {
  address: string;
  miss: boolean;
  networkId: string | null;
  packageId: string | null;
  addonIds: string[];
}

export type LeadPayloadResult =
  | { ok: true; value: LeadPayload }
  | { ok: false; error: string; field?: LeadField };

const INVALID_REQUEST = "Invalid request.";

/** undefined / null / "" = not supplied; otherwise must be a string of 1–idMax characters. */
function optionalId(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string" || raw.length > LEAD_LIMITS.idMax || NUL_RE.test(raw)) return { ok: false };
  return { ok: true, value: raw };
}

/**
 * Validate the whole POST body of /api/coverage/lead.
 *
 * ASSUMPTIONS:
 *   1. `body` is whatever JSON.parse produced — it may be any type.
 *   2. Whether the ids exist / are active / belong together is NOT checked here (needs the DB).
 *
 * FAILURE MODES:
 *   - Non-object body, wrong-typed or oversized parts -> { ok: false } with a plain message
 *     that never echoes the submitted value.
 */
export function validateLeadPayload(body: unknown): LeadPayloadResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, error: INVALID_REQUEST };
  const b = body as Record<string, unknown>;

  const contact = validateLeadContact({ name: b.name, email: b.email, phone: b.phone });
  if (!contact.ok) return { ok: false, error: contact.message, field: contact.firstInvalid };

  let address = "";
  if (b.address !== undefined && b.address !== null) {
    if (typeof b.address !== "string" || NUL_RE.test(b.address)) return { ok: false, error: INVALID_REQUEST };
    address = b.address.trim();
    if (address.length > LEAD_LIMITS.addressMax) {
      return { ok: false, error: `The address must be ${LEAD_LIMITS.addressMax} characters or fewer.` };
    }
  }

  const networkId = optionalId(b.networkId);
  const packageId = optionalId(b.packageId);
  if (!networkId.ok || !packageId.ok) return { ok: false, error: INVALID_REQUEST };

  let addonIds: string[] = [];
  if (b.addonIds !== undefined && b.addonIds !== null) {
    if (!Array.isArray(b.addonIds)) return { ok: false, error: INVALID_REQUEST };
    if (b.addonIds.length > LEAD_LIMITS.addonMax) {
      return { ok: false, error: `You can choose at most ${LEAD_LIMITS.addonMax} add-ons.` };
    }
    const allValid = b.addonIds.every((x) => typeof x === "string" && x.length > 0 && x.length <= LEAD_LIMITS.idMax && !NUL_RE.test(x));
    if (!allValid) return { ok: false, error: INVALID_REQUEST };
    addonIds = [...(b.addonIds as string[])];
  }

  return {
    ok: true,
    value: { ...contact.value, address, miss: b.miss === true, networkId: networkId.value, packageId: packageId.value, addonIds },
  };
}

/**
 * Message to show the visitor for a non-OK response from /api/coverage/lead.
 * 400 -> the server's own plain message; 429 -> wait time from Retry-After (seconds);
 * anything else -> the request was NOT received (server text is never shown for 5xx).
 */
export function describeLeadFailure(status: number, serverError: string | null, retryAfter: string | null): string {
  if (status === 429) {
    const seconds = retryAfter !== null && /^\d+$/.test(retryAfter.trim()) ? Number(retryAfter.trim()) : 0;
    if (seconds <= 0) return "Too many requests. Please try again in a few minutes.";
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Too many requests. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  if (status === 400 && serverError) return serverError;
  return LEAD_NOT_RECEIVED_MESSAGE;
}
