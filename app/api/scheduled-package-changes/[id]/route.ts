import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

// PUT: cancel a pending change. Only SCHEDULED rows can be cancelled — an
// already-APPLIED/FAILED row is history, not something to undo from here (undoing
// an applied price change means scheduling a NEW change, not editing the old
// record — keeps the audit trail honest about what actually ran).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await prisma.scheduledPackageChange.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "SCHEDULED") {
    return NextResponse.json({ error: `Cannot cancel a change with status ${existing.status}` }, { status: 400 });
  }

  const updated = await prisma.scheduledPackageChange.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json(updated);
}

// DELETE: remove a change record outright (cancelled/applied/failed history the
// admin no longer wants cluttering the list). A still-SCHEDULED row can be deleted
// this way too — same effect as cancel, just removed instead of kept as history.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  await prisma.scheduledPackageChange.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
