/**
 * Shared email layout (ONE system for OTP, enquiry, quote request, SEO alert, SMTP test).
 *
 * ASSUMPTIONS:
 * 1. Output must survive Outlook (Word engine) + forced dark-mode inversion: table layout,
 *    explicit width attr, bgcolor ATTRIBUTE and inline colour on every <td>, no reliance on
 *    CSS shorthand backgrounds / border-radius for correctness.
 * 2. bodyHtml is trusted markup produced by the helpers below (which escape every value).
 *    Callers must never interpolate raw user input into bodyHtml.
 * 3. Theme colours are admin-editable, so they are validated as hex before reaching markup.
 * FAILURE MODES:
 * - Invalid colour in settings -> falls back to the Sonic default (no markup injection).
 * - Logo blocked -> alt text is styled and the cid attachment normally covers it.
 */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface EmailTheme {
  brand: string // primary / CTA / accents
  headerBg: string
  pageBg: string
  cardBg: string
  text: string
  muted: string
  line: string
  buttonText: string
}

export const DEFAULT_EMAIL_THEME: EmailTheme = {
  brand: '#e31e24',
  headerBg: '#ffffff',
  pageBg: '#eef0f3',
  cardBg: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  buttonText: '#ffffff',
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_RE.test(value.trim()) ? value.trim() : fallback
}

export function buildEmailTheme(overrides?: Partial<Record<keyof EmailTheme, unknown>>): EmailTheme {
  const o = overrides ?? {}
  const t = { ...DEFAULT_EMAIL_THEME }
  for (const k of Object.keys(t) as Array<keyof EmailTheme>) {
    t[k] = safeColor(o[k], DEFAULT_EMAIL_THEME[k])
  }
  return t
}

/** Only mailto:/http(s): hrefs are allowed in buttons. */
function safeHref(href: string): string {
  const h = String(href ?? '').replace(/[\r\n\s]+/g, '')
  return /^(mailto:|https?:\/\/)/i.test(h) ? escapeHtml(h) : '#'
}

const FONT = 'Arial,Helvetica,sans-serif'

export function bulletproofButton(label: string, href: string, t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 0"><tr><td align="center" bgcolor="${t.brand}" style="background-color:${t.brand};padding:0;border-radius:6px"><a href="${safeHref(href)}" target="_blank" style="display:inline-block;padding:12px 30px;font-family:${FONT};font-size:14px;font-weight:bold;color:${t.buttonText};text-decoration:none;background-color:${t.brand}"><font color="${t.buttonText}" style="color:${t.buttonText}">${escapeHtml(label)}</font></a></td></tr></table>`
}

export function otpBox(code: string, t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-keep" align="center" bgcolor="#f3f4f6" style="background-color:#f3f4f6;border:2px solid ${t.brand};padding:14px 30px;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827"><font color="#111827" style="color:#111827">${escapeHtml(code)}</font></td></tr></table>`
}

