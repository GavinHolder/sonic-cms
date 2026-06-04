/**
 * POST /api/contact
 *
 * Lead-capture endpoint for the FlexibleSectionRenderer `contact-form` block.
 * Accepts arbitrary form fields, emails the submission to the configured admin
 * recipient, and best-effort logs it to the FormSubmission table against the
 * page the form lives on.
 *
 * Resilient by design: email/DB failures are swallowed so the visitor still
 * sees the success state (a lost notification is worse UX than a failed form),
 * but a missing/invalid email returns 400 so the form can prompt for it.
 *
 * ASSUMPTIONS:
 *   1. The request body is a flat object of field values plus optional `pageSlug`.
 *   2. `email` is the visitor's reply-to address (required, valid single address).
 *   3. SMTP may or may not be configured — sendSubmissionEmail no-ops without a recipient.
 *
 * SECURITY: The notification recipient is resolved SERVER-SIDE from the page's
 * contact-form block config (with admin_email fallback). A client-supplied
 * `emailTo` is ignored — honoring it would let anyone use this endpoint as an
 * open mail relay. `pageSlug` is only used as a DB lookup key; the recipient
 * always comes from admin-configured block props stored in the database.
 */

import { NextResponse } from "next/server";
import { getEmailConfig, sendSubmissionEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/** Convert a snake/camel field key into a human label, e.g. "preferred_date" → "Preferred Date". */
function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Single syntactically-valid address, no separators/newlines (header-injection guard). */
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/**
 * Resolve the notification recipient from the page's contact-form block config
 * (FLEXIBLE sections → designerData.blocks[type=contact-form].props.emailTo).
 * Returns undefined when unset/invalid → sendSubmissionEmail falls back to admin_email.
 */
async function resolveRecipient(pageId: string): Promise<string | undefined> {
  const sections = await prisma.section.findMany({
    where: { pageId, type: "FLEXIBLE", enabled: true },
    select: { content: true },
  });
  for (const s of sections) {
    const blocks = (s.content as { designerData?: { blocks?: Array<{ type?: string; props?: Record<string, unknown> }> } })
      ?.designerData?.blocks;
    for (const b of blocks || []) {
      if (b?.type === "contact-form") {
        const to = String(b.props?.emailTo || "").trim();
        if (EMAIL_RE.test(to)) return to;
      }
    }
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    // Strip routing keys from the emailed/logged field set. `emailTo` is NEVER
    // honored from the client (open-relay guard) — see resolveRecipient.
    const { emailTo: _ignored, pageSlug, source, ...values } = body;

    const email = String(values.email || "").trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Build a label/value list from all non-empty submitted fields.
    const fields = Object.entries(values)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
      .map(([k, v]) => ({ label: humanize(k), value: String(v) }));

    // Resolve the page the form belongs to: the submitted slug if it matches a
    // real page, otherwise the landing page. Used for both the submission log
    // and the server-side recipient lookup.
    let page: { id: string; slug: string } | null = null;
    try {
      const slug = String(pageSlug || "").trim();
      if (slug) {
        page = await prisma.page.findFirst({ where: { slug }, select: { id: true, slug: true } });
      }
      if (!page) {
        page = await prisma.page.findFirst({
          where: { OR: [{ slug: "/" }, { type: "LANDING" }] },
          orderBy: { createdAt: "asc" },
          select: { id: true, slug: true },
        });
      }
    } catch (dbErr) {
      console.warn("[Contact] Page lookup failed (non-fatal):", dbErr);
    }

    // Best-effort: log the lead so it shows in the admin form-submissions view.
    // Never fail the request on a DB error.
    try {
      if (page) {
        await prisma.formSubmission.create({
          data: {
            pageId: page.id,
            pageSlug: page.slug,
            data: fields,
            userEmail: email,
            status: "received",
          },
        });
      }
    } catch (dbErr) {
      console.warn("[Contact] DB log failed (non-fatal):", dbErr);
    }

    // Best-effort: email the submission. No-ops if SMTP/recipient unconfigured.
    try {
      const recipient = page ? await resolveRecipient(page.id) : undefined;
      const cfg = await getEmailConfig();
      await sendSubmissionEmail(fields, email, cfg, String(source || "Contact form"), recipient);
    } catch (mailErr) {
      console.warn("[Contact] Email send failed (non-fatal):", mailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit";
    console.error("[Contact error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
