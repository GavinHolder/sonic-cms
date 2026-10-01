/**
 * Email utility — nodemailer wrapper for OTP sending and form submission notifications.
 * Reads SMTP configuration from the system_settings database table.
 */

import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import { getBrandTokens, type BrandTokens } from '@/lib/brand-tokens'
import { getEmailSettings, type EmailSettings } from '@/lib/email-settings'
import { renderEmailLayout, buildEmailTheme, kvRows, otpBox, paragraph, mutedNote, bulletList } from '@/lib/email/layout'
import { resolveEmailLogo } from '@/lib/email/assets'

interface SiteInfo {
  companyName: string
  logoUrl: string
  copyrightText: string
}

const EMAIL_ADDR_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Pull the bare address out of an RFC-5322 "Display Name <addr>" wrapper, or return the
 *  trimmed input unchanged when there is no `<...>` wrapper. */
export function extractAddress(part: string): string {
  const m = /<([^<>]+)>/.exec(part)
  return (m ? m[1] : part).trim()
}

/**
 * Strip CR/LF (SMTP/MIME header injection) and require a syntactically plausible SINGLE
 * email address — accepts an optional "Display Name <addr>" wrapper. Returns '' for anything
 * that fails. Used for visitor-supplied addresses (e.g. Reply-To) where multiple recipients
 * are never legitimate.
 */
export function sanitizeRecipient(value: unknown): string {
  if (typeof value !== 'string') return ''
  const addr = extractAddress(value.replace(/[\r\n]/g, ''))
  return EMAIL_ADDR_RE.test(addr) ? addr : ''
}

/**
 * Like sanitizeRecipient, but for admin-configured recipients: accepts a comma- OR
 * semicolon-separated list (each entry optionally wrapped in "Display Name <addr>", e.g.
 * "Ops <ops@x.com>; boss@y.com" — nodemailer/most mail clients accept either separator raw).
 * Invalid entries are dropped (and logged) rather than failing the whole list. Returns '' only
 * when nothing valid remains — callers must treat that as "no usable recipient" and log loudly
 * rather than silently dropping the notification (see lib/email.ts's sendSubmissionEmail).
 */
export function sanitizeRecipientList(value: unknown): string {
  if (typeof value !== 'string') return ''
  const valid: string[] = []
  for (const part of value.replace(/[\r\n]/g, '').split(/[,;]/)) {
    const addr = extractAddress(part)
    if (!addr) continue
    if (EMAIL_ADDR_RE.test(addr)) valid.push(addr)
    else console.warn(`[email] dropping invalid recipient in configured list: ${addr.slice(0, 80)}`)
  }
  return valid.join(', ')
}

/** Theme + header options shared by every email, driven by EmailSettings. */
function chrome(settings: EmailSettings, site: SiteInfo, logoSrc?: string) {
  return {
    theme: buildEmailTheme({ brand: settings.brandColor, headerBg: settings.headerBg, pageBg: settings.pageBg }),
    companyName: site.companyName,
    logoSrc,
    showLogo: settings.showLogo,
    showCompanyName: settings.showCompanyName,
    copyrightText: site.copyrightText || `© ${site.companyName}`,
  }
}

/** Inline (cid) logo attachment list; empty when the logo is hidden or the file is unavailable. */
export function logoAttachments(logo: ReturnType<typeof resolveEmailLogo>, settings: EmailSettings) {
  return settings.showLogo && logo.attachment ? [logo.attachment] : []
}

/** Absolute logo URL for previews (cid: does not render outside a mail client). */
export function previewLogoSrc(): string {
  return resolveEmailLogo().url
}

export function buildSubmissionEmailHtml(
  fields: Array<{ label: string; value: string }>,
  userEmail: string,
  source: string,
  _tokens: BrandTokens,
  settings: EmailSettings,
  site: SiteInfo,
  logoSrc: string = previewLogoSrc()
): string {
  const c = chrome(settings, site, logoSrc)
  const dateStr = new Date().toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  return renderEmailLayout({
    ...c,
    title: 'New Website Enquiry',
    preheader: `New enquiry from ${source}`,
    tagline: settings.headerTagline,
    footerText: settings.footerText,
    bodyHtml:
      paragraph(`Form: ${source} · ${dateStr}`, c.theme) + kvRows(fields, c.theme),
    cta: { label: 'Reply to Enquirer', href: `mailto:${userEmail}` },
  })
}

export function buildOtpEmailHtml(
  otp: string,
  _tokens: BrandTokens,
  settings: EmailSettings,
  site: SiteInfo,
  logoSrc: string = previewLogoSrc()
): string {
  const c = chrome(settings, site, logoSrc)
  return renderEmailLayout({
    ...c,
    title: 'Verify Your Email',
    preheader: `Your verification code for ${site.companyName}`,
    bodyHtml:
      paragraph(`Use this code to complete your submission to ${site.companyName}:`, c.theme) +
      otpBox(otp, c.theme) +
      mutedNote('This code expires in 10 minutes. Do not share it with anyone.', c.theme),
  })
}

