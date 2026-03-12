"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";

interface SiteConfig {
  companyName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  copyrightText: string;
  showRegulatory: boolean;
}

const DEFAULTS: SiteConfig = {
  companyName: "", tagline: "", logoUrl: "", faviconUrl: "",
  phone: "", email: "", address: "", city: "", postalCode: "", country: "",
  facebook: "", instagram: "", twitter: "", linkedin: "", youtube: "",
  copyrightText: "", showRegulatory: false,
};

export default function SiteConfigPage() {
  return (
    <AdminLayout title="Site Configuration" subtitle="Company details auto-populate the Navbar and Footer">
      <SiteConfigForm />
    </AdminLayout>
  );
}

function SiteConfigForm() {
  const router = useRouter();
  const toast = useToast();
  const [config, setConfig] = useState<SiteConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const [meRes, cfgRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/site-config")]);
      if (!meRes.ok) { router.replace("/admin/login"); return; }
      if (cfgRes.ok) {
        const { data } = await cfgRes.json();
        setConfig({ ...DEFAULTS, ...data });
      }
      setLoading(false);
    }
    load();
  }, [router]);

  function set(field: keyof SiteConfig, value: string | boolean) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadImage(file: File, field: "logoUrl" | "faviconUrl") {
    const setter = field === "logoUrl" ? setUploadingLogo : setUploadingFavicon;
    setter(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media/upload-simple", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      set(field, url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setter(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success("Site configuration saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border spinner-border-sm text-primary" role="status" />
        <div className="text-muted mt-2 small">Loading…</div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4" style={{ maxWidth: 760 }}>

      {/* Company */}
      <div className="card shadow-sm">
        <div className="card-header py-2 px-3 fw-semibold" style={{ fontSize: "0.875rem" }}>
          <i className="bi bi-building me-2 text-primary" />Company
        </div>
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mb-1">Company Name</label>
              <input className="form-control form-control-sm" value={config.companyName}
                onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mb-1">Tagline</label>
              <input className="form-control form-control-sm" value={config.tagline}
                onChange={(e) => set("tagline", e.target.value)} placeholder="Short description or slogan" />
            </div>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="card shadow-sm">
        <div className="card-header py-2 px-3 fw-semibold" style={{ fontSize: "0.875rem" }}>
          <i className="bi bi-image me-2 text-primary" />Branding
        </div>
        <div className="card-body p-3">
          <div className="row g-4">

            {/* Logo */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mb-1">Logo</label>
              <div className="d-flex align-items-center gap-2 mb-2">
                {config.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.logoUrl} alt="Logo" style={{ height: 48, maxWidth: 160, objectFit: "contain", borderRadius: 4, background: "#f8f9fa", padding: "4px 8px", border: "1px solid #dee2e6" }} />
                ) : (
                  <div className="text-muted small d-flex align-items-center justify-content-center"
                    style={{ height: 48, width: 120, border: "1px dashed #dee2e6", borderRadius: 4, fontSize: "0.75rem" }}>
                    No logo
                  </div>
                )}
                <div className="d-flex flex-column gap-1">
                  <button className="btn btn-sm btn-outline-primary" style={{ fontSize: "0.75rem" }}
                    onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-upload me-1" />Upload</>}
                  </button>
                  {config.logoUrl && (
                    <button className="btn btn-sm btn-outline-danger" style={{ fontSize: "0.75rem" }} onClick={() => set("logoUrl", "")}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="d-none"
                onChange={(e) => { if (e.target.files?.[0]) uploadImage(e.target.files[0], "logoUrl"); e.target.value = ""; }} />
              <input className="form-control form-control-sm" value={config.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)} placeholder="Or paste URL…" />
            </div>

            {/* Favicon */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mb-1">Favicon</label>
              <div className="d-flex align-items-center gap-2 mb-2">
                {config.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.faviconUrl} alt="Favicon" style={{ height: 32, width: 32, objectFit: "contain", borderRadius: 4, background: "#f8f9fa", padding: 4, border: "1px solid #dee2e6" }} />
                ) : (
                  <div className="text-muted small d-flex align-items-center justify-content-center"
                    style={{ height: 32, width: 32, border: "1px dashed #dee2e6", borderRadius: 4 }}>
                    <i className="bi bi-image" style={{ fontSize: "0.75rem" }} />
                  </div>
                )}
                <div className="d-flex flex-column gap-1">
                  <button className="btn btn-sm btn-outline-primary" style={{ fontSize: "0.75rem" }}
                    onClick={() => faviconRef.current?.click()} disabled={uploadingFavicon}>
                    {uploadingFavicon ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-upload me-1" />Upload</>}
                  </button>
                  {config.faviconUrl && (
                    <button className="btn btn-sm btn-outline-danger" style={{ fontSize: "0.75rem" }} onClick={() => set("faviconUrl", "")}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={faviconRef} type="file" accept="image/*,.ico" className="d-none"
                onChange={(e) => { if (e.target.files?.[0]) uploadImage(e.target.files[0], "faviconUrl"); e.target.value = ""; }} />
              <input className="form-control form-control-sm" value={config.faviconUrl}
                onChange={(e) => set("faviconUrl", e.target.value)} placeholder="Or paste URL…" />
              <div className="text-muted mt-1" style={{ fontSize: "0.7rem" }}>Recommended: 32×32 or 64×64 PNG/ICO</div>
            </div>

          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="card shadow-sm">
        <div className="card-header py-2 px-3 fw-semibold" style={{ fontSize: "0.875rem" }}>
          <i className="bi bi-telephone me-2 text-primary" />Contact Details
        </div>
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mb-1">Phone</label>
              <input className="form-control form-control-sm" value={config.phone}
                onChange={(e) => set("phone", e.target.value)} placeholder="+27 00 000 0000" />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mb-1">Email</label>
              <input className="form-control form-control-sm" type="email" value={config.email}
                onChange={(e) => set("email", e.target.value)} placeholder="info@yourcompany.co.za" />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold mb-1">Street Address</label>
              <input className="form-control form-control-sm" value={config.address}
                onChange={(e) => set("address", e.target.value)} placeholder="123 Main Road" />
            </div>
            <div className="col-12 col-md-5">
              <label className="form-label small fw-semibold mb-1">City</label>
              <input className="form-control form-control-sm" value={config.city}
                onChange={(e) => set("city", e.target.value)} placeholder="Johannesburg" />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold mb-1">Postal Code</label>
              <input className="form-control form-control-sm" value={config.postalCode}
                onChange={(e) => set("postalCode", e.target.value)} placeholder="2000" />
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label small fw-semibold mb-1">Country</label>
              <input className="form-control form-control-sm" value={config.country}
                onChange={(e) => set("country", e.target.value)} placeholder="South Africa" />
            </div>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="card shadow-sm">
        <div className="card-header py-2 px-3 fw-semibold" style={{ fontSize: "0.875rem" }}>
          <i className="bi bi-share me-2 text-primary" />Social Links
        </div>
        <div className="card-body p-3">
          <div className="row g-3">
            {([
              ["facebook", "bi-facebook", "Facebook URL"],
              ["instagram", "bi-instagram", "Instagram URL"],
              ["twitter", "bi-twitter-x", "Twitter / X URL"],
              ["linkedin", "bi-linkedin", "LinkedIn URL"],
              ["youtube", "bi-youtube", "YouTube URL"],
            ] as const).map(([field, icon, placeholder]) => (
              <div key={field} className="col-12 col-md-6">
                <label className="form-label small fw-semibold mb-1">
                  <i className={`bi ${icon} me-1`} />{placeholder.replace(" URL", "")}
                </label>
                <input className="form-control form-control-sm" value={config[field]}
                  onChange={(e) => set(field, e.target.value)} placeholder={`https://…`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="card shadow-sm">
        <div className="card-header py-2 px-3 fw-semibold" style={{ fontSize: "0.875rem" }}>
          <i className="bi bi-layout-text-window-reverse me-2 text-primary" />Footer Options
        </div>
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-semibold mb-1">Copyright Text</label>
              <input className="form-control form-control-sm" value={config.copyrightText}
                onChange={(e) => set("copyrightText", e.target.value)}
                placeholder={`© ${new Date().getFullYear()} Your Company. All rights reserved.`} />
              <div className="text-muted mt-1" style={{ fontSize: "0.7rem" }}>Leave blank to auto-generate from company name + year.</div>
            </div>
            <div className="col-12">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="showRegulatory"
                  checked={config.showRegulatory} onChange={(e) => set("showRegulatory", e.target.checked)} />
                <label className="form-check-label small" htmlFor="showRegulatory">
                  Show Regulatory / Compliance badge in footer
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="d-flex justify-content-end">
        <button className="btn btn-primary px-4" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="bi bi-check2 me-2" />Save Configuration</>}
        </button>
      </div>

    </div>
  );
}
