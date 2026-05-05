import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

interface HomePageInfo {
  slug: string;
  type: string;
}

const getHomePageInfo = unstable_cache(
  async (): Promise<HomePageInfo | null> => {
    try {
      const config = await prisma.siteConfig.findUnique({
        where: { id: "singleton" },
        select: { homePage: true },
      });
      const slug = config?.homePage;
      if (!slug) return null;

      const page = await prisma.page.findUnique({
        where: { slug, enabled: true },
        select: { type: true },
      });
      if (!page) return null;

      return { slug, type: page.type };
    } catch {
      return null;
    }
  },
  ["internal-homepage"],
  { revalidate: 60 }
);

/** Internal endpoint — called by middleware (Edge) to resolve homepage without Prisma */
export async function GET(req: NextRequest) {
  const internal = req.headers.get("x-internal");
  if (!internal) return NextResponse.json({ slug: null, type: null }, { status: 403 });

  const info = await getHomePageInfo();
  return NextResponse.json(
    { slug: info?.slug ?? null, type: info?.type ?? null },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
  );
}
