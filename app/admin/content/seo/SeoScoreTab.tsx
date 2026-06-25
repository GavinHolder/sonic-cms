"use client";

import { useCallback, useEffect, useState } from "react";

interface BreakdownItem {
  key: string;
  label: string;
  category: "onPage" | "content" | "performance";
  score: number;
  max: number;
  detail: string;
}
interface TrendPoint {
  runAt: string;
  score: number | null;
  onPageScore: number | null;
  contentScore: number | null;
  performanceScore: number | null;
}
interface Issue { slug: string; type: string; severity: string; message: string }
interface ScoreData {
  score: number | null;
  onPageScore: number | null;
  contentScore: number | null;
  performanceScore: number | null;
  hasRun: boolean;
  metrics: {
    indexedPages: number | null;
    avgPosition: number | null;
    impressions: number | null;
    clicks: number | null;
    ctr: number | null;
    pagesAudited: number;
    pagesAlerted: number;
    gscConnected: boolean;
  };
  breakdown: BreakdownItem[];
  issues: Issue[];
  trend: TrendPoint[];
  automation: {
    lastRun: string | null;
    nextRun: string | null;
    intervalHours: number;
    lastAlert: string | null;
    alertsEnabled: boolean;
  };
}

const bandColor = (v: number | null): string =>
  v == null ? "#9ca3af" : v >= 80 ? "#16a34a" : v >= 60 ? "#d97706" : "#dc2626";

