import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";

const CreateSchema = z.object({
  name:         z.string().min(1).max(120),
  description:  z.string().max(500).optional().nullable(),
  templateType: z.enum(["standalone", "section", "page"]),
  sectionType:  z.string().optional().nullable(),
  thumbnail:    z.string().url().optional().nullable(),
  data:         z.record(z.string(), z.unknown()),
  tags:         z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const templateType = searchParams.get("type");
  const sectionType  = searchParams.get("sectionType");
  const search       = searchParams.get("search") ?? "";

  const where: Record<string, unknown> = {};
  if (templateType) where.templateType = templateType;
  if (sectionType)  where.sectionType  = sectionType;
  if (search)       where.name = { contains: search, mode: "insensitive" };

  const templates = await prisma.cmsTemplate.findMany({
    where,
    orderBy: [{ isBuiltIn: "desc" }, { usageCount: "desc" }, { createdAt: "desc" }],
  });

  const data = templates.map(t => ({ ...t, tags: JSON.parse(t.tags as string) }));
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "PUBLISHER");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { tags = [], data, ...rest } = parsed.data;
  const template = await prisma.cmsTemplate.create({
    data: { ...rest, tags: JSON.stringify(tags), data: data as any },
  });

  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
