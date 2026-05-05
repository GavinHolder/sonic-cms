import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

/**
 * Cached page type lookup — used by layout.tsx to detect STANDALONE pages at /{slug}
 * without the /standalone/ URL prefix. 30s TTL: acceptable for an admin-managed CMS.
 */
export const getPageType = unstable_cache(
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
  ["page-type"],
  { revalidate: 30 }
);

/**
 * Cached homepage config — used by layout.tsx to detect when / is serving a
 * STANDALONE page (so navbar/footer are suppressed). 60s TTL matches middleware cache.
 */
export const getHomePage = unstable_cache(
  async (): Promise<{ slug: string; type: string } | null> => {
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
  ["homepage-config"],
  { revalidate: 60 }
);
