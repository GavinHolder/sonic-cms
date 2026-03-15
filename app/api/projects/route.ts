import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true";

  if (showAll) {
    const auth = requireRole(request, "SUPER_ADMIN");
    if (auth instanceof NextResponse) return auth;
    const projects = await prisma.project.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(projects);
  }

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, location, description, coverImageUrl, images, completedDate, order } = body;

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      title,
      location,
      description,
      coverImageUrl,
      images: images ?? [],
      completedDate,
      order: order ?? 0,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
