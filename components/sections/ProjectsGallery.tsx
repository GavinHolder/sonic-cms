"use client";

import { useEffect, useState } from "react";

interface Project {
  id: string; title: string; location: string | null;
  description: string | null; coverImageUrl: string | null;
  images: string[]; completedDate: string | null;
  isActive: boolean; order: number;
}

interface Props {
  heading?: string;
  subtext?: string;
  textColor?: string;
  columns?: number;
}

export default function ProjectsGallery({ heading = "Our Projects", subtext = "", textColor = "#1f2937", columns = 3 }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openLightbox = (project: Project, startIndex = 0) => {
    const allImages = [project.coverImageUrl, ...(project.images ?? [])].filter(Boolean) as string[];
    if (allImages.length > 0) setLightbox({ images: allImages, index: startIndex });
  };

  const lightboxPrev = () => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length });
  };

  const lightboxNext = () => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.images.length });
  };

  const gridCols = Math.min(Math.max(columns, 1), 4);
  const colClass = gridCols === 4 ? "col-6 col-md-3" : gridCols === 3 ? "col-6 col-md-4" : gridCols === 2 ? "col-12 col-md-6" : "col-12";

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#4a7c59", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Section heading */}
      {(heading || subtext) && (
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          {heading && (
            <h2 style={{ color: textColor, fontWeight: 800, fontSize: "clamp(22px,3vw,36px)", margin: "0 0 10px" }}>
              {heading}
            </h2>
          )}
          {subtext && (
            <p style={{ color: textColor, opacity: 0.65, fontSize: 16, margin: 0, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              {subtext}
            </p>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
          <i className="bi bi-building" style={{ fontSize: 40, display: "block", marginBottom: 12 }} />
          <p style={{ margin: 0 }}>No projects available yet.</p>
        </div>
      ) : (
        <div className={`row g-3 g-md-4`}>
          {projects.map((p) => {
            const allImages = [p.coverImageUrl, ...(p.images ?? [])].filter(Boolean) as string[];
            const imageCount = allImages.length;
            return (
              <div key={p.id} className={colClass}>
                <div
                  style={{ borderRadius: 10, overflow: "hidden", background: "#1f2937", cursor: imageCount > 0 ? "pointer" : "default", height: "100%" }}
                  onClick={() => imageCount > 0 && openLightbox(p)}
                >
                  {/* Cover image */}
                  <div style={{ height: 200, overflow: "hidden", position: "relative", background: "#374151" }}>
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImageUrl} alt={p.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                        onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1.04)"; }}
                        onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1)"; }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
                        <i className="bi bi-image" style={{ fontSize: 36 }} />
                      </div>
                    )}
                    {/* Image count badge */}
                    {imageCount > 1 && (
                      <div style={{
                        position: "absolute", bottom: 8, right: 8,
                        background: "rgba(0,0,0,0.65)", color: "#fff",
                        fontSize: 11, borderRadius: 10, padding: "2px 8px",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <i className="bi bi-images" style={{ fontSize: 10 }} />
                        {imageCount}
                      </div>
                    )}
                    {/* Hover overlay */}
                    {imageCount > 0 && (
                      <div style={{
                        position: "absolute", inset: 0, background: "rgba(74,124,89,0)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.2s",
                      }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(74,124,89,0.3)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(74,124,89,0)"; }}
                      >
                        <i className="bi bi-zoom-in" style={{ fontSize: 28, color: "#fff", opacity: 0, transition: "opacity 0.2s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "14px 16px" }}>
                    <h5 style={{ color: "#fff", margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>{p.title}</h5>
                    {p.location && (
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
                        <i className="bi bi-geo-alt me-1" />{p.location}
                      </div>
                    )}
                    {p.completedDate && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        <i className="bi bi-calendar3 me-1" />{p.completedDate}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 2000, cursor: "pointer" }}
            onClick={() => setLightbox(null)}
          />
          <div style={{ position: "fixed", inset: 0, zIndex: 2010, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 24, borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ×
            </button>
            {/* Prev */}
            {lightbox.images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                style={{ position: "absolute", left: 16, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 22, borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className="bi bi-chevron-left" />
              </button>
            )}
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.images[lightbox.index]} alt=""
              style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
              onClick={(e) => e.stopPropagation()}
            />
            {/* Next */}
            {lightbox.images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                style={{ position: "absolute", right: 16, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 22, borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className="bi bi-chevron-right" />
              </button>
            )}
            {/* Counter */}
            {lightbox.images.length > 1 && (
              <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 13, borderRadius: 12, padding: "4px 12px" }}>
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
