import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEmailConfig, sendSubmissionEmail, sanitizeRecipientList } from "@/lib/email";
import { enforceFormRateLimit } from "@/lib/form-rate-limit";
import { validateLeadPayload, LEAD_NOT_RECEIVED_MESSAGE } from "@/lib/coverage/lead-validation";

const SERVICE_TYPE: Record<string, string> = { FNO: "Fibre", WISP: "Wireless ISP", WIRELESS: "Fixed Wireless", VOICE: "Voice" };

/** Largest request body accepted (characters). A real lead is well under 2 KB. */
const MAX_BODY_CHARS = 16384;
const BODY_TOO_LARGE = "That request is too large.";

const NETWORK_UNAVAILABLE = "That network is no longer available. Please check your address again.";
const PACKAGE_UNAVAILABLE = "That package is no longer available. Please check your address again.";

/**
 * Log a failed step WITHOUT personal data. Only the step and the error's class/code are
 * written: error messages are deliberately dropped because Prisma and SMTP errors can
 * quote the submitted values (name, email, phone, address) verbatim.
 */
function logFailure(step: "lookup" | "store" | "email", err: unknown): void {
  const e = (typeof err === "object" && err !== null ? err : {}) as { name?: unknown; code?: unknown };
  console.error("[coverage-lead] step failed", {
    step,
    errorName: typeof e.name === "string" ? e.name : "unknown",
    errorCode: typeof e.code === "string" || typeof e.code === "number" ? e.code : null,
  });
}

/**
 * Categorized coverage lead. Created when a visitor picks a package (or asks to be
 * notified on a miss) from the coverage map. Network/package are resolved server-side
 * so the stored labels + leadCategory are authoritative. Stored as a FormSubmission
 * tagged source="coverage_check" + leadCategory (FNO/WISP/WIRELESS/VOICE/miss).
 *
 * ASSUMPTIONS:
 *   1. Public and unauthenticated: every field is hostile until validated
 *      (rules live in lib/coverage/lead-validation.ts, shared with the form).
 *   2. Requests arrive through the proxy, so the per-IP form limit can identify the visitor.
 *   3. sendSubmissionEmail escapes every value and returns without sending when no admin
 *      recipient survives sanitizeRecipientList — so "emailed" is only claimed when
 *      that same check passes for admin_email.
 *   4. The public coverage check offers packages of a network without checking the
 *      network's own isActive flag, so this route must not reject on it either.
 *
 * FAILURE MODES:
 *   - Spam / flooding -> 429 from enforceFormRateLimit before the body is read.
 *   - Oversized body (Content-Length or actual text > 16 KB) -> 413 before parsing.
 *   - Tampered ids (unknown network, unknown/inactive package, package from another
 *     network) -> 400, nothing stored.
 *   - DB down during the network/package check -> 500, nothing stored or sent.
 *   - Store fails, email sent -> 200 (admin has the lead), logged.
 *   - Email fails, store OK -> 200 (lead is in the Form Inbox), logged.
 *   - Store AND email fail -> 502 so the visitor is told the request was not received.
 *
 * INVARIANT: a 200 means the lead reached the Form Inbox, the admin mailbox, or both.
 */
