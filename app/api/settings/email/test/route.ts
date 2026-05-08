/**
 * POST /api/settings/email/test
 * Test SMTP credentials by sending a test email using the provided config.
 * Uses the form values directly — does NOT require saving first.
 * If smtp_pass is the masked placeholder, falls back to the stored DB password.
 */

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-middleware";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { smtp_host, smtp_port, smtp_user, smtp_from, smtp_secure, admin_email } = body;
    let smtp_pass = body.smtp_pass as string;

    if (!smtp_host || !smtp_user) {
      return NextResponse.json({ error: "SMTP host and username are required." }, { status: 400 });
    }
    if (!admin_email) {
      return NextResponse.json({ error: "Enter an admin notification email to receive the test." }, { status: 400 });
    }

    // If the password is the masked placeholder, load the real one from DB
    if (!smtp_pass || smtp_pass === "••••••••") {
      const row = await prisma.systemSettings.findUnique({ where: { key: "smtp_pass" } });
      smtp_pass = row?.value || "";
    }

    if (!smtp_pass) {
      return NextResponse.json({ error: "SMTP password is required." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port || "587", 10),
      secure: smtp_secure === "true",
      auth: { user: smtp_user, pass: smtp_pass },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: smtp_from || smtp_user,
      to: admin_email,
      subject: "CMS — SMTP test successful",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#15803d;margin-top:0;">SMTP connection verified ✓</h2>
        <p>Your CMS email settings are working correctly.</p>
        <p style="color:#6b7280;font-size:13px;">Host: <strong>${smtp_host}:${smtp_port || 587}</strong><br>From: <strong>${smtp_from || smtp_user}</strong></p>
      </div>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Test failed";
    console.error("[SMTP test error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
