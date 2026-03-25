"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import UpdateModal from "@/components/admin/UpdateModal";
import {
  getCMSSettings,
  saveCMSSettings,
  resetCMSSettings,
  restoreAllBanners,
  type CMSSettings,
} from "@/lib/cms-settings";
import BrandTokenEditor from "@/components/admin/BrandTokenEditor";

type SettingsCategory =
  | "cms-updates"
  | "site"
  | "brand"
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
  { id: "site", label: "Site", icon: "bi-globe2" },
  { id: "brand", label: "Brand", icon: "bi-brush" },
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
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("site");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoleLoaded, setUserRoleLoaded] = useState(false);

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

  // Maintenance mode
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceTemplate, setMaintenanceTemplate] = useState<"plain" | "construction" | "custom">("plain");
  const [maintenanceCustomImage, setMaintenanceCustomImage] = useState("");
  const [maintenancePrimary, setMaintenancePrimary] = useState("#78BE20");
  const [maintenanceDark, setMaintenanceDark] = useState("#53565A");
  const [maintenanceLight, setMaintenanceLight] = useState("#BBBCBC");
  const [maintenanceScheme, setMaintenanceScheme] = useState<"light" | "dark">("light");
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string | null>(null);

  // Calculator settings
  const [calcSettings, setCalcSettings] = useState({ quote_ref_prefix: "CE", quote_ref_counter: "1001" });
  const [calcSaving, setCalcSaving] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // CMS Update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateModalInfo, setUpdateModalInfo] = useState<Parameters<typeof UpdateModal>[0]["info"]>(null);

  // CMS Update config (GitHub settings)
  const [ghConfig, setGhConfig] = useState({
    githubPatSet: false,
    githubPatHint: "",
    githubRepoOwner: "",
    githubRepoName: "",
    githubWorkflowId: "deploy.yml",
    upstreamVersionUrl: "",
    updateChannel: "latest",
  });
  const [ghPat, setGhPat] = useState(""); // only set when user is changing it
  const [ghSaving, setGhSaving] = useState(false);
  const [ghMsg, setGhMsg] = useState<string | null>(null);
  const [ghError, setGhError] = useState<string | null>(null);
  const [showPat, setShowPat] = useState(false);
  const [ghVerifying, setGhVerifying] = useState(false);
  const [ghVerifyResults, setGhVerifyResults] = useState<{
    pat: { ok: boolean; detail: string };
    repo: { ok: boolean; detail: string };
    workflow: { ok: boolean; detail: string };
    upstream: { ok: boolean; detail: string };
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/updates/config")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGhConfig(d); })
      .catch(() => {});
  }, []);

  async function handleVerifyGhConfig() {
    setGhVerifying(true);
    setGhVerifyResults(null);
    try {
      const body: Record<string, string> = {
        githubRepoOwner: ghConfig.githubRepoOwner,
        githubRepoName: ghConfig.githubRepoName,
        githubWorkflowId: ghConfig.githubWorkflowId,
        upstreamVersionUrl: ghConfig.upstreamVersionUrl,
        updateChannel: ghConfig.updateChannel,
      };
      if (ghPat) body.githubPat = ghPat;
      const res = await fetch("/api/admin/updates/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.results) setGhVerifyResults(data.results);
      else setGhError(data.error ?? "Verification failed");
    } catch {
      setGhError("Network error during verification");
    } finally {
      setGhVerifying(false);
    }
  }

  async function handleSaveGhConfig() {
    setGhSaving(true); setGhMsg(null); setGhError(null);
    try {
      const body: Record<string, string> = {
        githubRepoOwner: ghConfig.githubRepoOwner,
        githubRepoName: ghConfig.githubRepoName,
        githubWorkflowId: ghConfig.githubWorkflowId,
        upstreamVersionUrl: ghConfig.upstreamVersionUrl,
        updateChannel: ghConfig.updateChannel,
      };
      if (ghPat) body.githubPat = ghPat;
      const res = await fetch("/api/admin/updates/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setGhConfig(data);
      setGhPat("");
      setShowPat(false);
      setGhMsg("GitHub config saved.");
    } catch (err) {
      setGhError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setGhSaving(false);
    }
  }

  useEffect(() => {
    setSettings(getCMSSettings());
  }, []);

  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((r) => r.json())
      .then((d) => {
        setMaintenanceEnabled(Boolean(d.enabled));
        if (d.template)     setMaintenanceTemplate(d.template);
        if (d.customImage)  setMaintenanceCustomImage(d.customImage);
        if (d.primaryColor) setMaintenancePrimary(d.primaryColor);
        if (d.darkColor)    setMaintenanceDark(d.darkColor);
        if (d.lightColor)   setMaintenanceLight(d.lightColor);
        if (d.colorScheme)  setMaintenanceScheme(d.colorScheme);
      })
      .catch(() => {})
      .finally(() => setMaintenanceLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.user?.role) {
          setUserRole(d.data.user.role);
        }
      })
      .catch(() => {})
      .finally(() => setUserRoleLoaded(true));
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

  const handleToggleMaintenance = async (enabled: boolean) => {
    setMaintenanceSaving(true);
    setMaintenanceMsg(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed");
      setMaintenanceEnabled(enabled);
      setMaintenanceMsg(enabled ? "Maintenance mode enabled." : "Maintenance mode disabled.");
      setTimeout(() => setMaintenanceMsg(null), 3000);
    } catch {
      setMaintenanceMsg("Failed to update maintenance mode.");
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const handleSaveMaintenanceTemplate = async (
    template: "plain" | "construction" | "custom",
    opts?: { customImage?: string; primaryColor?: string; darkColor?: string; lightColor?: string; colorScheme?: string },
  ) => {
    setMaintenanceSaving(true);
    setMaintenanceMsg(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          colorScheme:  opts?.colorScheme  ?? maintenanceScheme,
          customImage:  opts?.customImage  ?? maintenanceCustomImage,
          primaryColor: opts?.primaryColor ?? maintenancePrimary,
          darkColor:    opts?.darkColor    ?? maintenanceDark,
          lightColor:   opts?.lightColor   ?? maintenanceLight,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setMaintenanceTemplate(template);
      if (opts?.colorScheme  !== undefined) setMaintenanceScheme(opts.colorScheme as "light" | "dark");
      if (opts?.customImage  !== undefined) setMaintenanceCustomImage(opts.customImage);
      if (opts?.primaryColor !== undefined) setMaintenancePrimary(opts.primaryColor);
      if (opts?.darkColor    !== undefined) setMaintenanceDark(opts.darkColor);
      if (opts?.lightColor   !== undefined) setMaintenanceLight(opts.lightColor);
      setMaintenanceMsg("Settings saved.");
      setTimeout(() => setMaintenanceMsg(null), 3000);
    } catch {
      setMaintenanceMsg("Failed to save.");
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const handlePreviewMaintenance = () => {
    const p = new URLSearchParams({
      template: maintenanceTemplate,
      scheme:   maintenanceScheme,
      primary:  maintenancePrimary,
      dark:     maintenanceDark,
      light:    maintenanceLight,
    });
    if (maintenanceCustomImage) p.set("customImage", maintenanceCustomImage);
    window.open(`/maintenance-preview?${p.toString()}`, "_blank");
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

  if (!settings || !userRoleLoaded) {
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
        <div className="d-flex align-items-center gap-2">
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
                ? [
                    { id: "cms-updates" as SettingsCategory, label: "CMS Updates", icon: "bi-arrow-up-circle" },
                  ]
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
          {/* Site */}
          {activeCategory === "site" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-globe2 me-2 text-primary"></i>
                Site
              </h5>

              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong>Maintenance Mode</strong>
                        {maintenanceEnabled && (
                          <span className="badge bg-warning text-dark">Active</span>
                        )}
                      </div>
                      <div className="form-text mb-0">
                        When enabled, all public-facing pages show a maintenance screen.
                        The admin panel remains fully accessible.
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {maintenanceLoading ? (
                        <span className="spinner-border spinner-border-sm text-secondary" />
                      ) : (
                        <button
                          className={`btn btn-sm fw-semibold px-3 ${maintenanceEnabled ? "btn-warning" : "btn-outline-secondary"}`}
                          disabled={maintenanceSaving}
                          onClick={() => handleToggleMaintenance(!maintenanceEnabled)}
                        >
                          {maintenanceSaving ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : maintenanceEnabled ? (
                            <><i className="bi bi-toggle-on me-1" />On — Click to Disable</>
                          ) : (
                            <><i className="bi bi-toggle-off me-1" />Off — Click to Enable</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {maintenanceMsg && (
                    <div className={`alert py-2 small mt-3 mb-0 ${maintenanceEnabled ? "alert-warning" : "alert-success"}`}>
                      <i className={`bi ${maintenanceEnabled ? "bi-cone-striped" : "bi-check-circle"} me-2`}></i>
                      {maintenanceMsg}
                    </div>
                  )}

                  {maintenanceEnabled && (
                    <div className="alert alert-warning py-2 small mt-3 mb-0">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <strong>Site is in maintenance mode.</strong> Visitors see the maintenance page.
                      Disable this toggle when your site is ready.
                    </div>
                  )}
                </div>
              </div>

              {/* ── Maintenance Template Picker ── */}
              <div className="card shadow-sm mt-3">
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                    <div>
                      <strong>Maintenance Page Template</strong>
                      <div className="form-text mb-0">
                        Choose what visitors see during maintenance. The logo from Site Config is shown on all templates.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary flex-shrink-0"
                      onClick={handlePreviewMaintenance}
                    >
                      <i className="bi bi-eye me-1" />
                      Preview
                    </button>
                  </div>

                  <div className="row g-3 mb-3">
                    {/* Plain */}
                    <div className="col-sm-4">
                      <button
                        type="button"
                        className={`w-100 p-0 border rounded-2 overflow-hidden text-start ${maintenanceTemplate === "plain" ? "border-primary border-2" : "border-secondary-subtle"}`}
                        style={{ background: "none", cursor: "pointer" }}
                        onClick={() => handleSaveMaintenanceTemplate("plain")}
                        disabled={maintenanceSaving}
                      >
                        {/* Mini preview */}
                        <div style={{ background: "#0d1117", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #4d9fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4d9fff" }} />
                          </div>
                          <div style={{ width: 60, height: 6, background: "#f0f0f0", borderRadius: 3 }} />
                          <div style={{ width: 40, height: 3, background: "#4d9fff", borderRadius: 2 }} />
                        </div>
                        <div className="px-2 py-2 d-flex align-items-center gap-2">
                          {maintenanceTemplate === "plain" && <i className="bi bi-check-circle-fill text-primary" />}
                          <span className="small fw-semibold">Plain</span>
                          <span className="badge bg-secondary-subtle text-secondary ms-auto" style={{ fontSize: "0.65rem" }}>Default</span>
                        </div>
                      </button>
                    </div>

                    {/* Construction */}
                    <div className="col-sm-4">
                      <button
                        type="button"
                        className={`w-100 p-0 border rounded-2 overflow-hidden text-start ${maintenanceTemplate === "construction" ? "border-primary border-2" : "border-secondary-subtle"}`}
                        style={{ background: "none", cursor: "pointer" }}
                        onClick={() => handleSaveMaintenanceTemplate("construction")}
                        disabled={maintenanceSaving}
                      >
                        {/* Mini preview */}
                        <div style={{ background: "#0f0f0f", padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", height: 6, background: "repeating-linear-gradient(-45deg,#78BE20 0,#78BE20 5px,#111 5px,#111 10px)", borderRadius: 2 }} />
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", margin: "4px 0" }}>
                            <div style={{ width: 22, height: 16, background: "#f59e0b", borderRadius: "3px 2px 0 0" }} />
                            <div style={{ width: 34, height: 20, background: "#53565A", borderRadius: "8px 14px 14px 8px" }} />
                          </div>
                          <div style={{ width: "100%", height: 6, background: "repeating-linear-gradient(-45deg,#78BE20 0,#78BE20 5px,#111 5px,#111 10px)", borderRadius: 2 }} />
                        </div>
                        <div className="px-2 py-2 d-flex align-items-center gap-2">
                          {maintenanceTemplate === "construction" && <i className="bi bi-check-circle-fill text-primary" />}
                          <span className="small fw-semibold">Construction</span>
                        </div>
                      </button>
                    </div>

                    {/* Custom */}
                    <div className="col-sm-4">
                      <button
                        type="button"
                        className={`w-100 p-0 border rounded-2 overflow-hidden text-start ${maintenanceTemplate === "custom" ? "border-primary border-2" : "border-secondary-subtle"}`}
                        style={{ background: "none", cursor: "pointer" }}
                        onClick={() => handleSaveMaintenanceTemplate("custom")}
                        disabled={maintenanceSaving}
                      >
                        {/* Mini preview */}
                        <div style={{ background: maintenanceCustomImage ? `url(${maintenanceCustomImage}) center/cover` : "#1a1a1a", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                          <div style={{ background: "rgba(0,0,0,0.55)", padding: "4px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-image" style={{ color: "#fff", fontSize: "0.7rem" }} />
                            <div style={{ width: 30, height: 4, background: "#fff", borderRadius: 2, opacity: 0.7 }} />
                          </div>
                          <div style={{ width: 50, height: 5, background: "rgba(255,255,255,0.8)", borderRadius: 2 }} />
                        </div>
                        <div className="px-2 py-2 d-flex align-items-center gap-2">
                          {maintenanceTemplate === "custom" && <i className="bi bi-check-circle-fill text-primary" />}
                          <span className="small fw-semibold">Custom Image</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Light / Dark toggle */}
                  <div className="d-flex align-items-center gap-2 mt-3">
                    <span className="small fw-semibold text-muted">Colour Scheme:</span>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className={`btn ${maintenanceScheme === "light" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => {
                          setMaintenanceScheme("light");
                          handleSaveMaintenanceTemplate(maintenanceTemplate, { colorScheme: "light" });
                        }}
                        disabled={maintenanceSaving}
                      >
                        <i className="bi bi-sun me-1" />Light
                      </button>
                      <button
                        type="button"
                        className={`btn ${maintenanceScheme === "dark" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => {
                          setMaintenanceScheme("dark");
                          handleSaveMaintenanceTemplate(maintenanceTemplate, { colorScheme: "dark" });
                        }}
                        disabled={maintenanceSaving}
                      >
                        <i className="bi bi-moon me-1" />Dark
                      </button>
                    </div>
                  </div>

                  {/* Colour pickers — only shown when construction is selected */}
                  {maintenanceTemplate === "construction" && (
                    <div className="mt-2 p-3 rounded border" style={{ background: "rgba(0,0,0,0.02)" }}>
                      <div className="small fw-semibold mb-2">Brand Colours</div>
                      <div className="row g-3">
                        {[
                          { label: "Primary", value: maintenancePrimary, setter: setMaintenancePrimary, hint: "Pantone 2290 C" },
                          { label: "Dark",    value: maintenanceDark,    setter: setMaintenanceDark,    hint: "Cool Gray 11 C" },
                          { label: "Light",   value: maintenanceLight,   setter: setMaintenanceLight,   hint: "Cool Gray 4 C" },
                        ].map(({ label, value, setter, hint }) => (
                          <div className="col-sm-4" key={label}>
                            <label className="form-label small fw-semibold mb-1">{label}</label>
                            <div className="d-flex gap-2 align-items-center">
                              <input
                                type="color"
                                className="form-control form-control-color flex-shrink-0"
                                style={{ width: 40, height: 34, padding: 2 }}
                                value={value}
                                onChange={(e) => setter(e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                maxLength={7}
                                value={value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setter(v);
                                }}
                              />
                            </div>
                            <div className="form-text">{hint}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn btn-sm btn-primary mt-3"
                        onClick={() => handleSaveMaintenanceTemplate("construction", {
                          primaryColor: maintenancePrimary,
                          darkColor:    maintenanceDark,
                          lightColor:   maintenanceLight,
                        })}
                        disabled={maintenanceSaving}
                      >
                        {maintenanceSaving
                          ? <span className="spinner-border spinner-border-sm" />
                          : <><i className="bi bi-palette me-1" />Save Colours</>}
                      </button>
                    </div>
                  )}

                  {/* Custom image URL input — only shown when custom is selected */}
                  {maintenanceTemplate === "custom" && (
                    <div className="mt-2">
                      <label className="form-label small fw-semibold">Background Image URL</label>
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="https://... or /uploads/your-image.jpg"
                          value={maintenanceCustomImage}
                          onChange={(e) => setMaintenanceCustomImage(e.target.value)}
                        />
                        <button
                          className="btn btn-sm btn-primary flex-shrink-0"
                          onClick={() => handleSaveMaintenanceTemplate("custom", { customImage: maintenanceCustomImage })}
                          disabled={maintenanceSaving}
                        >
                          Save
                        </button>
                      </div>
                      <div className="form-text">Paste any uploaded image URL from the Media Library.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Brand */}
          {activeCategory === "brand" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-brush me-2 text-primary"></i>
                Brand Identity
              </h5>
              <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                Configure your site&apos;s colours, typography, spacing, and borders. Changes apply globally across all pages, sections, and Volt designs.
              </p>
              <BrandTokenEditor />
            </div>
          )}

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

          {/* CMS Updates (SUPER_ADMIN only) */}
          {activeCategory === "cms-updates" && userRole === "SUPER_ADMIN" && (
            <div>
              <h5 className="fw-semibold mb-4">
                <i className="bi bi-arrow-up-circle me-2 text-primary" />
                CMS Updates
              </h5>

              <div className="alert alert-info mb-4 small">
                <i className="bi bi-info-circle me-1" />
                Configure this CMS instance to receive updates from the master white-label-cms repo.
                The GitHub PAT is stored securely in the database and never exposed client-side.
              </div>

              {ghMsg && (
                <div className="alert alert-success alert-dismissible mb-3">
                  {ghMsg}
                  <button className="btn-close" onClick={() => setGhMsg(null)} />
                </div>
              )}
              {ghError && (
                <div className="alert alert-danger alert-dismissible mb-3">
                  {ghError}
                  <button className="btn-close" onClick={() => setGhError(null)} />
                </div>
              )}

              <div className="card shadow-sm mb-4">
                <div className="card-body vstack gap-3">
                  <h6 className="fw-semibold mb-0">GitHub Configuration</h6>

                  {/* PAT */}
                  <div>
                    <label className="form-label fw-medium">GitHub Personal Access Token</label>
                    <p className="form-text mt-0 mb-2">
                      Requires <code>repo</code> + <code>workflow</code> scopes. Used to trigger builds and check update status.
                    </p>
                    {ghConfig.githubPatSet && !showPat ? (
                      <div className="d-flex align-items-center gap-2">
                        <span className="form-control text-muted" style={{ maxWidth: 300 }}>
                          ●●●●●●●●●●●●●●●● {ghConfig.githubPatHint}
                        </span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowPat(true)}>
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="password"
                          className="form-control"
                          style={{ maxWidth: 400 }}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          value={ghPat}
                          onChange={e => setGhPat(e.target.value)}
                          autoComplete="new-password"
                        />
                        {showPat && (
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowPat(false); setGhPat(""); }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Repo owner + name */}
                  <div className="row g-3">
                    <div className="col-md-5">
                      <label className="form-label fw-medium">GitHub Repo Owner</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. GavinHolder"
                        value={ghConfig.githubRepoOwner}
                        onChange={e => setGhConfig(c => ({ ...c, githubRepoOwner: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-7">
                      <label className="form-label fw-medium">Repo Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. ovbreadymix-cms"
                        value={ghConfig.githubRepoName}
                        onChange={e => setGhConfig(c => ({ ...c, githubRepoName: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Workflow ID */}
                  <div>
                    <label className="form-label fw-medium">Workflow File</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ maxWidth: 260 }}
                      placeholder="deploy.yml"
                      value={ghConfig.githubWorkflowId}
                      onChange={e => setGhConfig(c => ({ ...c, githubWorkflowId: e.target.value }))}
                    />
                    <p className="form-text">The workflow filename in <code>.github/workflows/</code> that has <code>workflow_dispatch</code> trigger.</p>
                  </div>

                  {/* Update Channel */}
                  <div>
                    <label className="form-label fw-medium">Update Channel</label>
                    <select
                      className="form-select"
                      style={{ maxWidth: 280 }}
                      value={ghConfig.updateChannel}
                      onChange={e => {
                        const ch = e.target.value;
                        setGhConfig(c => {
                          // Auto-suggest upstream URL when switching channels
                          const base = c.upstreamVersionUrl
                            .replace(/\/public\/versions\/\w+\.json$/, "")
                            .replace(/\/public\/cms-version\.json$/, "");
                          const channelUrls: Record<string, string> = {
                            latest:       base ? `${base}/public/cms-version.json` : c.upstreamVersionUrl,
                            stable:       base ? `${base}/public/versions/stable.json` : c.upstreamVersionUrl,
                            lts:          base ? `${base}/public/versions/lts.json` : c.upstreamVersionUrl,
                            bugfix:       base ? `${base}/public/versions/bugfix.json` : c.upstreamVersionUrl,
                            experimental: base ? `${base}/public/versions/experimental.json` : c.upstreamVersionUrl,
                          };
                          return { ...c, updateChannel: ch, upstreamVersionUrl: channelUrls[ch] ?? c.upstreamVersionUrl };
                        });
                      }}
                    >
                      <option value="latest">Latest — every push to master (default)</option>
                      <option value="stable">Stable — manually tagged stable releases</option>
                      <option value="lts">LTS — long-term support releases</option>
                      <option value="bugfix">Bugfix — fix: commits only, no new features</option>
                      <option value="experimental">Experimental — cutting-edge, may be unstable</option>
                    </select>
                    <p className="form-text">
                      Controls which update stream this instance tracks.
                      Channels other than <em>Latest</em> require the master repo to publish channel manifest files.
                    </p>
                  </div>

                  {/* Upstream version URL */}
                  <div>
                    <label className="form-label fw-medium">Upstream Version URL</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://raw.githubusercontent.com/GavinHolder/white-label-cms/main/public/cms-version.json"
                      value={ghConfig.upstreamVersionUrl}
                      onChange={e => setGhConfig(c => ({ ...c, upstreamVersionUrl: e.target.value }))}
                    />
                    <p className="form-text">Raw URL to the master repo&apos;s version manifest. Auto-updated when you change the channel above.</p>
                  </div>

                  {/* Verify results */}
                  {ghVerifyResults && (
                    <div className="border rounded p-3 bg-body-tertiary">
                      <p className="fw-semibold mb-2 small">Verification Results</p>
                      <div className="vstack gap-1">
                        {(["pat", "repo", "workflow", "upstream"] as const).map((key) => {
                          const labels: Record<string, string> = { pat: "GitHub PAT", repo: "Repository", workflow: "Workflow file", upstream: "Upstream version URL" };
                          const r = ghVerifyResults[key];
                          return (
                            <div key={key} className="d-flex align-items-start gap-2 small">
                              <i className={`bi ${r.ok ? "bi-check-circle-fill text-success" : "bi-x-circle-fill text-danger"} mt-1 flex-shrink-0`} />
                              <div>
                                <span className="fw-medium">{labels[key]}</span>
                                {" — "}
                                <span className={r.ok ? "text-success" : "text-danger"}>{r.detail}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={handleVerifyGhConfig} disabled={ghVerifying || ghSaving}>
                      {ghVerifying ? <><span className="spinner-border spinner-border-sm me-1" />Verifying...</> : <><i className="bi bi-shield-check me-1" />Test & Verify</>}
                    </button>
                    <button className="btn btn-primary" onClick={handleSaveGhConfig} disabled={ghSaving || ghVerifying}>
                      {ghSaving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : <><i className="bi bi-floppy me-1" />Save GitHub Config</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick action */}
              <div className="card shadow-sm">
                <div className="card-body d-flex align-items-center justify-content-between gap-3">
                  <div>
                    <strong>Manual Update Check</strong>
                    <p className="form-text mb-0">Force-check for a new version right now.</p>
                  </div>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={async () => {
                      const res = await fetch("/api/admin/updates/check");
                      const d = await res.json();
                      setUpdateModalInfo(d);
                      setShowUpdateModal(true);
                    }}
                  >
                    <i className="bi bi-cloud-download me-1" />Check Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      <UpdateModal
        show={showUpdateModal}
        info={updateModalInfo}
        onClose={() => setShowUpdateModal(false)}
      />
    </AdminLayout>
  );
}
