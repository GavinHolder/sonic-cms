import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryHubPage() {
  const first = await prisma.galleryCategory.findFirst({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { slug: true },
  });

  if (first) redirect(`/gallery/${first.slug}`);

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
