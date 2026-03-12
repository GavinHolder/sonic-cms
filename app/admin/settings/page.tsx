"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import FeaturesTab from "@/components/admin/FeaturesTab";
import {
  getCMSSettings,
  saveCMSSettings,
  resetCMSSettings,
  restoreAllBanners,
  type CMSSettings,
} from "@/lib/cms-settings";

type SettingsCategory =
  | "ui"
  | "editor"
  | "preview"
  | "scroll"
  | "data"
  | "about"
  | "email"
  | "calculator"
  | "features";

const BASE_CATEGORIES: Array<{
  id: SettingsCategory;
  label: string;
  icon: string;
}> = [
  { id: "ui", label: "UI Preferences", icon: "bi-palette" },
  { id: "editor", label: "Editor", icon: "bi-pencil-square" },
  { id: "preview", label: "Preview", icon: "bi-eye" },
  { id: "scroll", label: "Scroll Behavior", icon: "bi-arrows-vertical" },
  { id: "data", label: "Data Management", icon: "bi-database" },
  { id: "email", label: "Email & SMTP", icon: "bi-envelope-gear" },
  { id: "calculator", label: "Calculator", icon: "bi-calculator" },
  { id: "about", label: "About", icon: "bi-info-circle" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<CMSSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("ui");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Email settings state (stored in DB via /api/settings/email)
  const [emailSettings, setEmailSettings] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    smtp_secure: "false",
    admin_email: "",
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTesting, setEmailTesting] = useState(false);

  // Calculator settings
  const [calcSettings, setCalcSettings] = useState({ quote_ref_prefix: "CE", quote_ref_counter: "1001" });
  const [calcSaving, setCalcSaving] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(getCMSSettings());
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.user?.role) {
          setUserRole(d.data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/settings/email")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setEmailSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {}); // Silently ignore if not configured
  }, []);

  useEffect(() => {
    fetch("/api/settings/calculator")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setCalcSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (emailSuccess) {
      const t = setTimeout(() => setEmailSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [emailSuccess]);

  const handleSave = () => {
    if (!settings) return;
    setSaving(true);
    try {
      saveCMSSettings(settings);
      setSuccessMessage("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      const defaultSettings = resetCMSSettings();
      setSettings(defaultSettings);
      setSuccessMessage("Settings reset to default!");
    }
  };

  const handleRestoreBanners = () => {
    restoreAllBanners();
    setSettings((prev) => (prev ? { ...prev, dismissedBanners: [] } : prev));
    setSuccessMessage("All info banners restored!");
  };

  /** Save email/SMTP settings to the backend via POST /api/settings/email */
  const handleSaveEmail = async () => {
    setEmailSaving(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEmailSuccess("Email settings saved!");
    } catch {
      setEmailError("Failed to save email settings. Please try again.");
    } finally {
      setEmailSaving(false);
    }
  };

  /** Save calculator settings (quote reference prefix + counter) */
  const handleSaveCalcSettings = async () => {
    setCalcSaving(true);
    setCalcError(null);
    try {
      const res = await fetch("/api/settings/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calcSettings),
      });
      if (!res.ok) throw new Error("Failed to save");
      setCalcSuccess("Calculator settings saved!");
      setTimeout(() => setCalcSuccess(null), 3000);
    } catch {
      setCalcError("Failed to save. Please try again.");
    } finally {
      setCalcSaving(false);
    }
  };

  /** Send a test OTP to the admin email to verify SMTP connection works */
  const handleTestEmail = async () => {
    if (!emailSettings.admin_email) {
      setEmailError("Enter an admin notification email to test.");
      return;
    }
    setEmailTesting(true);
    setEmailError(null);
    try {
      // Send a test OTP to the admin email to verify SMTP works
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailSettings.admin_email, purpose: "smtp-test" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setEmailSuccess(`Test email sent to ${emailSettings.admin_email}! Check your inbox.`);
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setEmailTesting(false);
    }
  };

  if (!settings) {
    return (
      <AdminLayout title="Settings" subtitle="Loading...">
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Settings"
      subtitle="Configure CMS behavior and preferences"
      actions={
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleReset}>
            <i className="bi bi-arrow-counterclockwise me-1"></i>
            Reset All
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-floppy me-1"></i>
                Save Settings
              </>
            )}
          </button>
        </div>
      }
    >
      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="d-flex gap-4" style={{ minHeight: "500px" }}>
        {/* Categories Sidebar */}
        <div
          className="flex-shrink-0"
          style={{ width: "220px" }}
        >
          <nav className="nav nav-pills flex-column gap-1">
            {[
              ...BASE_CATEGORIES,
              ...(userRole === "SUPER_ADMIN"
                ? [{ id: "features" as SettingsCategory, label: "Features", icon: "bi-toggles" }]
                : []),
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`nav-link d-flex align-items-center gap-2 text-start ${
                  activeCategory === cat.id ? "active" : "link-body-emphasis"
                }`}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  borderRadius: "0.375rem",
                  border: "none",
                  background: activeCategory === cat.id ? undefined : "transparent",
                }}
              >
                <i className={`bi ${cat.icon}`} style={{ width: "18px" }}></i>
                {cat.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          {/* UI Preferences */}
          {activeCategory === "ui" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-palette me-2 text-primary"></i>
                UI Preferences
              </h5>

              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showInfoBanners"
                        checked={settings.showInfoBanners}
                        onChange={(e) =>
                          setSettings({ ...settings, showInfoBanners: e.target.checked })
                        }
                      />
                      <label className="form-check-label" htmlFor="showInfoBanners">
                        Show info banners
                      </label>
                    </div>
                    <div className="form-text">Display helpful info banners on CMS pages</div>
                  </div>

                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showHelpTips"
                        checked={settings.showHelpTips}
                        onChange={(e) =>
                          setSettings({ ...settings, showHelpTips: e.target.checked })
                        }
                      />
                      <label className="form-check-label" htmlFor="showHelpTips">
                        Show help tips
                      </label>
                    </div>
                    <div className="form-text">Display contextual help tips throughout the CMS</div>
                  </div>

                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="compactView"
                        checked={settings.compactView}
                        onChange={(e) =>
                          setSettings({ ...settings, compactView: e.target.checked })
                        }
                      />
                      <label className="form-check-label" htmlFor="compactView">
                        Compact view
                      </label>
                    </div>
                    <div className="form-text">Use a more compact layout with smaller spacing</div>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Dismissed Banners</strong>
                      <div className="form-text mb-0">
                        {settings.dismissedBanners.length} banner(s) dismissed
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleRestoreBanners}
                      disabled={settings.dismissedBanners.length === 0}
                    >
                      <i className="bi bi-arrow-repeat me-1"></i>
                      Restore All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Editor Preferences */}
          {activeCategory === "editor" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-pencil-square me-2 text-success"></i>
                Editor Preferences
              </h5>

              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="autoSaveEnabled"
                        checked={settings.autoSaveEnabled}
                        onChange={(e) =>
                          setSettings({ ...settings, autoSaveEnabled: e.target.checked })
                        }
                      />
                      <label className="form-check-label" htmlFor="autoSaveEnabled">
                        Enable auto-save
                      </label>
                    </div>
                    <div className="form-text">Automatically save changes while editing</div>
                  </div>

                  {settings.autoSaveEnabled && (
                    <div className="mb-4 ms-4">
                      <label className="form-label small">Auto-save interval</label>
                      <select
                        className="form-select form-select-sm"
                        value={settings.autoSaveIntervalMs}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            autoSaveIntervalMs: parseInt(e.target.value),
                          })
                        }
                        style={{ maxWidth: "200px" }}
                      >
                        <option value={15000}>15 seconds</option>
                        <option value={30000}>30 seconds</option>
                        <option value={60000}>1 minute</option>
                        <option value={120000}>2 minutes</option>
                        <option value={300000}>5 minutes</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-0">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="confirmBeforeDelete"
                        checked={settings.confirmBeforeDelete}
                        onChange={(e) =>
                          setSettings({ ...settings, confirmBeforeDelete: e.target.checked })
                        }
                      />
                      <label className="form-check-label" htmlFor="confirmBeforeDelete">
                        Confirm before delete
                      </label>
                    </div>
                    <div className="form-text">Show confirmation dialog before deleting items</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Preferences */}
          {activeCategory === "preview" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-eye me-2 text-info"></i>
                Preview Preferences
              </h5>

              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="mb-0">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="previewInNewTab"
                        checked={settings.previewInNewTab}
                        onChange={(e) =>
                          setSettings({ ...settings, previewInNewTab: e.target.checked })
                        }
                      />
                      <label className="form-check-label" htmlFor="previewInNewTab">
                        Open preview in new tab
                      </label>
                    </div>
                    <div className="form-text">
                      When clicking Preview, open the page in a new browser tab
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scroll Behavior */}
          {activeCategory === "scroll" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-arrows-vertical me-2 text-purple"></i>
                Scroll Behavior
              </h5>

              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="scrollSnapEnabled"
                        checked={settings.scrollSnapEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setSettings({ ...settings, scrollSnapEnabled: enabled });
                          saveCMSSettings({ scrollSnapEnabled: enabled });
                        }}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="scrollSnapEnabled">
                        Enable Section Snapping
                      </label>
                    </div>
                    <div className="form-text">
                      <i className="bi bi-magnet me-1"></i>
                      Uses CSS scroll-snap to lock each section to the viewport when scrolling.
                      Disable for traditional free-scroll behavior.
                    </div>
                  </div>

                  <hr />

                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      Snap Mode
                      {!settings.scrollSnapEnabled && (
                        <span className="badge rounded-pill text-secondary border border-secondary-subtle ms-2">
                          Disabled
                        </span>
                      )}
                    </label>
                    {settings.scrollSnapEnabled ? (
                      <>
                        <div className="d-flex flex-column gap-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="scrollSnapMode"
                              id="snapMandatory"
                              checked={settings.scrollSnapMode !== "proximity"}
                              onChange={() => {
                                setSettings({ ...settings, scrollSnapMode: "mandatory" });
                                saveCMSSettings({ scrollSnapMode: "mandatory" });
                              }}
                            />
                            <label className="form-check-label" htmlFor="snapMandatory">
                              <strong>Mandatory</strong>
                              <span className="text-muted ms-1">— Always snaps to nearest section</span>
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="scrollSnapMode"
                              id="snapProximity"
                              checked={settings.scrollSnapMode === "proximity"}
                              onChange={() => {
                                setSettings({ ...settings, scrollSnapMode: "proximity" });
                                saveCMSSettings({ scrollSnapMode: "proximity" });
                              }}
                            />
                            <label className="form-check-label" htmlFor="snapProximity">
                              <strong>Proximity</strong>
                              <span className="text-muted ms-1">— Snaps only when close to a section edge</span>
                            </label>
                          </div>
                        </div>
                        <div className="form-text mt-2">
                          <i className="bi bi-lightning-charge me-1 text-warning"></i>
                          Changes apply instantly — refresh the landing page to see the effect.
                        </div>
                      </>
                    ) : (
                      <div className="alert alert-secondary py-2 small mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        Enable section snapping above to configure the snap mode.
                      </div>
                    )}
                  </div>

                  <hr />

                  <div className="mb-0">
                    <label className="form-label fw-semibold">How It Works</label>
                    <div className="alert alert-light border py-2 small mb-0">
                      <i className="bi bi-lightbulb me-2 text-warning"></i>
                      <strong>CSS Scroll Snap</strong> — Each section on the landing page occupies the full
                      viewport height. When scrolling, the browser automatically snaps to the nearest section
                      boundary. The hero, all content sections, and the footer each snap independently.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Management */}
          {activeCategory === "data" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-database me-2 text-warning"></i>
                Data Management
              </h5>

              <div className="card shadow-sm">
                <div className="card-body">
                  <p className="small text-muted mb-3">
                    All CMS data is currently stored in your browser&apos;s local storage. This data
                    persists across sessions but is not shared between devices.
                  </p>
                  <div className="alert alert-warning py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Clearing browser data will remove all CMS content and settings.
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to clear ALL CMS data? This cannot be undone."
                          )
                        ) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Clear All Data
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        const data = {
                          sections: localStorage.getItem("cms_sections_home"),
                          settings: localStorage.getItem("cms_settings"),
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `cms-backup-${new Date().toISOString().split("T")[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <i className="bi bi-download me-1"></i>
                      Export Backup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Email & SMTP ──────────────────────────────────────────────── */}
          {activeCategory === "email" && (
            <div>
              <h5 className="mb-1">Email & SMTP</h5>
              <p className="text-muted small mb-4">
                Configure your SMTP server for sending OTP verification codes and receiving
                form/CTA submission notifications.
              </p>

              {emailSuccess && (
                <div className="alert alert-success py-2 mb-3">{emailSuccess}</div>
              )}
              {emailError && (
                <div className="alert alert-danger py-2 mb-3">{emailError}</div>
              )}

              <div className="card mb-4">
                <div className="card-header fw-semibold">SMTP Server</div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label">SMTP Host</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="smtp.gmail.com"
                        value={emailSettings.smtp_host}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, smtp_host: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Port</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="587"
                        value={emailSettings.smtp_port}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, smtp_port: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="you@gmail.com"
                        value={emailSettings.smtp_user}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, smtp_user: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder={emailSettings.smtp_pass === "••••••••" ? "••••••••" : "App password"}
                        value={emailSettings.smtp_pass === "••••••••" ? "" : emailSettings.smtp_pass}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, smtp_pass: e.target.value })
                        }
                      />
                      <div className="form-text">For Gmail, use an App Password (not your account password)</div>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">From Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="noreply@yourdomain.com"
                        value={emailSettings.smtp_from}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, smtp_from: e.target.value })
                        }
                      />
                      <div className="form-text">Display name in sent emails</div>
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                      <div className="form-check form-switch mb-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="smtp-secure"
                          checked={emailSettings.smtp_secure === "true"}
                          onChange={(e) =>
                            setEmailSettings({
                              ...emailSettings,
                              smtp_secure: e.target.checked ? "true" : "false",
                            })
                          }
                        />
                        <label className="form-check-label" htmlFor="smtp-secure">
                          Use SSL (port 465)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card mb-4">
                <div className="card-header fw-semibold">Notification Email</div>
                <div className="card-body">
                  <label className="form-label">Admin Notification Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="admin@yourdomain.com"
                    value={emailSettings.admin_email}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, admin_email: e.target.value })
                    }
                  />
                  <div className="form-text">
                    All CTA and form page submissions will be forwarded to this address.
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEmail}
                  disabled={emailSaving}
                >
                  {emailSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-floppy me-2"></i>
                      Save Email Settings
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleTestEmail}
                  disabled={emailTesting || emailSaving}
                >
                  {emailTesting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Sending test…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Test Connection
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* About */}
          {activeCategory === "about" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-info-circle me-2 text-secondary"></i>
                About
              </h5>

              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle bg-primary flex-shrink-0"
                      style={{ width: "48px", height: "48px" }}
                    >
                      <i className="bi bi-speedometer2 text-white fs-5"></i>
                    </div>
                    <div>
                      <h6 className="mb-1">Your Company CMS</h6>
                      <p className="mb-0 small text-muted">
                        Version 1.0.0 | Content Management System
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calculator Settings */}
          {activeCategory === "calculator" && (
            <div className="row g-4">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-1">
                      <i className="bi bi-calculator me-2 text-primary" />Calculator Quote References
                    </h5>
                    <p className="text-muted small mb-4">
                      Configure the prefix and starting number for estimate reference codes (e.g. <code>CE-1001</code>).
                      Each new estimate increments the counter automatically.
                    </p>

                    <div className="row g-3 mb-4">
                      <div className="col-sm-4">
                        <label className="form-label fw-semibold">Reference Prefix</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="CE"
                          maxLength={8}
                          value={calcSettings.quote_ref_prefix}
                          onChange={(e) => setCalcSettings({ ...calcSettings, quote_ref_prefix: e.target.value.toUpperCase() })}
                        />
                        <div className="form-text">Letters only, max 8 characters.</div>
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label fw-semibold">Next Reference Number</label>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          step={1}
                          value={calcSettings.quote_ref_counter}
                          onChange={(e) => setCalcSettings({ ...calcSettings, quote_ref_counter: e.target.value })}
                        />
                        <div className="form-text">Auto-increments on each estimate.</div>
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label fw-semibold">Preview</label>
                        <div className="form-control bg-light text-muted" style={{ fontFamily: "monospace" }}>
                          {calcSettings.quote_ref_prefix || "CE"}-{String(calcSettings.quote_ref_counter || "1001").padStart(4, "0")}
                        </div>
                        <div className="form-text">How references will look.</div>
                      </div>
                    </div>

                    {calcError && <div className="alert alert-danger py-2 small">{calcError}</div>}
                    {calcSuccess && <div className="alert alert-success py-2 small">{calcSuccess}</div>}

                    <button
                      className="btn btn-primary"
                      onClick={handleSaveCalcSettings}
                      disabled={calcSaving}
                    >
                      {calcSaving
                        ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                        : <><i className="bi bi-check2-circle me-2" />Save Calculator Settings</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features (SUPER_ADMIN only) */}
          {activeCategory === "features" && userRole === "SUPER_ADMIN" && (
            <FeaturesTab />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
