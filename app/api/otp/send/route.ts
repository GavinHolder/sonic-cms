/**
 * POST /api/otp/send
 * Generate a 6-digit OTP, store it in the database, and send it to the user's email.
 * Rate-limited to 3 requests per email+purpose per 10 minutes, AND to 5 requests per
 * client IP per 10 minutes (see SECURITY note below).
 *
 * SECURITY (2026-09-28 review): the per-email+purpose throttle alone is bypassable by an
 * attacker who varies `purpose` on every request, and `email` was previously passed to
 * nodemailer unsanitized/unvalidated — a comma-separated address list lets nodemailer fan
 * a single request out to many recipients, burning SMTP quota. This endpoint is public and
 * live (wired into VerificationModal / OtpVerificationModal / public/cms-forms.js), so it
 * now also enforces a per-IP rate limit (independent bucket, does not touch the existing
 * per-email+purpose DB throttle) and validates both `email` (single address, no separators)
 * and `purpose` (fixed allowlist of the values the shipped client code actually sends).
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEmailConfig, sendOtpEmail } from "@/lib/email";
import { enforceFormRateLimit } from "@/lib/form-rate-limit";

/** Single syntactically-valid address, no separators/newlines (header-injection + multi-recipient guard) — same shape as app/api/contact/route.ts's EMAIL_RE. */
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** The exact purpose values the shipped client code sends: components/sections/CTAFooter.tsx
 *  ("cta-form"), app/[slug]/PageClient.tsx + public/cms-forms.js ("form-page"), and
 *  components/VerificationModal.tsx's own default ("verification"). `purpose` only scopes the
 *  per-email throttle, but an unrestricted value lets a caller dodge it by varying it per request. */
const ALLOWED_PURPOSES = new Set(["cta-form", "form-page", "verification"]);

export async function POST(req: Request) {
  // Per-IP spam limit — independent of the per-email+purpose throttle below; must run first.
  const limited = enforceFormRateLimit(req, "otp-send");
  if (limited) return limited;

  try {
    const { email, purpose } = await req.json();

    if (!email || !purpose) {
      return NextResponse.json({ error: "Missing email or purpose" }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (typeof purpose !== "string" || !ALLOWED_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }
    const normalizedEmail = email.trim();

    // Clean up expired tokens
    await prisma.otpToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    // Rate limit: max 3 OTPs per email+purpose in the last 10 minutes
    const recentCount = await prisma.otpToken.count({
      where: {
        email: normalizedEmail,
        purpose,
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recentCount >= 3) {
      return NextResponse.json(
        { error: "Too many requests. Try again in 10 minutes." },
        { status: 429 }
      );
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpToken.create({ data: { email: normalizedEmail, code, purpose, expiresAt } });

    const cfg = await getEmailConfig();
    await sendOtpEmail(normalizedEmail, code, cfg);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[OTP send error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
