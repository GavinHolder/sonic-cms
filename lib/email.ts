/**
 * Email utility — nodemailer wrapper for OTP sending and form submission notifications.
 * Reads SMTP configuration from the system_settings database table.
 */

import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import { getBrandTokens, type BrandTokens } from '@/lib/brand-tokens'
import { getEmailSettings, type EmailSettings } from '@/lib/email-settings'

interface SiteInfo {
  companyName: string
  logoUrl: string
  copyrightText: string
}

export function buildSubmissionEmailHtml(
  fields: Array<{ label: string; value: string }>,
  userEmail: string,
  source: string,
  tokens: BrandTokens,
  settings: EmailSettings,
  site: SiteInfo
): string {
  const { primary, surface, text, textMuted } = tokens.colors
  const { showLogo, showCompanyName, headerTagline, footerText } = settings
  const { companyName, logoUrl, copyrightText } = site

  const logoHtml =
    showLogo && logoUrl
      ? `<img src="${logoUrl}" alt="${companyName}" style="max-width:120px;max-height:48px;display:block;margin:0 auto 10px;">`
      : ''

  const nameHtml = showCompanyName
    ? `<div style="color:#ffffff;font-size:16px;font-weight:600;${headerTagline ? 'margin-bottom:4px;' : ''}">${companyName}</div>`
    : ''

  const taglineHtml = headerTagline
    ? `<div style="color:#94a3b8;font-size:12px;">${headerTagline}</div>`
    : ''

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const fieldRows = fields
    .map(
      (f) => `<tr>
        <td style="padding-bottom:12px;vertical-align:top;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:${textMuted};margin-bottom:2px;">${f.label}</div>
          <div style="font-size:14px;color:${text};font-weight:500;">${f.value}</div>
        </td>
      </tr>`
    )
    .join('')

  const copyright = copyrightText || `© ${companyName}`

  const footerHtml = footerText
    ? `<div style="font-size:12px;color:${textMuted};text-align:center;padding:14px 0 4px;">${footerText}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
  <table cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="background:#0f172a;padding:28px 32px;text-align:center;border-radius:8px 8px 0 0;">
        ${logoHtml}
        ${nameHtml}
        ${taglineHtml}
      </td>
    </tr>
    <tr>
      <td style="background:${surface};padding:24px 28px;border-radius:0 0 8px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;">
          <tr>
            <td style="padding:20px 24px;">
              <div style="font-size:18px;font-weight:700;color:${text};margin-bottom:4px;">New Website Enquiry</div>
              <div style="font-size:11px;color:${textMuted};margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">Form: ${source} · ${dateStr}</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${fieldRows}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="mailto:${userEmail}" style="display:inline-block;background:${primary};color:#ffffff;padding:10px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Reply to Enquirer</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        ${footerHtml}
        <div style="font-size:11px;color:#94a3b8;text-align:center;padding-top:8px;">${copyright}</div>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`
}

export function buildOtpEmailHtml(
  otp: string,
  tokens: BrandTokens,
  settings: EmailSettings,
  site: SiteInfo
): string {
  const { primary, surface, text, textMuted } = tokens.colors
  const { showLogo, showCompanyName } = settings
  const { companyName, logoUrl, copyrightText } = site

  const logoHtml =
    showLogo && logoUrl
      ? `<img src="${logoUrl}" alt="${companyName}" style="max-width:120px;max-height:48px;display:block;margin:0 auto 10px;">`
      : ''

  const nameHtml = showCompanyName
    ? `<div style="color:#ffffff;font-size:16px;font-weight:600;">${companyName}</div>`
    : ''

  const copyright = copyrightText || `© ${companyName}`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
  <table cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="background:#0f172a;padding:28px 32px;text-align:center;border-radius:8px 8px 0 0;">
        ${logoHtml}
        ${nameHtml}
        <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Verify your email</div>
      </td>
    </tr>
    <tr>
      <td style="background:${surface};padding:24px 28px;border-radius:0 0 8px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;">
          <tr>
            <td style="padding:28px 24px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:${text};margin-bottom:8px;">Verify Your Email</div>
              <div style="font-size:13px;color:${textMuted};margin-bottom:20px;">Use this code to complete your submission to ${companyName}:</div>
              <div style="display:inline-block;background:#f8fafc;border:2px solid ${primary};border-radius:8px;padding:16px 32px;margin-bottom:16px;">
                <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:${text};font-family:'Courier New',Courier,monospace;">${otp}</span>
              </div>
              <div style="font-size:12px;color:${textMuted};margin-top:4px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</div>
            </td>
          </tr>
        </table>
        <div style="font-size:11px;color:#94a3b8;text-align:center;padding-top:12px;">${copyright}</div>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`
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
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: cfg.smtp_from || cfg.smtp_user,
    to: toEmail,
    subject: "Your verification code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#1e40af;margin-top:0">Verify your email</h2>
        <p style="color:#374151">Use this code to complete your submission:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e40af;padding:16px;background:#eff6ff;border-radius:8px;text-align:center;margin:16px 0">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:14px;margin-bottom:0">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
    `,
  });
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
  const recipient = emailTo || cfg.admin_email;
  if (!recipient) return; // No destination configured — skip silently
  const transporter = await createTransporter();
  const rows = fields
    .map(
      (f) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;white-space:nowrap">${f.label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827">${f.value}</td>
        </tr>`
    )
    .join("");

  await transporter.sendMail({
    from: cfg.smtp_from || cfg.smtp_user,
    to: recipient,
    replyTo: userEmail,
    subject: `New enquiry from ${userEmail} — ${source}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#1e40af;margin-top:0">New Website Enquiry</h2>
        <p style="color:#6b7280;margin-top:0">Source: <strong style="color:#374151">${source}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          ${rows}
        </table>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px">
          Reply directly to this email to respond to ${userEmail}
        </p>
      </div>
    `,
  });
}
