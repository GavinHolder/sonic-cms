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
