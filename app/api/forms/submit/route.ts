/**
 * POST /api/forms/submit
 * Forward verified form submission data to the admin notification email
 * or to a configured webhook URL. Also logs submissions to the database.
 */

import { NextResponse } from "next/server";
import { getEmailConfig, sendSubmissionEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { fields, userEmail, source, emailTo, submitAction, webhookUrl, pageId } = await req.json();

    if (!fields || !userEmail) {
      return NextResponse.json({ error: "Missing fields or userEmail" }, { status: 400 });
    }

    let status = "received";

    // Log submission to DB (best-effort — don't fail if DB insert fails)
    try {
      if (pageId || source) {
        const page = pageId
          ? await prisma.page.findUnique({ where: { id: pageId } })
          : await prisma.page.findUnique({ where: { slug: source ?? "" } });

        if (page) {
          await prisma.formSubmission.create({
            data: {
              pageId: page.id,
              pageSlug: page.slug,
              data: fields,
              userEmail: userEmail ?? "",
              status: "received",
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn("[Form submit] DB log failed (non-fatal):", dbErr);
    }

    if (submitAction === "webhook") {
      if (!webhookUrl) {
        return NextResponse.json({ error: "No webhook URL configured" }, { status: 400 });
      }
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, userEmail, source }),
      });
      if (!webhookRes.ok) {
        throw new Error(`Webhook responded with ${webhookRes.status}`);
      }
      status = "sent";
    } else {
      // Default: email action
      const cfg = await getEmailConfig();
      await sendSubmissionEmail(fields, userEmail, cfg, source || "Website", emailTo);
      status = "sent";
    }

    // Update status to "sent"
    try {
      if (pageId || source) {
        const page = pageId
          ? await prisma.page.findUnique({ where: { id: pageId } })
          : await prisma.page.findUnique({ where: { slug: source ?? "" } });

        if (page) {
          await prisma.formSubmission.updateMany({
            where: { pageId: page.id, userEmail: userEmail, status: "received" },
            data: { status },
          });
        }
      }
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send submission";
    console.error("[Form submit error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