/** Fetch all email-related settings from system_settings table as a key-value map */
export async function getEmailConfig(): Promise<Record<string, string>> {
  const rows = await prisma.systemSettings.findMany({
    where: {
      key: {
        in: [
          "smtp_host",
          "smtp_port",
          "smtp_user",
          "smtp_pass",
          "smtp_from",
          "smtp_secure",
          "admin_email",
          "seo_alert_email",
        ],
      },
    },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Create a nodemailer transporter from stored SMTP config */
export async function createTransporter() {
  const cfg = await getEmailConfig();
  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
    throw new Error(
      "Email not configured. Set SMTP settings in Admin → Settings → Email."
    );
  }
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port || "587", 10),
    secure: cfg.smtp_secure === "true",
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
}

/**
 * Send a 6-digit OTP verification email to the user.
 * Called when a user submits a CTA form or form page — before the submission is processed.
 */
export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  cfg: Record<string, string>
) {
  const [tokens, emailSettings, siteRow] = await Promise.all([
    getBrandTokens(),
    getEmailSettings(),
    prisma.siteConfig.findFirst(),
  ])
  const site: SiteInfo = {
    companyName: siteRow?.companyName ?? 'Your Company',
    logoUrl: siteRow?.logoUrl ?? '',
    copyrightText: siteRow?.copyrightText ?? '',
  }
  const transporter = await createTransporter()
  const logo = resolveEmailLogo()
  await transporter.sendMail({
    from: cfg.smtp_from || cfg.smtp_user,
    to: toEmail,
    subject: `Verify your email — ${site.companyName}`,
    html: buildOtpEmailHtml(otp, tokens, emailSettings, site, logo.src),
    attachments: logoAttachments(logo, emailSettings),
  })
}

/**
 * Send a form submission notification email to the admin.
 * Called after OTP verification succeeds — forwards the submitted form data.
 */
export async function sendSubmissionEmail(
  fields: Array<{ label: string; value: string }>,
  userEmail: string,
  cfg: Record<string, string>,
  source: string,
  emailTo?: string
) {
  const recipient = sanitizeRecipientList(emailTo) || sanitizeRecipientList(cfg.admin_email)
  if (!recipient) {
    // Never fail silently: a submission that "succeeds" but notifies no one is a landmine for
    // the next time emailTo/admin_email gets misconfigured (e.g. edited to something sanitizeRecipientList rejects).
    console.error(
      `[email] sendSubmissionEmail: no usable recipient after sanitization — notification for "${source}" NOT sent`,
      { emailToRaw: typeof emailTo === 'string' ? emailTo.slice(0, 120) : emailTo, adminEmailRaw: cfg.admin_email?.slice(0, 120) }
    )
    return
  }

  const [tokens, emailSettings, siteRow] = await Promise.all([
    getBrandTokens(),
    getEmailSettings(),
    prisma.siteConfig.findFirst(),
  ])
  const site: SiteInfo = {
    companyName: siteRow?.companyName ?? 'Your Company',
    logoUrl: siteRow?.logoUrl ?? '',
    copyrightText: siteRow?.copyrightText ?? '',
  }
  const transporter = await createTransporter()
  const logo = resolveEmailLogo()
  await transporter.sendMail({
    from: cfg.smtp_from || cfg.smtp_user,
    to: recipient,
    replyTo: sanitizeRecipient(userEmail) || undefined,
    subject: `${emailSettings.subjectPrefix} ${source}`.replace(/[\r\n]+/g, ' '),
    html: buildSubmissionEmailHtml(fields, userEmail, source, tokens, emailSettings, site, logo.src),
    attachments: logoAttachments(logo, emailSettings),
  })
}

/**
 * Send an SEO regression alert email.
 * Recipient is `seo_alert_email` (Settings → Email → SEO Alert Email), falling
 * back to `admin_email` when blank.
 * Called by the SEO engine when a scheduled audit detects a meaningful drop
 * (score worsening, fewer indexed pages, or more pages with issues).
 * Self-contained — does not throw if SMTP/recipient email is unconfigured (returns).
 */
export async function sendSeoAlertEmail(
  subject: string,
  reasons: string[]
): Promise<void> {
  const cfg = await getEmailConfig()
  const recipient = (cfg.seo_alert_email || "").trim() || cfg.admin_email
  if (!recipient || reasons.length === 0) return

  const [siteRow, emailSettings] = await Promise.all([prisma.siteConfig.findFirst(), getEmailSettings()])
  const companyName = siteRow?.companyName ?? 'Your site'
  const site: SiteInfo = {
    companyName,
    logoUrl: siteRow?.logoUrl ?? '',
    copyrightText: siteRow?.copyrightText ?? '',
  }
  const logo = resolveEmailLogo()
  const c = chrome(emailSettings, site, logo.src)
  const html = renderEmailLayout({
    ...c,
    title: `SEO Alert — ${companyName}`,
    preheader: 'Your scheduled SEO audit flagged a regression',
    bodyHtml:
      paragraph('Your scheduled SEO audit flagged a regression:', c.theme) +
      bulletList(reasons, c.theme) +
      mutedNote('Review details in Admin → Content → SEO → Score.', c.theme),
  })

  const transporter = await createTransporter()
  await transporter.sendMail({
    from: cfg.smtp_from || cfg.smtp_user,
    to: recipient,
    subject: `[SEO] ${subject} — ${companyName}`,
    html,
    attachments: logoAttachments(logo, emailSettings),
  })
}
