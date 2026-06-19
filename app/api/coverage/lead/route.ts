import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Categorized coverage lead. Created when a visitor picks a package (or asks to be
 * notified on a miss) from the coverage map. Network/package are resolved server-side
 * so the stored labels + leadCategory are authoritative. Stored as a FormSubmission
 * tagged source="coverage_check" + leadCategory (FNO/WISP/WIRELESS/miss).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const address = String(body.address ?? "").trim();
  const miss = body.miss === true;
  const networkId = body.networkId ? String(body.networkId) : null;
  const packageId = body.packageId ? String(body.packageId) : null;

  if (!email || EMAIL_RE.test(email) === false) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  // Authoritative network/package resolution (never trust client labels)
  let networkName: string | null = null;
  let packageName: string | null = null;
  let packageTerm: string | null = null;
  let packageCategory: string | null = null;
  let serviceType: string | null = null;
  let leadCategory = "miss";
  const addonIds = Array.isArray(body.addonIds) ? (body.addonIds as unknown[]).map((x) => String(x)).slice(0, 20) : [];
  let addonNames: string[] = [];
  if (!miss && networkId) {
    const net = await prisma.network.findUnique({ where: { id: networkId }, select: { name: true, category: true } });
    if (net) {
      networkName = net.name;
      leadCategory = net.category;
      const SERVICE_TYPE: Record<string, string> = { FNO: "Fibre", WISP: "Wireless ISP", WIRELESS: "Fixed Wireless" };
      serviceType = SERVICE_TYPE[net.category] ?? net.category;
    }
    if (packageId) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { name: true, term: true, category: { select: { name: true } } } });
      if (pkg) { packageName = pkg.name; packageTerm = pkg.term; packageCategory = pkg.category?.name ?? null; }
    }
    if (addonIds.length) {
      const addons = await prisma.package.findMany({ where: { id: { in: addonIds } }, select: { name: true, term: true } });
      addonNames = addons.map((a) => (a.term ? `${a.name} (${a.term})` : a.name));
    }
  }

  // FormSubmission needs a page FK — prefer the coverage page, else landing, else any.
  const page =
    (await prisma.page.findFirst({ where: { slug: "coverage" } })) ??
    (await prisma.page.findFirst({ where: { type: "LANDING" }, orderBy: { createdAt: "asc" } })) ??
    (await prisma.page.findFirst());
  if (!page) return NextResponse.json({ error: "No page configured" }, { status: 500 });

  const data = [
    { label: "Name", value: name },
    { label: "Email", value: email },
    ...(phone ? [{ label: "Phone", value: phone }] : []),
    ...(address ? [{ label: "Address checked", value: address }] : []),
    ...(serviceType ? [{ label: "Service type", value: serviceType }] : []),
    ...(networkName ? [{ label: "Network", value: networkName }] : []),
    ...(packageName ? [{ label: "Package", value: packageTerm ? `${packageName} (${packageTerm})` : packageName }] : []),
    ...(packageCategory ? [{ label: "Category", value: packageCategory }] : []),
    ...(addonNames.length ? [{ label: "Add-ons", value: addonNames.join(", ") }] : []),
    { label: "Lead type", value: leadCategory },
  ];

  try {
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
  } catch {
    // Non-fatal — don't lose the visitor on a storage hiccup.
  }

  return NextResponse.json({ ok: true });
}
