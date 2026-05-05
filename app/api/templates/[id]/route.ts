import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";

const UpdateSchema = z.object({
  name:        z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  thumbnail:   z.string().url().optional().nullable(),
  tags:        z.array(z.string()).optional(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const t = await prisma.cmsTemplate.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...t, tags: JSON.parse(t.tags as string) } });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = requireRole(req, "PUBLISHER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }
  const { tags, ...rest } = parsed.data;
  const t = await prisma.cmsTemplate.update({
    where: { id },
    data: { ...rest, ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}) },
  });
  return NextResponse.json({ success: true, data: { ...t, tags: JSON.parse(t.tags as string) } });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = requireRole(req, "PUBLISHER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const t = await prisma.cmsTemplate.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (t.isBuiltIn) return NextResponse.json({ error: "Cannot delete built-in template" }, { status: 403 });
  await prisma.cmsTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

/** Increment usageCount when a template is applied */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await prisma.cmsTemplate.update({ where: { id }, data: { usageCount: { increment: 1 } } });
  return NextResponse.json({ success: true });
}
