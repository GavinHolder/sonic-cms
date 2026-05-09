import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import GalleryPageClient from "./GalleryPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.galleryCategory.findUnique({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });
  if (!category) return { title: "Gallery" };
  return {
    title: category.name,
    description: category.description ?? undefined,
  };
}

export default async function GallerySlugPage({ params }: Props) {
  const { slug } = await params;

  const allCategories = await prisma.galleryCategory.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      images: {
        orderBy: { order: "asc" },
        include: {
          asset: { select: { id: true, url: true, thumbnailUrl: true, altText: true, width: true, height: true } },
        },
      },
    },
  });

  if (allCategories.length === 0) {
    return (
      <div className="container-fluid py-5" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div className="text-center py-5">
          <i className="bi bi-images d-block mb-4" style={{ fontSize: "4rem", opacity: 0.25 }} />
          <h1 className="h3 fw-bold mb-2">Gallery</h1>
          <p className="text-muted mb-4" style={{ maxWidth: "400px", margin: "0 auto 1.5rem" }}>
            We&apos;re busy uploading our project photos. Check back soon.
          </p>
          <Link href="/" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-2" />Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GalleryPageClient
      allCategories={allCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        images: cat.images.map((img) => ({
          id: img.id,
          caption: img.caption,
          altText: img.altText || img.asset.altText || "",
          url: img.asset.url,
          thumbnailUrl: img.asset.thumbnailUrl || img.asset.url,
          width: img.asset.width,
          height: img.asset.height,
        })),
      }))}
      activeSlug={slug}
    />
  );
}