const fmtDate = (iso: string | null): string =>
  !iso ? "—" : new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Gauge({ value }: { value: number | null }) {
  const v = value ?? 0;
  const r = 54, c = 2 * Math.PI * r, off = c - (v / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Score ${v}`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={bandColor(value)} strokeWidth="12"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <text x="70" y="66" textAnchor="middle" fontSize="34" fontWeight="700" fill="#111827">
        {value == null ? "—" : v}
      </text>
      <text x="70" y="90" textAnchor="middle" fontSize="12" fill="#6b7280">/ 100</text>
    </svg>
  );
}

function Sparkline({ trend }: { trend: TrendPoint[] }) {
  const pts = trend.map((t) => t.score).filter((s): s is number => s != null);
  if (pts.length < 2) return <p className="text-muted small mb-0">Not enough history yet.</p>;
  const w = 260, h = 56, max = 100, min = 0;
  const step = w / (pts.length - 1);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - ((p - min) / (max - min)) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Score trend">
      <path d={d} fill="none" stroke={bandColor(pts[pts.length - 1])} strokeWidth="2" />
    </svg>
  );
}

function SubScoreCard({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <div className="col-md-4">
      <div className="border rounded p-3 h-100">
        <div className="d-flex justify-content-between align-items-baseline">
          <span className="text-muted small">{label}</span>
          <span className="fw-bold fs-4" style={{ color: bandColor(value) }}>
            {value == null ? "—" : value}
          </span>
        </div>
        {value == null && note && <div className="small text-muted mt-1">{note}</div>}
      </div>
    </div>
  );
}

const CATEGORY_LABEL: Record<BreakdownItem["category"], string> = {
  onPage: "On-Page Health",
  content: "Content & Structure",
  performance: "Performance (Search Console)",
};

export default function SeoScoreTab() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/seo/score", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAudit = useCallback(async () => {
    setRunning(true);
    setStatus(null);
    try {
      const res = await fetch("/api/cron/seo-engine", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.error || "Audit failed");
      setStatus("Audit complete.");
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }, [load]);

  if (loading) return <div className="text-muted p-4">Loading SEO score…</div>;
  if (error || !data) return <div className="alert alert-danger">Could not load SEO score. <button className="btn btn-sm btn-outline-danger ms-2" onClick={load}>Retry</button></div>;

  const m = data.metrics;
  const grouped: Record<string, BreakdownItem[]> = { onPage: [], content: [], performance: [] };
  for (const b of data.breakdown) grouped[b.category]?.push(b);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">SEO Score</h5>
        <button className="btn btn-primary btn-sm" onClick={runAudit} disabled={running}>
          {running ? "Running…" : "Run Audit Now"}
        </button>
      </div>
      {status && <div className="alert alert-info py-2">{status}</div>}
      {!data.hasRun && (
        <div className="alert alert-warning py-2">
          No scheduled audit has run yet — showing a live on-page estimate. Click <strong>Run Audit Now</strong> for the full score (including content crawl and Search Console).
        </div>
      )}

      <div className="row g-4 align-items-center mb-4">
        <div className="col-md-3 text-center"><Gauge value={data.score} /></div>
        <div className="col-md-9">
          <div className="row g-3">
            <SubScoreCard label="On-Page Health" value={data.onPageScore} />
            <SubScoreCard label="Content & Structure" value={data.contentScore} note="Runs on next full audit" />
            <SubScoreCard label="Performance" value={data.performanceScore} note="Connect Search Console" />
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-5">
          <div className="border rounded p-3 h-100">
            <div className="text-muted small mb-2">Score trend</div>
            <Sparkline trend={data.trend} />
          </div>
        </div>
        <div className="col-md-7">
          <div className="border rounded p-3 h-100">
            <div className="text-muted small mb-2">Search Console (28 days)</div>
            {m.gscConnected ? (
              <div className="row text-center g-2">
                <div className="col"><div className="fw-bold">{m.indexedPages ?? "—"}</div><div className="small text-muted">Indexed</div></div>
                <div className="col"><div className="fw-bold">{m.avgPosition != null ? m.avgPosition.toFixed(1) : "—"}</div><div className="small text-muted">Avg pos.</div></div>
                <div className="col"><div className="fw-bold">{m.impressions?.toLocaleString() ?? "—"}</div><div className="small text-muted">Impr.</div></div>
                <div className="col"><div className="fw-bold">{m.clicks?.toLocaleString() ?? "—"}</div><div className="small text-muted">Clicks</div></div>
                <div className="col"><div className="fw-bold">{m.ctr != null ? `${(m.ctr * 100).toFixed(1)}%` : "—"}</div><div className="small text-muted">CTR</div></div>
              </div>
            ) : (
              <p className="text-muted small mb-0">Search Console not connected — performance metrics unavailable.</p>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="row g-4 mb-4">
        {(["onPage", "content", "performance"] as const).map((cat) => (
          <div className="col-md-4" key={cat}>
            <div className="border rounded p-3 h-100">
              <div className="fw-semibold mb-2">{CATEGORY_LABEL[cat]}</div>
              {grouped[cat].length === 0 ? (
                <p className="text-muted small mb-0">
                  {cat === "content" ? "Awaiting first content crawl." : cat === "performance" ? "Connect Search Console." : "—"}
                </p>
              ) : (
                grouped[cat].map((b) => {
                  const pct = b.max > 0 ? Math.round((b.score / b.max) * 100) : 0;
                  return (
                    <div className="mb-2" key={b.key}>
                      <div className="d-flex justify-content-between small">
                        <span>{b.label}</span>
                        <span className="text-muted">{b.score}/{b.max}</span>
                      </div>
                      <div className="progress" style={{ height: 5 }}>
                        <div className="progress-bar" role="progressbar" style={{ width: `${pct}%`, background: bandColor(pct) }} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
                      </div>
                      <div className="small text-muted">{b.detail}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Issues */}
      <div className="border rounded p-3 mb-4">
        <div className="fw-semibold mb-2">Issues ({data.issues.length})</div>
        {data.issues.length === 0 ? (
          <p className="text-muted small mb-0">No issues detected in the last audit. 🎉</p>
        ) : (
          <div className="table-responsive" style={{ maxHeight: 320, overflowY: "auto" }}>
            <table className="table table-sm mb-0">
              <tbody>
                {data.issues.slice(0, 100).map((i, idx) => (
                  <tr key={idx}>
                    <td style={{ width: 90 }}>
                      <span className={`badge bg-${i.severity === "error" ? "danger" : i.severity === "warning" ? "warning text-dark" : "secondary"}`}>{i.severity}</span>
                    </td>
                    <td className="small"><code>{i.slug || "site"}</code></td>
                    <td className="small">{i.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Automation */}
      <div className="border rounded p-3">
        <div className="fw-semibold mb-2">Automation</div>
        <div className="row small">
          <div className="col-md-3"><span className="text-muted d-block">Last run</span>{fmtDate(data.automation.lastRun)}</div>
          <div className="col-md-3"><span className="text-muted d-block">Next run (≈)</span>{fmtDate(data.automation.nextRun)}</div>
          <div className="col-md-2"><span className="text-muted d-block">Interval</span>{data.automation.intervalHours}h</div>
          <div className="col-md-2"><span className="text-muted d-block">Alerts</span>{data.automation.alertsEnabled ? "On" : "Off"}</div>
          <div className="col-md-2"><span className="text-muted d-block">Last alert</span>{fmtDate(data.automation.lastAlert)}</div>
        </div>
      </div>
    </div>
  );
}
