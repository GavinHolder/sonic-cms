import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import PageClient from "./PageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [seoConfig, page] = await Promise.all([
    fetchSeoConfig(),
    prisma.page.findUnique({
      where: { slug },
      select: {
        title: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        ogTitle: true,
        ogDescription: true,
        ogImage: true,
        canonicalUrl: true,
        noindex: true,
        nofollow: true,
      },
    }),
  ]);

  if (!page) return buildMetadata(null, seoConfig);
  return buildMetadata({ ...page, slug }, seoConfig);
}

export default function DynamicPage({ params }: Props) {
  return <PageClient params={params} />;
}