export async function POST(req: NextRequest) {
  // Per-IP spam limit — must run before any body parsing, DB access or email send.
  const limited = enforceFormRateLimit(req, "coverage-lead");
  if (limited) return limited;

  // Size cap: the declared length first, then the text actually read (chunked / no header).
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_CHARS) {
    return NextResponse.json({ error: BODY_TOO_LARGE }, { status: 413 });
  }
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_CHARS) return NextResponse.json({ error: BODY_TOO_LARGE }, { status: 413 });
    body = JSON.parse(text);
  } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = validateLeadPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, ...(parsed.field ? { field: parsed.field } : {}) }, { status: 400 });
  }
  const { name, email, phone, address, miss, networkId, packageId, addonIds } = parsed.value;

  // Authoritative network/package resolution (never trust client labels)
  let networkName: string | null = null;
  let packageName: string | null = null;
  let packageTerm: string | null = null;
  let packageCategory: string | null = null;
  let packagePrice: string | null = null;
  let packagePeriod: string | null = null;
  let serviceType: string | null = null;
  let leadCategory = "miss";
  let addonNames: string[] = [];
  if (!miss) {
    if (packageId && !networkId) return NextResponse.json({ error: PACKAGE_UNAVAILABLE }, { status: 400 });
    if (networkId) {
      try {
        const net = await prisma.network.findUnique({ where: { id: networkId }, select: { name: true, category: true } });
        if (!net) return NextResponse.json({ error: NETWORK_UNAVAILABLE }, { status: 400 });
        networkName = net.name;
        leadCategory = net.category;
        serviceType = SERVICE_TYPE[net.category] ?? net.category;

        if (packageId) {
          const pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { name: true, term: true, price: true, period: true, isActive: true, networkId: true, category: { select: { name: true } } } });
          if (!pkg || !pkg.isActive || pkg.networkId !== networkId) return NextResponse.json({ error: PACKAGE_UNAVAILABLE }, { status: 400 });
          packageName = pkg.name; packageTerm = pkg.term; packageCategory = pkg.category?.name ?? null; packagePrice = pkg.price; packagePeriod = pkg.period;
        }
        if (addonIds.length) {
          const addons = await prisma.package.findMany({ where: { id: { in: addonIds }, networkId, isActive: true }, select: { name: true, term: true } });
          addonNames = addons.map((a) => (a.term ? `${a.name} (${a.term})` : a.name));
        }
      } catch (err) {
        logFailure("lookup", err);
        return NextResponse.json({ error: LEAD_NOT_RECEIVED_MESSAGE }, { status: 500 });
      }
    }
  }

  const data = [
    { label: "Name", value: name },
    { label: "Email", value: email },
    { label: "Phone", value: phone },
    ...(address ? [{ label: "Address checked", value: address }] : []),
    ...(serviceType ? [{ label: "Service type", value: serviceType }] : []),
    ...(networkName ? [{ label: "Network", value: networkName }] : []),
    ...(packageName ? [{ label: "Package", value: packageTerm ? `${packageName} (${packageTerm})` : packageName }] : []),
    ...(packagePrice ? [{ label: "Price", value: packagePeriod ? `${packagePrice}${packagePeriod.startsWith("/") ? packagePeriod : ` ${packagePeriod}`}` : packagePrice }] : []),
    ...(packageCategory ? [{ label: "Category", value: packageCategory }] : []),
    ...(addonNames.length ? [{ label: "Add-ons", value: addonNames.join(", ") }] : []),
    { label: "Lead type", value: leadCategory },
  ];

  // Store in the Form Inbox. Non-fatal on its own — the email below can still carry the lead.
  let stored = false;
  try {
    // FormSubmission needs a page FK — prefer the coverage page, else landing, else any.
    const page =
      (await prisma.page.findFirst({ where: { slug: "coverage" } })) ??
      (await prisma.page.findFirst({ where: { type: "LANDING" }, orderBy: { createdAt: "asc" } })) ??
      (await prisma.page.findFirst());
    if (!page) throw Object.assign(new Error("no page to attach the submission to"), { name: "NoPageConfigured" });
    await prisma.formSubmission.create({
      data: {
        pageId: page.id,
        pageSlug: page.slug,
        data,
        userEmail: email,
        status: "received",
        source: "coverage_check",
        leadCategory,
        networkName,
        packageName,
        addressChecked: address || null,
      },
    });
    stored = true;
  } catch (err) {
    logFailure("store", err);
  }

  // Notify the admin by email — the FormSubmission above makes the lead visible in
  // Form Inbox regardless, but coverage leads are time-sensitive (a visitor picked a
  // specific package at a specific address) so the admin should get pinged directly
  // rather than relying on someone checking Form Inbox. Reuses the same branded
  // notification helper every other form on the site uses (lib/email.ts), so this
  // gets the site's logo/colours and subject-prefix convention for free. Non-fatal on
  // failure when the lead was stored — a misconfigured SMTP setting must never lose it.
  let emailed = false;
  try {
    const cfg = await getEmailConfig();
    await sendSubmissionEmail(data, email, cfg, miss ? "Coverage Miss — Notify Request" : "Coverage Lead");
    // sendSubmissionEmail returns without sending when no admin recipient survives
    // sanitization — apply the same check so a no-op is never counted as "emailed".
    emailed = Boolean(sanitizeRecipientList(cfg.admin_email));
  } catch (err) {
    logFailure("email", err);
  }

  if (!stored && !emailed) {
    return NextResponse.json({ error: LEAD_NOT_RECEIVED_MESSAGE }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
