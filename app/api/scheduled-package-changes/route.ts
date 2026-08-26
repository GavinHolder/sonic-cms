import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

// GET: list every scheduled change (all statuses) for the admin's history/pending view.
export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const changes = await prisma.scheduledPackageChange.findMany({
    include: {
      package: { select: { id: true, name: true, price: true, network: { select: { name: true } } } },
    },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
  });
  return NextResponse.json(changes);
}

// POST: create one or more scheduled changes.
//
// PRICE_UPDATE accepts `priceUpdates: [{packageId, newPrice}, ...]` and creates one
// row per entry sharing the same scheduledAt/note — "select the packages that will
// participate" from one date-picker action, per row so one deleted package later
// can't block the other four from applying (see scheduled-changes.ts).
// CREATE/DELETE/REPLACE are inherently single-target, so they accept packageId
// and/or createData directly instead of an array.
export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { type, scheduledAt: scheduledAtRaw, note } = body;

  const validTypes = ["PRICE_UPDATE", "CREATE", "DELETE", "REPLACE"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of ${validTypes.join(", ")}` }, { status: 400 });
  }
  const scheduledAt = new Date(scheduledAtRaw);
  if (!scheduledAtRaw || isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "A valid scheduledAt date is required" }, { status: 400 });
  }

  if (type === "PRICE_UPDATE") {
    const priceUpdates = Array.isArray(body.priceUpdates) ? body.priceUpdates : [];
    if (priceUpdates.length === 0) {
      return NextResponse.json({ error: "priceUpdates must be a non-empty array of {packageId, newPrice}" }, { status: 400 });
    }
    for (const u of priceUpdates) {
      if (!u.packageId || u.newPrice == null || u.newPrice === "") {
        return NextResponse.json({ error: "Each priceUpdates entry needs packageId and newPrice" }, { status: 400 });
      }
    }
    const created = await prisma.scheduledPackageChange.createMany({
      data: priceUpdates.map((u: { packageId: string; newPrice: string | number }) => ({
        type: "PRICE_UPDATE" as const,
        scheduledAt,
        packageId: u.packageId,
        newPrice: String(u.newPrice),
        note: note || null,
      })),
    });
    return NextResponse.json({ created: created.count }, { status: 201 });
  }

  if (type === "DELETE") {
    if (!body.packageId) return NextResponse.json({ error: "packageId is required for DELETE" }, { status: 400 });
    const change = await prisma.scheduledPackageChange.create({
      data: { type: "DELETE", scheduledAt, packageId: body.packageId, note: note || null },
    });
    return NextResponse.json(change, { status: 201 });
  }

  if (type === "CREATE") {
    if (!body.createData || !body.createData.networkId || !body.createData.name || body.createData.price == null) {
      return NextResponse.json({ error: "createData (with networkId, name, price) is required for CREATE" }, { status: 400 });
    }
    const change = await prisma.scheduledPackageChange.create({
      data: { type: "CREATE", scheduledAt, createData: body.createData, note: note || null },
    });
    return NextResponse.json(change, { status: 201 });
  }

  // REPLACE
  if (!body.packageId) return NextResponse.json({ error: "packageId (the package to replace) is required for REPLACE" }, { status: 400 });
  if (!body.createData || !body.createData.networkId || !body.createData.name || body.createData.price == null) {
    return NextResponse.json({ error: "createData (with networkId, name, price) is required for REPLACE" }, { status: 400 });
  }
  const change = await prisma.scheduledPackageChange.create({
    data: { type: "REPLACE", scheduledAt, packageId: body.packageId, createData: body.createData, note: note || null },
  });
  return NextResponse.json(change, { status: 201 });
}
