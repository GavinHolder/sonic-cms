import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

// Admin-managed package contract-term options (24-Month, Prepaid, Month-to-Month…) —
// replaces the old hardcoded TERMS constant in NetworksManager.tsx. Mirrors the
// ServiceCategory/ProductType admin pattern; see PackageTerm model comment in
// prisma/schema.prisma for the (deliberately loose) coupling to Package.term.
export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const terms = await prisma.packageTerm.findMany({
    orderBy: [{ kind: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(terms);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const kind = body.kind === "VAS" ? "VAS" : "DATA";

  const term = await prisma.packageTerm.create({
    data: {
      name,
      kind,
      billsMonthly: body.billsMonthly ?? true,
      order: body.order ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(term, { status: 201 });
}
