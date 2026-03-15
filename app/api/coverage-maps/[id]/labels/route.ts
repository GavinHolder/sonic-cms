import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const labels = await prisma.coverageLabel.findMany({ where: { mapId: id } });
  return NextResponse.json(labels);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { text, lat, lng, fontSize, fontFamily, color, bgColor, bold } = body;

  if (!text || lat === undefined || lng === undefined) {
    return NextResponse.json({ error: "text, lat and lng are required" }, { status: 400 });
  }

  const label = await prisma.coverageLabel.create({
    data: {
      mapId: id,
      text, lat, lng,
      fontSize: fontSize ?? 14,
      fontFamily: fontFamily ?? "Arial",
      color: color ?? "#ffffff",
      bgColor: bgColor ?? null,
      bold: bold ?? false,
    },
  });
  return NextResponse.json(label, { status: 201 });
}
