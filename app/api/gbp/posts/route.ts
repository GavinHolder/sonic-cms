import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { fetchGbpPosts, createGbpPost, GbpNotConnectedError } from "@/lib/gbp-client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const e = await requireRole(req, UserRole.EDITOR); if (e) return e;
  try {
    const token = await prisma.gbpToken.findFirst({ select: { locationId: true } });
    if (!token?.locationId) return NextResponse.json({ posts: [] });
    return NextResponse.json({ posts: await fetchGbpPosts(token.locationId) });
  } catch (err) {
    if (err instanceof GbpNotConnectedError) return NextResponse.json({ connected: false });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const e = await requireRole(req, UserRole.EDITOR); if (e) return e;
  try {
    const token = await prisma.gbpToken.findFirst({ select: { locationId: true } });
    if (!token?.locationId) return NextResponse.json({ error: "No location selected" }, { status: 400 });
    const body = await req.json() as { summary: string; actionType?: string; actionUrl?: string };
    if (!body.summary?.trim()) return NextResponse.json({ error: "summary required" }, { status: 400 });
    return NextResponse.json({ post: await createGbpPost(token.locationId, body) });
  } catch (err) {
    if (err instanceof GbpNotConnectedError) return NextResponse.json({ connected: false });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
