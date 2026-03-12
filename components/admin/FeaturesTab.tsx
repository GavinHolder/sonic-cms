"use client";

import { useState, useEffect } from "react";

interface Feature {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export default function FeaturesTab() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/features")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const list = d.data as Feature[];
          // Seed concrete-calculator if not registered
          if (!list.find((f) => f.slug === "concrete-calculator")) {
            fetch("/api/features", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slug: "concrete-calculator",
                name: "Concrete Calculator",
                enabled: false,
                config: {},
              }),
            })
              .then((r) => r.json())
              .then((d2) => {
                if (d2.success) setFeatures([...list, d2.data]);
              });
          } else {
            setFeatures(list);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (slug: string, enabled: boolean) => {
    setSaving(slug);
    const res = await fetch(`/api/features/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (data.success) {
      setFeatures((prev) =>
        prev.map((f) => (f.slug === slug ? { ...f, enabled } : f))
      );
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <span className="spinner-border spinner-border-sm" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h5 className="mb-1">Client Features</h5>
      <p className="text-muted small mb-4">
        Toggle client-specific features. SUPER_ADMIN only.
      </p>
      {features.length === 0 ? (
        <p className="text-muted">No features registered yet.</p>
      ) : (
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Feature</th>
              <th>Slug</th>
              <th className="text-center">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.slug}>
                <td className="fw-semibold">{f.name}</td>
                <td>
                  <code className="text-muted">{f.slug}</code>
                </td>
                <td className="text-center">
                  <div className="form-check form-switch d-inline-flex">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      role="switch"
                      checked={f.enabled}
                      disabled={saving === f.slug}
                      onChange={(e) => toggle(f.slug, e.target.checked)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
