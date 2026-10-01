/**
 * Email asset resolution (logo).
 *
 * ASSUMPTIONS:
 * 1. Mail clients cannot reach localhost or relative paths, so the logo URL must be an absolute
 *    public https URL. NEXT_PUBLIC_* values are build-time/dev values (often http://localhost:3000)
 *    and are deliberately never used here.
 * 2. Outlook desktop does not render webp, so the logo is a bundled PNG (public/images/email/sonic-logo.png,
 *    derived from public/images/sonic-logo.png - the coloured, transparent-background brand logo).
 * FAILURE MODES:
 * - Remote images blocked (Outlook default) -> the same PNG is also attached inline via cid.
 * - Local file missing in the runtime image -> attachment omitted, remote URL still used.
 */
import fs from 'fs'
import path from 'path'

export const DEFAULT_EMAIL_BASE_URL = 'https://www.sonic.co.za'
export const EMAIL_LOGO_PATH = '/images/email/sonic-logo.png'
export const EMAIL_LOGO_CID = 'sonic-logo@email'

const LOCAL_HOST_RE = /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?)/i

/** Canonical public base URL for absolute links in emails. Never localhost, never NEXT_PUBLIC_*. */
export function resolveEmailBaseUrl(): string {
  for (const candidate of [process.env.EMAIL_BASE_URL, process.env.SITE_URL, process.env.PUBLIC_SITE_URL]) {
    const v = (candidate ?? '').trim().replace(/\/+$/, '')
    if (!v) continue
    try {
      const u = new URL(v)
      if (u.protocol === 'https:' && !LOCAL_HOST_RE.test(u.hostname)) return u.origin
    } catch {
      /* try next */
    }
  }
  return DEFAULT_EMAIL_BASE_URL
}

export interface EmailLogo {
  /** Absolute https URL (fallback when no cid attachment is attached). */
  url: string
  cid: string
  /** nodemailer attachment, or null when the local file is unavailable. */
  attachment: { filename: string; path: string; cid: string; contentType: string } | null
  /** What to put in <img src>: cid when attached, else the absolute URL. */
  src: string
}

export function resolveEmailLogo(): EmailLogo {
  const url = resolveEmailBaseUrl() + EMAIL_LOGO_PATH
  const file = path.join(process.cwd(), 'public', EMAIL_LOGO_PATH)
  let attachment: EmailLogo['attachment'] = null
  try {
    if (fs.existsSync(file)) {
      attachment = { filename: 'sonic-logo.png', path: file, cid: EMAIL_LOGO_CID, contentType: 'image/png' }
    }
  } catch {
    attachment = null
  }
  return { url, cid: EMAIL_LOGO_CID, attachment, src: attachment ? `cid:${EMAIL_LOGO_CID}` : url }
}