export function kvRows(fields: Array<{ label: string; value: string }>, t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  const rows = fields
    .map(
      (f) =>
        `<tr><td class="em-card" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:0 0 12px;font-family:${FONT}"><div class="em-m" style="font-size:10px;letter-spacing:0.6px;text-transform:uppercase;color:${t.muted}">${escapeHtml(f.label)}</div><div style="font-size:14px;color:${t.text}">${escapeHtml(f.value)}</div></td></tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`
}

/** Left label / right value rows (calculator estimates). Values are escaped. */
export function dataTable(rows: Array<{ label: string; value: string }>, t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  const body = rows
    .map(
      (r) =>
        `<tr><td class="em-card em-m" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:6px 0;border-bottom:1px solid ${t.line};font-family:${FONT};font-size:14px;color:${t.muted}">${escapeHtml(r.label)}</td><td class="em-card" bgcolor="${t.cardBg}" align="right" style="background-color:${t.cardBg};padding:6px 0;border-bottom:1px solid ${t.line};font-family:${FONT};font-size:14px;font-weight:bold;color:${t.text}">${escapeHtml(r.value)}</td></tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>`
}

export function sectionHeading(label: string, t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-card em-b" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:18px 0 8px;font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${t.brand};font-weight:bold">${escapeHtml(label)}</td></tr></table>`
}

export function paragraph(text: string, t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-card" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:0 0 12px;font-family:${FONT};font-size:14px;line-height:20px;color:${t.text}">${escapeHtml(text)}</td></tr></table>`
}

export function mutedNote(text: string, t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-card em-m" bgcolor="${t.cardBg}" align="center" style="background-color:${t.cardBg};padding:14px 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${t.muted}">${escapeHtml(text)}</td></tr></table>`
}

export function bulletList(items: string[], t: EmailTheme = DEFAULT_EMAIL_THEME): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td class="em-card em-b" bgcolor="${t.cardBg}" valign="top" width="16" style="background-color:${t.cardBg};padding:4px 0;font-family:${FONT};font-size:14px;color:${t.brand}">&bull;</td><td class="em-card" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:4px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${t.text}">${escapeHtml(i)}</td></tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`
}

export interface EmailLayoutInput {
  title: string
  preheader?: string
  bodyHtml: string
  cta?: { label: string; href: string }
  theme?: EmailTheme
  /** Header: when logoSrc is set (and showLogo) the logo image is shown, else a text wordmark. */
  companyName?: string
  logoSrc?: string
  showLogo?: boolean
  showCompanyName?: boolean
  tagline?: string
  footerText?: string
  copyrightText?: string
}

export function renderEmailLayout(input: EmailLayoutInput): string {
  const t = input.theme ?? DEFAULT_EMAIL_THEME
  const name = input.companyName || 'SONIC'
  const showLogo = input.showLogo !== false
  const showName = input.showCompanyName !== false

  const logo =
    showLogo && input.logoSrc
      ? `<img src="${escapeHtml(input.logoSrc)}" width="160" alt="${escapeHtml(name)}" border="0" style="display:block;margin:0 auto;width:160px;max-width:160px;height:auto;font-family:${FONT};font-size:26px;font-weight:bold;letter-spacing:3px;color:#111827">`
      : showName
        ? `<span style="font-family:${FONT};font-size:26px;font-weight:bold;letter-spacing:3px;color:#111827"><font color="#111827">${escapeHtml(name.toUpperCase())}</font></span>`
        : ''
  const tagline = input.tagline
    ? `<div style="font-family:${FONT};font-size:12px;color:${t.muted};margin-top:8px">${escapeHtml(input.tagline)}</div>`
    : ''
  const pre = input.preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:${t.pageBg}">${escapeHtml(input.preheader)}</div>`
    : ''
  const cta = input.cta ? bulletproofButton(input.cta.label, input.cta.href, t) : ''
  const footerLines = [input.footerText, input.copyrightText]
    .filter((x): x is string => !!x)
    .map((x) => `<div style="margin:0 0 4px">${escapeHtml(x)}</div>`)
    .join('')

  // Dark-mode overrides for clients honouring prefers-color-scheme (Apple Mail, Gmail app);
  // inline colours remain authoritative everywhere else.
  const darkCss =
    '@media (prefers-color-scheme: dark){.em-page{background-color:#0b0c10!important}.em-card{background-color:#1c1f26!important}.em-hdr{background-color:#1c1f26!important}' +
    '.em-hdr span,.em-hdr font{color:#f3f4f6!important}.em-card,.em-card *{color:#f3f4f6!important}.em-m,.em-m *{color:#9ca3af!important}' +
    `.em-b,.em-b *{color:${t.brand}!important}.em-keep,.em-keep *{color:#111827!important}}`

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escapeHtml(input.title)}</title><style>${darkCss}</style></head>
<body class="em-page" bgcolor="${t.pageBg}" style="margin:0;padding:0;background-color:${t.pageBg}">${pre}
<table role="presentation" class="em-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.pageBg}" style="background-color:${t.pageBg}"><tr><td class="em-page" align="center" bgcolor="${t.pageBg}" style="background-color:${t.pageBg};padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;font-family:${FONT}">
<tr><td class="em-hdr" align="center" bgcolor="${t.headerBg}" style="background-color:${t.headerBg};padding:26px 24px;border-top:4px solid ${t.brand};font-family:${FONT}">${logo}${tagline}</td></tr>
<tr><td class="em-card" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:28px 28px 8px;font-family:${FONT};color:${t.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-card" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:0 0 14px;font-family:${FONT};font-size:20px;font-weight:bold;color:${t.text}">${escapeHtml(input.title)}</td></tr></table>
${input.bodyHtml}${cta}
</td></tr>
<tr><td class="em-card" bgcolor="${t.cardBg}" style="background-color:${t.cardBg};padding:20px 28px 24px;font-family:${FONT}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-card em-m" bgcolor="${t.cardBg}" align="center" style="background-color:${t.cardBg};border-top:1px solid ${t.line};padding:14px 0 0;font-family:${FONT};font-size:11px;line-height:16px;color:${t.muted}">${footerLines}</td></tr></table>
</td></tr>
</table></td></tr></table></body></html>`
}
