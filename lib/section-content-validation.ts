/**
 * Top-level `content` / `contentDraft` of a Section must be a plain JSON object.
 * (designerData etc. may legitimately be JSON-encoded strings INSIDE the object.)
 *
 * ASSUMPTIONS: callers pass the raw request-body value; `undefined` means "field not sent".
 * FAILURE MODES: a JSON.stringify'd content string stored as-is made the renderer show an empty section.
 */
export const INVALID_CONTENT_MESSAGE =
  'content must be a JSON object, not a string/array. Send an object, not JSON.stringify(...) - if you hold a string, JSON.parse it first.';

export function isPlainJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Returns an error message, or null when valid. `content` may be absent; `contentDraft` may also be null. */
export function validateSectionContentFields(body: {
  content?: unknown;
  contentDraft?: unknown;
}): string | null {
  if (body.content !== undefined && !isPlainJsonObject(body.content)) return INVALID_CONTENT_MESSAGE;
  if (body.contentDraft !== undefined && body.contentDraft !== null && !isPlainJsonObject(body.contentDraft)) {
    return INVALID_CONTENT_MESSAGE.replace('content must', 'contentDraft must');
  }
  return null;
}
