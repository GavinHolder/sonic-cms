import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryHubPage() {
  const first = await prisma.galleryCategory.findFirst({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { slug: true },
  });

  if (!first) notFound();
  redirect(`/gallery/${first.slug}`);
}
