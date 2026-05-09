"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface GalleryImage {
  id: string;
  caption: string | null;
  altText: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
}

interface GalleryCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: GalleryImage[];
}

interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  imageCount: number;
}

interface Props {
  category: GalleryCategory;
  allCategories: CategorySummary[];
}

export default function GalleryPageClient({ category, allCategories }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(() => setLightboxIndex((i) => (i === null || i === 0 ? category.images.length - 1 : i - 1)), [category.images.length]);
  const nextImage = useCallback(() => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % category.images.length)), [category.images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, prevImage, nextImage]);

  const currentImage = lightboxIndex !== null ? category.images[lightboxIndex] : null;

  return (
    <>
      <div className="container-fluid py-5" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div className="mb-4 px-3">
          <div className="d-flex align-items-center gap-3 mb-2">
            <h1 className="h2 fw-bold mb-0">{category.name}</h1>
            <span className="badge bg-secondary rounded-pill">{category.images.length} photos</span>
          </div>
          {category.description && (
            <p className="text-muted mb-0" style={{ maxWidth: "600px" }}>{category.description}</p>
          )}
        </div>

        {/* Image grid */}
        {category.images.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-images d-block mb-3" style={{ fontSize: "3rem", opacity: 0.3 }} />
            <p>No images in this category yet.</p>
          </div>
        ) : (
          <div
            className="px-3"
            style={{
              columns: "3 300px",
              gap: "12px",
            }}
          >
            {category.images.map((img, index) => (
              <div
                key={img.id}
                className="mb-3"
                style={{ breakInside: "avoid", cursor: "pointer" }}
                onClick={() => openLightbox(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbnailUrl || img.url}
                  alt={img.altText}
                  style={{
                    width: "100%",
                    display: "block",
                    borderRadius: "8px",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLImageElement).style.transform = "scale(1.02)";
                    (e.currentTarget as HTMLImageElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLImageElement).style.boxShadow = "none";
                  }}
                />
                {img.caption && (
                  <p className="small text-muted mt-1 mb-0 px-1">{img.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating category drawer */}
      {allCategories.length > 1 && (
        <div
          style={{
            position: "fixed",
            right: drawerOpen ? 0 : "-240px",
            top: "50%",
            transform: "translateY(-50%)",
            transition: "right 0.3s ease",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Toggle tab */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            style={{
              background: "var(--bs-body-bg, #fff)",
              border: "1px solid var(--bs-border-color, #dee2e6)",
              borderRight: "none",
              borderRadius: "8px 0 0 8px",
              padding: "12px 8px",
              cursor: "pointer",
              boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--bs-body-color, #212529)",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            aria-label={drawerOpen ? "Close categories" : "Open categories"}
          >
            <i className={`bi bi-chevron-${drawerOpen ? "right" : "left"}`} style={{ writingMode: "initial" }} />
            <span>Categories</span>
          </button>

          {/* Drawer panel */}
          <div
            style={{
              width: "240px",
              background: "var(--bs-body-bg, #fff)",
              border: "1px solid var(--bs-border-color, #dee2e6)",
              borderRadius: "8px 0 0 8px",
              borderRight: "none",
              boxShadow: "-4px 0 16px rgba(0,0,0,0.1)",
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            <div className="p-3 border-bottom fw-semibold small text-muted text-uppercase" style={{ letterSpacing: "0.08em" }}>
              All Categories
            </div>
            <ul className="list-unstyled mb-0 p-2">
              {allCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/gallery/${cat.slug}`}
                    className={`d-flex align-items-center justify-content-between px-2 py-2 rounded text-decoration-none small ${cat.slug === category.slug ? "fw-semibold text-primary bg-primary bg-opacity-10" : "link-body-emphasis"}`}
                    style={{ transition: "background 0.15s" }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span>{cat.name}</span>
                    <span className="badge bg-secondary rounded-pill" style={{ fontSize: "0.7rem" }}>
                      {cat.imageCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && currentImage && (
        <div
          ref={lightboxRef}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === lightboxRef.current) closeLightbox();
          }}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            style={{
              position: "absolute", top: "1rem", right: "1rem",
              background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
              borderRadius: "50%", width: "40px", height: "40px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "1.2rem",
            }}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>

          {/* Prev */}
          {category.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              style={{
                position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                borderRadius: "50%", width: "48px", height: "48px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: "1.4rem",
              }}
              aria-label="Previous"
            >
              <i className="bi bi-chevron-left" />
            </button>
          )}

          {/* Image */}
          <div style={{ maxWidth: "90vw", maxHeight: "90vh", textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage.url}
              alt={currentImage.altText}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: "4px",
              }}
            />
            {currentImage.caption && (
              <p style={{ color: "rgba(255,255,255,0.8)", marginTop: "12px", fontSize: "14px" }}>
                {currentImage.caption}
              </p>
            )}
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "4px" }}>
              {lightboxIndex + 1} / {category.images.length}
            </p>
          </div>

          {/* Next */}
          {category.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              style={{
                position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                borderRadius: "50%", width: "48px", height: "48px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: "1.4rem",
              }}
              aria-label="Next"
            >
              <i className="bi bi-chevron-right" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
