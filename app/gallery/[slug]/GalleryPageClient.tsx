"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import "./gallery.css";

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

interface LightboxState {
  catIndex: number;
  imgIndex: number;
}

interface Props {
  allCategories: GalleryCategory[];
  activeSlug: string;
}

export default function GalleryPageClient({ allCategories, activeSlug }: Props) {
  const [activeCatSlug, setActiveCatSlug] = useState(activeSlug);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Scroll to active category on mount
  useEffect(() => {
    const idx = allCategories.findIndex((c) => c.slug === activeSlug);
    if (idx < 0) return;
    const timer = setTimeout(() => {
      sectionRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeSlug, allCategories]);

  // Scroll-spy: update active slug + URL as each section enters the top 30% of viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const slug = (entry.target as HTMLElement).dataset.slug ?? "";
            if (slug) {
              setActiveCatSlug(slug);
              window.history.replaceState(null, "", `/gallery/${slug}`);
            }
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );
    sectionRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [allCategories]);

  // Lightbox navigation
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const prevImage = useCallback(() => {
    setLightbox((lb) => {
      if (!lb) return null;
      const total = allCategories[lb.catIndex]?.images.length ?? 0;
      return { ...lb, imgIndex: lb.imgIndex === 0 ? total - 1 : lb.imgIndex - 1 };
    });
  }, [allCategories]);

  const nextImage = useCallback(() => {
    setLightbox((lb) => {
      if (!lb) return null;
      const total = allCategories[lb.catIndex]?.images.length ?? 0;
      return { ...lb, imgIndex: (lb.imgIndex + 1) % total };
    });
  }, [allCategories]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox, prevImage, nextImage]);

  const lbCat = lightbox !== null ? allCategories[lightbox.catIndex] : null;
  const lbImg = lbCat ? lbCat.images[lightbox!.imgIndex] : null;

  return (
    <>
      <div className="gal-wrap">
        {/* Sticky topbar */}
        <div className="gal-topbar">
          <span className="gal-topbar-brand">
            Gallery — <span>Our Work</span>
          </span>
          <Link href="/" className="gal-topbar-back">
            ← Back to site
          </Link>
        </div>

        {/* One section per category */}
        {allCategories.map((cat, catIdx) => (
          <section
            key={cat.id}
            ref={(el) => { sectionRefs.current[catIdx] = el; }}
            data-slug={cat.slug}
          >
            {/* Dark heading block */}
            <div className="gal-cat-head">
              <div className="gal-eyebrow">Our Portfolio</div>
              <h2 className="gal-cat-name">{cat.name}</h2>
              {cat.description && (
                <p className="gal-cat-desc">{cat.description}</p>
              )}
              <span className="gal-count-badge">
                {cat.images.length} Photo{cat.images.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Masonry grid — alternating bg */}
            <div
              className="gal-grid-wrap"
              style={{ background: catIdx % 2 === 0 ? "var(--gal-bg-0)" : "var(--gal-bg-1)" }}
            >
              {cat.images.length === 0 ? (
                <div className="gal-empty">
                  <svg
                    width="44" height="44" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5"
                    style={{ display: "block", margin: "0 auto 12px" }}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  No images yet — check back soon.
                </div>
              ) : (
                <div className="gal-masonry">
                  {cat.images.map((img, imgIdx) => (
                    <div
                      key={img.id}
                      className="gal-item"
                      onClick={() => setLightbox({ catIndex: catIdx, imgIndex: imgIdx })}
                      role="button"
                      aria-label={`View ${img.altText || img.caption || "image"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.thumbnailUrl || img.url}
                        alt={img.altText}
                        loading="lazy"
                      />
                      <div className="gal-item-overlay" aria-hidden>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Fixed TOC pills */}
      {allCategories.length > 1 && (
        <nav className="gal-toc" aria-label="Jump to category">
          {allCategories.map((cat, catIdx) => (
            <button
              key={cat.id}
              className={`gal-toc-pill${activeCatSlug === cat.slug ? " active" : ""}`}
              onClick={() =>
                sectionRefs.current[catIdx]?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <span className="gal-toc-dot" aria-hidden />
              {cat.name}
            </button>
          ))}
        </nav>
      )}

      {/* Lightbox */}
      {lightbox !== null && lbImg && lbCat && (
        <div
          className="gal-lightbox"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
          role="dialog"
          aria-modal
          aria-label="Image viewer"
        >
          <button className="gal-lb-close" onClick={closeLightbox} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>

          {lbCat.images.length > 1 && (
            <button
              className="gal-lb-arrow gal-lb-prev"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              aria-label="Previous image"
            >
              <i className="bi bi-chevron-left" />
            </button>
          )}

          <div className="gal-lb-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lbImg.url} alt={lbImg.altText} />
            {lbImg.caption && (
              <div className="gal-lb-caption">{lbImg.caption}</div>
            )}
            <div className="gal-lb-counter">
              {lightbox.imgIndex + 1} / {lbCat.images.length}
            </div>
          </div>

          {lbCat.images.length > 1 && (
            <button
              className="gal-lb-arrow gal-lb-next"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              aria-label="Next image"
            >
              <i className="bi bi-chevron-right" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
