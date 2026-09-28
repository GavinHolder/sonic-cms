/**
 * POST /api/forms/submit
 * Forward verified form submission data to the admin notification email
 * or to a configured webhook URL. Also logs submissions to the database.
 */

import { NextResponse } from "next/server";
import { getEmailConfig, sendSubmissionEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { enforceFormRateLimit } from "@/lib/form-rate-limit";
import { resolveSubmissionRoute } from "@/lib/form-routing";
import { postWebhook } from "@/lib/safe-webhook";

export async function POST(req: Request) {
  // Per-IP spam limit — must run before any body parsing, DB write, webhook call or email send.
  const limited = enforceFormRateLimit(req, "forms-submit");
  if (limited) return limited;

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

    // A client-supplied emailTo/webhookUrl is only honoured when it exactly matches a value an
    // admin configured server-side (see lib/form-routing.ts) — this closes both the open-mail-relay
    // and the SSRF hole that letting visitors pick these values directly used to create. Anything
    // forged is silently ignored (never a 4xx) and falls back to the site admin email.
    const route = await resolveSubmissionRoute({ emailTo, webhookUrl, submitAction });

    if (route.action === "webhook-missing") {
      return NextResponse.json({ error: "No webhook URL configured" }, { status: 400 });
    }

    if (route.action === "webhook") {
      try {
        await postWebhook(route.webhookUrl, { fields, userEmail, source });
        status = "sent";
      } catch (webhookErr) {
        // Delivery failure OR the SSRF guard blocking a (misconfigured/rebound) target must never
        // make a real visitor's submission vanish — fall back to emailing the admin instead.
        console.warn("[Form submit] webhook delivery failed, falling back to email:", webhookErr);
        const cfg = await getEmailConfig();
        await sendSubmissionEmail(fields, userEmail, cfg, source || "Website");
        status = "sent";
      }
    } else {
      // Default: email action
      const cfg = await getEmailConfig();
      await sendSubmissionEmail(fields, userEmail, cfg, source || "Website", route.emailTo);
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
