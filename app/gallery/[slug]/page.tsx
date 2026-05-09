import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import GalleryPageClient from "./GalleryPageClient";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await prisma.galleryCategory.findUnique({
    where: { slug: params.slug, isActive: true },
    select: { name: true, description: true },
  });
  if (!category) return { title: "Gallery" };
  return {
    title: category.name,
    description: category.description ?? undefined,
  };
}

export default async function GallerySlugPage({ params }: Props) {
  const category = await prisma.galleryCategory.findUnique({
    where: { slug: params.slug, isActive: true },
    include: {
      images: {
        orderBy: { order: "asc" },
        include: {
          asset: { select: { id: true, url: true, thumbnailUrl: true, altText: true, width: true, height: true } },
        },
      },
    },
  });

  if (!category) notFound();

  const allCategories = await prisma.galleryCategory.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { images: true } } },
  });

  return (
    <GalleryPageClient
      category={{
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        images: category.images.map((img) => ({
          id: img.id,
          caption: img.caption,
          altText: img.altText || img.asset.altText || "",
          url: img.asset.url,
          thumbnailUrl: img.asset.thumbnailUrl || img.asset.url,
          width: img.asset.width,
          height: img.asset.height,
        })),
      }}
      allCategories={allCategories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageCount: c._count.images,
      }))}
    />
  );
}
