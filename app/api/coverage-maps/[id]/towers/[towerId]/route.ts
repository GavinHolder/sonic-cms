import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; towerId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { towerId } = await params;
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const d = data as Record<string, unknown>;
  const tower = await prisma.coverageTower.update({
    where: { id: towerId },
    data: {
      ...(d.name !== undefined && { name: d.name as string }),
      ...(d.lat !== undefined && { lat: d.lat as number }),
      ...(d.lng !== undefined && { lng: d.lng as number }),
      ...(d.description !== undefined && {
        description: typeof d.description === "string" ? d.description : null,
      }),
      ...(d.isActive !== undefined && { isActive: d.isActive as boolean }),
    },
  });
  return NextResponse.json(tower);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; towerId: string }> }
) {
  const auth = requireRole(_req, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { towerId } = await params;
  await prisma.coverageTower.delete({ where: { id: towerId } });
  return NextResponse.json({ ok: true });
}
