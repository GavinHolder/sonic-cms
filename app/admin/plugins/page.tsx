"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

interface PluginManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "core" | "free" | "pro" | "enterprise";
  canDisable: boolean;
  defaultEnabled: boolean;
  dependencies: string[];
  settingsTabs: { id: string; label: string; icon: string }[];
  routes: { admin: string[] };
}

interface Plugin {
  slug: string;
  name: string;
  version: string;
  enabled: boolean;
  manifest: PluginManifest;
  config: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
}

const TIERS: { key: PluginManifest["tier"]; label: string }[] = [
  { key: "core", label: "Core System" },
  { key: "free", label: "Standard Features" },
  { key: "pro", label: "Optional Features" },
  { key: "enterprise", label: "Custom" },
];

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "danger"; text: string } | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Seed plugins on first load
        await fetch("/api/admin/plugins", { method: "POST" });
      } catch { /* ignore seed errors */ }
      await loadPlugins();
    }
    init();
  }, []);

  async function loadPlugins() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plugins");
      const data = await res.json();
      if (data.success) {
        setPlugins(data.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleToggle(plugin: Plugin) {
    if (toggling) return;
    setToggling(plugin.slug);
    setAlert(null);
    try {
      const res = await fetch(`/api/admin/plugins/${plugin.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !plugin.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setPlugins(prev =>
          prev.map(p => p.slug === plugin.slug ? { ...p, enabled: !plugin.enabled } : p)
        );
      } else {
        setAlert({ type: "danger", text: data.error?.message || "Failed to update plugin." });
      }
    } catch {
      setAlert({ type: "danger", text: "Network error — could not update plugin." });
    }
    setToggling(null);
  }

  function hasSettings(plugin: Plugin): boolean {
    return (
      (plugin.manifest.settingsTabs?.length ?? 0) > 0 ||
      (plugin.manifest.routes?.admin?.length ?? 0) > 0
    );
  }

  function settingsHref(plugin: Plugin): string {
    const adminRoutes = plugin.manifest.routes?.admin;
    if (adminRoutes?.length) return adminRoutes[0];
    return `/admin/plugins/${plugin.slug}/settings`;
  }

  const pluginsByTier = (tier: PluginManifest["tier"]) =>
    plugins.filter(p => p.manifest.tier === tier);

  return (
    <AdminLayout title="Plugin Manager" subtitle="Manage CMS features and extensions">
      <div style={{ maxWidth: 1200 }}>
        {alert && (
          <div className={`alert alert-${alert.type} alert-dismissible mb-3`}>
            {alert.text}
            <button type="button" className="btn-close" onClick={() => setAlert(null)} />
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : plugins.length === 0 ? (
          <div className="card shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-puzzle display-1 text-muted" style={{ opacity: 0.3 }} />
              <h5 className="mt-3 text-muted">No Plugins Found</h5>
              <p className="text-muted">No plugins are registered in this CMS instance.</p>
            </div>
          </div>
        ) : (
          TIERS.map(({ key, label }) => {
            const group = pluginsByTier(key);
            if (group.length === 0) return null;
            return (
              <div key={key} className="mb-4">
                <h6 className="text-uppercase text-muted fw-semibold mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}>
                  {label}
                </h6>
                <div className="row g-3">
                  {group.map(plugin => (
                    <div key={plugin.slug} className="col-md-6 col-lg-4">
                      <div className={`card shadow-sm h-100${!plugin.enabled ? " opacity-75" : ""}`}>
                        <div className="card-body">
                          {/* Header row: icon + name + toggle */}
                          <div className="d-flex align-items-start gap-2">
                            <div
                              className="d-flex align-items-center justify-content-center rounded flex-shrink-0"
                              style={{ width: 40, height: 40, background: "#f0f4ff" }}
                            >
                              <i className={`bi ${plugin.manifest.icon || "bi-puzzle"} text-primary fs-5`} />
                            </div>
                            <div className="flex-grow-1 min-w-0">
                              <div className="d-flex align-items-center justify-content-between gap-2">
                                <h6 className="mb-0 text-truncate">{plugin.manifest.name || plugin.name}</h6>
                                <span className="badge bg-secondary-subtle text-secondary flex-shrink-0" style={{ fontSize: "0.65rem" }}>
                                  v{plugin.version}
                                </span>
                              </div>
                              <p className="text-muted small mb-0 mt-1" style={{ lineHeight: 1.4 }}>
                                {plugin.manifest.description}
                              </p>
                            </div>
                          </div>

                          {/* Dependencies */}
                          {plugin.manifest.dependencies?.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-2">
                              {plugin.manifest.dependencies.map(dep => (
                                <span key={dep} className="badge bg-light text-muted border" style={{ fontSize: "0.6rem" }}>
                                  <i className="bi bi-link-45deg me-1" />
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between gap-2">
                          {/* Toggle / Always Active */}
                          {!plugin.manifest.canDisable ? (
                            <span className="text-success small fw-semibold">
                              <i className="bi bi-shield-check me-1" />
                              Always Active
                            </span>
                          ) : (
                            <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id={`toggle-${plugin.slug}`}
                                checked={plugin.enabled}
                                disabled={toggling === plugin.slug}
                                onChange={() => handleToggle(plugin)}
                                style={{ cursor: "pointer" }}
                              />
                              <label
                                className={`form-check-label small ${plugin.enabled ? "text-success fw-semibold" : "text-muted"}`}
                                htmlFor={`toggle-${plugin.slug}`}
                                style={{ cursor: "pointer" }}
                              >
                                {toggling === plugin.slug ? (
                                  <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                                ) : plugin.enabled ? "Enabled" : "Disabled"}
                              </label>
                            </div>
                          )}

                          {/* Settings link */}
                          {hasSettings(plugin) && (
                            <a
                              href={settingsHref(plugin)}
                              className="btn btn-sm btn-outline-secondary flex-shrink-0"
                            >
                              <i className="bi bi-gear me-1" />
                              Settings
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
