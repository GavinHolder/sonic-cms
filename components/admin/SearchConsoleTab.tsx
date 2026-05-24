"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

interface GscSite {
  siteUrl:         string;
  permissionLevel: string;
}

interface PageStatus {
  slug:           string;
  title:          string;
  url:            string;
  indexStatus:    string;
  coverageState:  string;
  lastCrawled:    string | null;
  clicks28d:      number;
  impressions28d: number;
  error?:         string;
}

interface GscSitemap {
  path:            string;
  lastSubmitted?:  string;
  lastDownloaded?: string;
  isPending:       boolean;
  isSitemapsIndex: boolean;
}

interface ConnectionState {
  connected:    boolean;
  accountEmail: string;
  siteUrl:      string;
  sites:        GscSite[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const INDEX_BADGE: Record<string, { label: string; cls: string }> = {
  PASS:                { label: "Indexed",         cls: "bg-success" },
  FAIL:                { label: "Not Indexed",     cls: "bg-danger" },
  NEUTRAL:             { label: "Crawled",          cls: "bg-info text-dark" },
  VERDICT_UNSPECIFIED: { label: "Unknown",          cls: "bg-secondary" },
  UNKNOWN:             { label: "Unknown",          cls: "bg-secondary" },
};

function IndexBadge({ status }: { status: string }) {
  const b = INDEX_BADGE[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`badge ${b.cls}`} style={{ fontSize: 11 }}>{b.label}</span>;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Suspense-wrapped inner component (uses useSearchParams) ────────────────────

function SearchConsoleTabInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [conn, setConn]             = useState<ConnectionState | null>(null);
  const [loading, setLoading]       = useState(true);
  const [reconnectRequired, setReconnectRequired] = useState(false);

  const [pages, setPages]           = useState<PageStatus[]>([]);
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState(false);

  const [sitemaps, setSitemaps]     = useState<GscSitemap[]>([]);
  const [sitemapsLoading, setSitemapsLoading] = useState(false);

  const [alert, setAlert]           = useState<{ type: "success" | "danger"; message: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [inspecting, setInspecting] = useState<string | null>(null);

  const LIMIT = 20;

  // ── Read callback result from query params ──────────────────────────────────
  useEffect(() => {
    const gsc    = searchParams.get("gsc");
    const reason = searchParams.get("reason");
    if (gsc === "connected") {
      setAlert({ type: "success", message: "Google Search Console connected successfully." });
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("gsc");
      url.searchParams.delete("reason");
      router.replace(url.pathname + url.search);
    } else if (gsc === "error") {
      const msg = reason === "csrf_mismatch"   ? "Security check failed. Please try connecting again."
        : reason === "access_denied"           ? "Access was denied. Please authorise the Search Console scope."
        : reason === "exchange_failed"         ? "Token exchange failed. Check your Google Cloud credentials."
        : "Connection failed. Please try again.";
      setAlert({ type: "danger", message: msg });
      const url = new URL(window.location.href);
      url.searchParams.delete("gsc");
      url.searchParams.delete("reason");
      router.replace(url.pathname + url.search);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load connection state ───────────────────────────────────────────────────
  const loadConnection = useCallback(async () => {
    setLoading(true);
    setReconnectRequired(false);
    try {
      const res = await fetch("/api/seo/gsc/sites");
      if (!res.ok) { setConn(null); setLoading(false); return; }
      const j = await res.json();
      if (!j.success || j.error === "NOT_CONNECTED") {
        setConn(null);
      } else {
        setConn({
          connected:    true,
          accountEmail: j.data.accountEmail ?? "",
          siteUrl:      j.data.currentSiteUrl ?? "",
          sites:        j.data.sites ?? [],
        });
      }
    } catch {
      setConn(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnection(); }, [loadConnection]);

  // ── Load page status ────────────────────────────────────────────────────────
  const loadPages = useCallback(async (siteUrl: string, off: number) => {
    setPagesLoading(true);
    setQuotaWarning(false);
    try {
      const res = await fetch(
        `/api/seo/gsc/status?siteUrl=${encodeURIComponent(siteUrl)}&limit=${LIMIT}&offset=${off}`,
      );
      const j = await res.json();
      if (j.success) {
        setPages(j.data.pages ?? []);
        setTotal(j.data.total ?? 0);
        setQuotaWarning(j.data.quotaWarning ?? false);
      } else if (j.error === "NOT_CONNECTED") {
        setReconnectRequired(true);
      }
    } catch {
      setAlert({ type: "danger", message: "Failed to load page status." });
    } finally {
      setPagesLoading(false);
    }
  }, []);

  // ── Load sitemaps ───────────────────────────────────────────────────────────
  const loadSitemaps = useCallback(async (siteUrl: string) => {
    setSitemapsLoading(true);
    try {
      const res = await fetch(`/api/seo/gsc/sitemaps?siteUrl=${encodeURIComponent(siteUrl)}`);
      const j   = await res.json();
      if (j.success) setSitemaps(j.data.sitemaps ?? []);
    } catch { /* non-fatal */ }
    finally { setSitemapsLoading(false); }
  }, []);

  useEffect(() => {
    if (conn?.connected && conn.siteUrl) {
      loadPages(conn.siteUrl, 0);
      loadSitemaps(conn.siteUrl);
    }
  }, [conn, loadPages, loadSitemaps]);

  // ── Site property change ────────────────────────────────────────────────────
  async function handleSiteChange(siteUrl: string) {
    setConn((prev) => prev ? { ...prev, siteUrl } : prev);
    await fetch("/api/seo/gsc/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl }),
    });
    setOffset(0);
    loadPages(siteUrl, 0);
    loadSitemaps(siteUrl);
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!confirm("Disconnect Google Search Console? You can reconnect at any time.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/seo/gsc/disconnect", { method: "POST" });
      setConn(null);
      setPages([]);
      setSitemaps([]);
      setAlert({ type: "success", message: "Disconnected from Google Search Console." });
    } catch {
      setAlert({ type: "danger", message: "Failed to disconnect." });
    } finally {
      setDisconnecting(false);
    }
  }

  // ── Inspect individual URL ──────────────────────────────────────────────────
  async function handleInspect(page: PageStatus) {
    if (!conn?.siteUrl) return;
    setInspecting(page.slug);
    try {
      const res = await fetch("/api/seo/gsc/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: page.url, siteUrl: conn.siteUrl }),
      });
      const j = await res.json();
      if (j.success) {
        setPages((prev) => prev.map((p) =>
          p.slug === page.slug
            ? { ...p, indexStatus: j.data.indexStatusVerdict, coverageState: j.data.coverageState, lastCrawled: j.data.lastCrawlTime ?? null }
            : p,
        ));
      } else if (j.quotaExceeded) {
        setQuotaWarning(true);
      }
    } catch { /* non-fatal */ }
    finally { setInspecting(null); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible mb-4`}>
          <i className={`bi bi-${alert.type === "success" ? "check-circle" : "exclamation-triangle"} me-2`} />
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)} />
        </div>
      )}

      {reconnectRequired && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-arrow-repeat me-2" />
          <strong>Reconnect required.</strong> Your Google authorisation has expired or been revoked.{" "}
          <a href="/api/seo/gsc/connect" className="alert-link">Reconnect now</a>
        </div>
      )}

      {/* ── Disconnected state ──────────────────────────────────────────────── */}
      {!conn && !reconnectRequired && (
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">
                  <i className="bi bi-google me-2 text-primary" />Connect Google Search Console
                </h5>
                <p className="text-muted mb-4">
                  Connect your Google account to see index status, impressions, and clicks for each page — without leaving the CMS.
                </p>

                <div className="mb-4">
                  <div className="fw-semibold small text-muted text-uppercase mb-2" style={{ letterSpacing: "0.05em" }}>What you&apos;ll see</div>
                  <ul className="list-unstyled small mb-0">
                    {[
                      ["bi-check-circle-fill text-success", "Per-page index status (indexed, not indexed, crawled)"],
                      ["bi-graph-up text-primary",          "28-day impressions and clicks"],
                      ["bi-map text-info",                  "Submitted sitemaps and status"],
                      ["bi-search text-warning",            "Crawl coverage details per URL"],
                    ].map(([icon, label]) => (
                      <li key={label} className="d-flex align-items-center gap-2 mb-2">
                        <i className={`bi ${icon}`} />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a href="/api/seo/gsc/connect" className="btn btn-primary">
                  <i className="bi bi-google me-2" />Connect Google Account
                </a>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card border-0 bg-light">
              <div className="card-body p-4">
                <div className="fw-semibold small text-muted text-uppercase mb-3" style={{ letterSpacing: "0.05em" }}>Prerequisites</div>
                {[
                  { label: "GOOGLE_CLIENT_ID env var set",     check: true },
                  { label: "GOOGLE_CLIENT_SECRET env var set", check: true },
                  { label: "GOOGLE_REDIRECT_URI env var set",  check: true },
                  { label: "GSC_ENCRYPTION_KEY env var set",   check: true },
                  { label: "Site verified in Google Search Console", check: false, note: "Complete after connecting" },
                ].map(({ label, check, note }) => (
                  <div key={label} className="d-flex align-items-start gap-2 mb-2 small">
                    <i className={`bi ${check ? "bi-check-circle-fill text-success" : "bi-circle text-muted"} flex-shrink-0 mt-1`} />
                    <div>
                      <div>{label}</div>
                      {note && <div className="text-muted" style={{ fontSize: 11 }}>{note}</div>}
                    </div>
                  </div>
                ))}
                <div className="mt-3 small text-muted">
                  <i className="bi bi-info-circle me-1" />
                  See <code>.env.example</code> for setup instructions.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Connected state ─────────────────────────────────────────────────── */}
      {conn?.connected && (
        <div>
          {/* Header row */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10" style={{ width: 40, height: 40 }}>
                <i className="bi bi-google text-success" />
              </div>
              <div>
                <div className="fw-semibold">{conn.accountEmail || "Connected"}</div>
                <div className="text-muted small">Google Search Console</div>
              </div>
            </div>

            <div className="d-flex gap-2 align-items-center flex-wrap">
              {/* Site property selector */}
              {conn.sites.length > 1 && (
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: 320 }}
                  value={conn.siteUrl}
                  onChange={(e) => handleSiteChange(e.target.value)}
                >
                  <option value="">Select property…</option>
                  {conn.sites.map((s) => (
                    <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                  ))}
                </select>
              )}
              {conn.sites.length === 1 && (
                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">{conn.siteUrl || conn.sites[0].siteUrl}</span>
              )}

              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => conn.siteUrl && loadPages(conn.siteUrl, offset)}
                disabled={pagesLoading}
              >
                <i className={`bi ${pagesLoading ? "bi-hourglass-split" : "bi-arrow-clockwise"} me-1`} />
                Refresh
              </button>

              <button
                className="btn btn-sm btn-outline-danger"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting
                  ? <><span className="spinner-border spinner-border-sm me-1" />Disconnecting…</>
                  : <><i className="bi bi-x-circle me-1" />Disconnect</>}
              </button>
            </div>
          </div>

          {quotaWarning && (
            <div className="alert alert-warning py-2 small mb-4">
              <i className="bi bi-exclamation-triangle me-2" />
              <strong>API quota warning.</strong> Google Search Console API has a 2,000 requests/day limit. Some pages may show stale or missing data. Results are cached for 6 hours.
            </div>
          )}

          {/* ── Page status table ─────────────────────────────────────────── */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
              <div className="fw-semibold">Page Index Status</div>
              <span className="badge bg-secondary">{total} pages</span>
            </div>

            {pagesLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" />
                <span className="ms-2 text-muted small">Fetching index status…</span>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: "35%" }}>Page</th>
                      <th>Status</th>
                      <th>Last Crawled</th>
                      <th className="text-end">Impressions</th>
                      <th className="text-end">Clicks</th>
                      <th className="text-end pe-3">Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4 small">
                          {conn.siteUrl ? "No published pages found." : "Select a site property to load data."}
                        </td>
                      </tr>
                    )}
                    {pages.map((page) => (
                      <tr key={page.slug}>
                        <td className="ps-3">
                          <div className="fw-semibold small text-truncate" style={{ maxWidth: 240 }}>{page.title}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{page.url}</div>
                        </td>
                        <td><IndexBadge status={page.indexStatus} /></td>
                        <td className="text-muted small">
                          {page.lastCrawled
                            ? new Date(page.lastCrawled).toLocaleDateString()
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-end small">{fmt(page.impressions28d)}</td>
                        <td className="text-end small">{fmt(page.clicks28d)}</td>
                        <td className="text-end pe-3">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => handleInspect(page)}
                            disabled={inspecting === page.slug}
                          >
                            {inspecting === page.slug
                              ? <span className="spinner-border spinner-border-sm" />
                              : <><i className="bi bi-search me-1" />Inspect</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > LIMIT && (
              <div className="card-footer bg-transparent d-flex justify-content-between align-items-center py-2 small">
                <span className="text-muted">
                  Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
                </span>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={offset === 0}
                    onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); conn.siteUrl && loadPages(conn.siteUrl, o); }}
                  >
                    <i className="bi bi-chevron-left" />
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={offset + LIMIT >= total}
                    onClick={() => { const o = offset + LIMIT; setOffset(o); conn.siteUrl && loadPages(conn.siteUrl, o); }}
                  >
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sitemaps panel ────────────────────────────────────────────── */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom py-3">
              <div className="fw-semibold">Submitted Sitemaps</div>
            </div>
            <div className="card-body p-0">
              {sitemapsLoading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : sitemaps.length === 0 ? (
                <div className="text-center text-muted small py-4">
                  No sitemaps submitted yet. Submit your sitemap in Google Search Console.
                </div>
              ) : (
                <table className="table table-sm mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Sitemap URL</th>
                      <th>Last Downloaded</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitemaps.map((sm) => (
                      <tr key={sm.path}>
                        <td className="ps-3 small font-monospace">{sm.path}</td>
                        <td className="small text-muted">
                          {sm.lastDownloaded
                            ? new Date(sm.lastDownloaded).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                          {sm.isPending
                            ? <span className="badge bg-warning text-dark">Pending</span>
                            : <span className="badge bg-success">Active</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Public export — wrapped in Suspense for useSearchParams ───────────────────

export default function SearchConsoleTab() {
  return (
    <Suspense fallback={
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    }>
      <SearchConsoleTabInner />
    </Suspense>
  );
}
