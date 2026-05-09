"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface GalleryCtaProps {
  heading?: string;
  subtext?: string;
  accentWord?: string;
  buttonText?: string;
  buttonUrl?: string;
  categorySlug?: string;
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  accentColor?: string;
  overlayOpacity?: number;
  textColor?: string;
}

interface CtaImage {
  url: string;
  thumbnailUrl: string | null;
  altText: string;
}

// Fixed collage positions for up to 8 images (% from top-left)
const COLLAGE_SLOTS = [
  { top: "5%",  left: "2%",  width: "30%", rotate: -4, zIndex: 3 },
  { top: "15%", left: "35%", width: "28%", rotate: 2,  zIndex: 2 },
  { top: "8%",  left: "65%", width: "32%", rotate: -2, zIndex: 4 },
  { top: "50%", left: "5%",  width: "26%", rotate: 3,  zIndex: 2 },
  { top: "55%", left: "33%", width: "30%", rotate: -3, zIndex: 3 },
  { top: "52%", left: "65%", width: "28%", rotate: 2,  zIndex: 2 },
  { top: "30%", left: "18%", width: "22%", rotate: -1, zIndex: 1 },
  { top: "35%", left: "72%", width: "24%", rotate: 4,  zIndex: 1 },
];

export default function GalleryCtaBlock({
  heading = "Explore Our Gallery",
  subtext = "Discover our work through stunning photography",
  accentWord = "",
  buttonText = "View Gallery",
  buttonUrl = "/gallery",
  categorySlug = "",
  stat1Value = "150+",
  stat1Label = "Photos",
  stat2Value = "10+",
  stat2Label = "Categories",
  accentColor = "#f59e0b",
  overlayOpacity = 55,
  textColor = "#ffffff",
}: GalleryCtaProps) {
  const [images, setImages] = useState<CtaImage[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    const apiUrl = categorySlug
      ? `/api/gallery/cta-images?category=${encodeURIComponent(categorySlug)}&limit=8`
      : "/api/gallery/cta-images?limit=8";
    fetch(apiUrl)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.success) setImages(d.data.images); })
      .catch(() => {});
  }, [categorySlug]);

  // Desktop: mouse parallax
  useEffect(() => {
    if (isMobile) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [isMobile]);

  // Mobile: gentle auto-drift
  useEffect(() => {
    if (!isMobile) return;
    let frame: number;
    let t = 0;
    const tick = () => {
      t += 0.003;
      setMousePos({ x: 0.5 + Math.sin(t) * 0.15, y: 0.5 + Math.cos(t * 0.7) * 0.1 });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  // Build heading with optional accent word highlighted
  const renderHeading = () => {
    if (!accentWord || !heading.includes(accentWord)) return heading;
    const parts = heading.split(accentWord);
    return (
      <>
        {parts[0]}
        <span style={{ color: accentColor }}>{accentWord}</span>
        {parts[1]}
      </>
    );
  };

  const parallaxStrength = 18;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "360px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background collage */}
      {images.slice(0, COLLAGE_SLOTS.length).map((img, i) => {
        const slot = COLLAGE_SLOTS[i];
        const dx = (mousePos.x - 0.5) * parallaxStrength * (i % 3 === 0 ? 1 : i % 3 === 1 ? -0.6 : 0.8);
        const dy = (mousePos.y - 0.5) * parallaxStrength * (i % 2 === 0 ? 0.7 : -0.5);
        return (
          <div
            key={img.url + i}
            style={{
              position: "absolute",
              top: slot.top,
              left: slot.left,
              width: slot.width,
              zIndex: slot.zIndex,
              transform: `translate(${dx}px, ${dy}px) rotate(${slot.rotate}deg)`,
              transition: "transform 0.08s linear",
              borderRadius: "6px",
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.thumbnailUrl || img.url}
              alt={img.altText}
              style={{ width: "100%", display: "block", aspectRatio: "4/3", objectFit: "cover" }}
            />
          </div>
        );
      })}

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0,0,0,${overlayOpacity / 100})`,
          zIndex: 10,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          textAlign: "center",
          padding: "40px 24px",
          maxWidth: "600px",
          color: textColor,
        }}
      >
        {/* Stats chips */}
        {(stat1Value || stat2Value) && (
          <div className="d-flex justify-content-center gap-3 mb-4">
            {stat1Value && (
              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "100px",
                  padding: "6px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "1.1rem", color: accentColor }}>{stat1Value}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.85 }}>{stat1Label}</span>
              </div>
            )}
            {stat2Value && (
              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "100px",
                  padding: "6px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "1.1rem", color: accentColor }}>{stat2Value}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.85 }}>{stat2Label}</span>
              </div>
            )}
          </div>
        )}

        <h2
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "16px",
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {renderHeading()}
        </h2>

        {subtext && (
          <p
            style={{
              fontSize: "1rem",
              opacity: 0.88,
              marginBottom: "28px",
              lineHeight: 1.55,
            }}
          >
            {subtext}
          </p>
        )}

        {buttonText && buttonUrl && (
          <Link
            href={buttonUrl}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: accentColor,
              color: "#fff",
              padding: "12px 28px",
              borderRadius: "100px",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              boxShadow: `0 4px 20px ${accentColor}66`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${accentColor}88`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${accentColor}66`;
            }}
          >
            <i className="bi bi-images" />
            {buttonText}
          </Link>
        )}
      </div>
    </div>
  );
}
