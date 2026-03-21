"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";

interface Feature {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

// Map feature slugs to their admin settings pages
const FEATURE_PAGES: Record<string, { href: string; icon: string; description: string }> = {
  "concrete-calculator": {
    href: "/admin/features/concrete-settings",
    icon: "bi-calculator",
    description: "Embeddable concrete volume + cost estimator for customers.",
  },
  "coverage-maps": {
    href: "/admin/features/coverage-maps",
    icon: "bi-map",
    description: "Interactive coverage area maps for service regions.",
  },
  "projects": {
    href: "/admin/features/projects",
    icon: "bi-building",
    description: "Showcase completed projects and case studies.",
  },
};

export default function ManageFeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/features")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const list = d.data as Feature[];
          // Seed known features if not registered
          const knownSlugs = Object.keys(FEATURE_PAGES);
          const missing = knownSlugs.filter((s) => !list.find((f) => f.slug === s));
          if (missing.length === 0) {
            setFeatures(list);
            return;
          }
          // Register missing features
          Promise.all(
            missing.map((slug) =>
              fetch("/api/features", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  slug,
                  name: FEATURE_PAGES[slug] ? slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : slug,
                  enabled: false,
                  config: {},
                }),
              }).then((r) => r.json()).then((d2) => d2.success ? d2.data : null)
            )
          ).then((newFeatures) => {
            setFeatures([...list, ...newFeatures.filter(Boolean)]);
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (slug: string, enabled: boolean) => {
    setSaving(slug);
    setMsg(null);
    const res = await fetch(`/api/features/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (data.success) {
      setFeatures((prev) => prev.map((f) => (f.slug === slug ? { ...f, enabled } : f)));
      setMsg(`${data.data.name} ${enabled ? "enabled" : "disabled"}.`);
      setTimeout(() => setMsg(null), 3000);
    }
    setSaving(null);
  };

  return (
    <AdminLayout
      title="Features"
      subtitle="Enable or disable features for this CMS instance"
    >
      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <div className="vstack gap-4" style={{ maxWidth: 780 }}>
          {msg && (
            <div className="alert alert-success py-2 mb-0">{msg}</div>
          )}

          {features.length === 0 ? (
            <p className="text-muted">No features registered yet.</p>
          ) : (
            features.map((f) => {
              const page = FEATURE_PAGES[f.slug];
              return (
                <div
                  key={f.slug}
                  className={`card shadow-sm border ${f.enabled ? "border-primary border-opacity-25" : ""}`}
                >
                  <div className="card-body d-flex align-items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${f.enabled ? "bg-primary bg-opacity-10 text-primary" : "bg-light text-muted"}`}
                      style={{ width: 52, height: 52, fontSize: "1.4rem" }}
                    >
                      <i className={`bi ${page?.icon ?? "bi-puzzle"}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-semibold">{f.name}</span>
                        {f.enabled && (
                          <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: "0.7rem" }}>
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-muted small mb-0">
                        {page?.description ?? f.slug}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="d-flex align-items-center gap-3 flex-shrink-0">
                      {f.enabled && page?.href && (
                        <Link
                          href={page.href}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          <i className="bi bi-gear me-1" />
                          Settings
                        </Link>
                      )}
                      <div className="form-check form-switch mb-0" style={{ minWidth: 50 }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          role="switch"
                          style={{ width: "2.5rem", height: "1.35rem", cursor: "pointer" }}
                          checked={f.enabled}
                          disabled={saving === f.slug}
                          onChange={(e) => toggle(f.slug, e.target.checked)}
                          id={`feature-toggle-${f.slug}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="alert alert-info small mb-0">
            <i className="bi bi-info-circle me-1" />
            Enabled features appear in the sidebar for quick access. Disabling a feature hides it from the sidebar but does not delete its data.
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
