import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

const getType = unstable_cache(
  async (slug: string): Promise<string | null> => {
    try {
      const page = await prisma.page.findUnique({
        where: { slug, enabled: true },
        select: { type: true },
      });
      return page?.type ?? null;
    } catch {
      return null;
    }
  },
  ["internal-page-type"],
  { revalidate: 30 }
);

/** Internal endpoint — called by middleware (Edge) to resolve page type without Prisma */
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!slug || slug.length > 120 || /[^a-z0-9-_]/.test(slug)) {
    return NextResponse.json({ type: null });
  }
  const type = await getType(slug);
  return NextResponse.json({ type }, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
  });
}
