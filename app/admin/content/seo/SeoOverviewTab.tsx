"use client";
import { useState, useEffect } from "react";

interface EngineRun {
  id: number; runAt: string; durationMs: number; status: string;
  pagesAudited: number; pagesAutoFilled: number; pagesProtected: number; pagesAlerted: number;
  issues: Array<{ type: string; severity: string; slug: string; message: string; autoFixed: boolean }>;
}

const ISSUE_LABELS: Record<string, string> = {
  canonical_base_redirect: "Canonical base redirects",
  redirect_canonical: "Page canonicals redirect",
  missing_meta_title: "Missing meta titles",
  missing_meta_description: "Missing meta descriptions",
  missing_og_image: "Missing OG images",
  duplicate_title: "Duplicate titles",
  duplicate_description: "Duplicate descriptions",
};

export default function SeoOverviewTab() {
  const [runs, setRuns] = useState<EngineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  async function fetchRuns() {
    try { const r = await fetch("/api/seo/engine-runs"); const j = await r.json() as { runs?: EngineRun[] }; setRuns(j.runs ?? []); } catch { /* keep empty */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchRuns(); }, []);

  async function triggerRun() {
    setTriggering(true); setTriggerMsg(null);
    try {
      const r = await fetch("/api/cron/seo-engine", { method: "POST" });
      const j = await r.json() as { success?: boolean; pagesAutoFilled?: number; pagesAlerted?: number };
      setTriggerMsg(j.success ? `Done — ${j.pagesAutoFilled ?? 0} auto-filled, ${j.pagesAlerted ?? 0} alerted` : "Run failed — check server logs");
      await fetchRuns();
    } catch { setTriggerMsg("Network error"); }
    finally { setTriggering(false); }
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

  const latest = runs[0];
  const issues = latest?.issues ?? [];
  const errors = issues.filter((i) => i.severity === "error").length;
  const warns  = issues.filter((i) => i.severity === "warning").length;

  const groups = issues.reduce<Record<string, { count: number; severity: string; slugs: string[] }>>((acc, i) => {
    if (!acc[i.type]) acc[i.type] = { count: 0, severity: i.severity, slugs: [] };
    acc[i.type].count++;
    if (acc[i.type].slugs.length < 3) acc[i.type].slugs.push(i.slug);
    return acc;
  }, {});

  type StatCard = { label: string; value: string | number; sub?: string; color?: string };

  const cards: StatCard[] = [
    { label: "Last Run", value: latest ? new Date(latest.runAt).toLocaleString() : "Never", sub: latest?.status },
    ...(latest ? [
      { label: "Pages Audited", value: latest.pagesAudited },
      { label: "Auto-Filled", value: latest.pagesAutoFilled, color: "success" },
      { label: "Issues", value: `${errors} / ${warns}`, sub: "errors / warnings", color: errors > 0 ? "danger" : warns > 0 ? "warning" : "success" },
    ] : []),
  ];

  return (
    <div>
      <div className="row g-3 mb-4">
        {cards.map((card, i) => (
          <div key={i} className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small mb-1">{card.label}</div>
                <div className={`fw-bold fs-5${card.color ? ` text-${card.color}` : ""}`}>{card.value}</div>
                {card.sub && <div className="text-muted" style={{fontSize:"0.7rem"}}>{card.sub}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-primary" onClick={triggerRun} disabled={triggering}>
          {triggering ? <><span className="spinner-border spinner-border-sm me-2" />Running…</> : <><i className="bi bi-play-fill me-2" />Run Engine Now</>}
        </button>
        {triggerMsg && <span className="text-muted small">{triggerMsg}</span>}
      </div>

      {Object.keys(groups).length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent fw-bold">Active Issues</div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light"><tr><th>Issue</th><th>Severity</th><th>Count</th><th>Pages</th></tr></thead>
              <tbody>
                {Object.entries(groups).map(([type, g]) => (
                  <tr key={type}>
                    <td className="fw-semibold">{ISSUE_LABELS[type] ?? type}</td>
                    <td><span className={`badge ${g.severity === "error" ? "bg-danger" : "bg-warning text-dark"}`}>{g.severity}</span></td>
                    <td>{g.count}</td>
                    <td className="text-muted small">{g.slugs.join(", ")}{g.count > 3 ? ` +${g.count - 3}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {runs.length > 1 && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-transparent fw-bold">Run History</div>
          <ul className="list-group list-group-flush">
            {runs.map((r) => (
              <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div><span className={`badge me-2 ${r.status === "success" ? "bg-success" : "bg-danger"}`}>{r.status}</span><span className="small">{new Date(r.runAt).toLocaleString()}</span></div>
                <div className="text-muted small">{r.pagesAudited} pages · {r.pagesAutoFilled} filled · {r.issues.length} issues · {(r.durationMs / 1000).toFixed(1)}s</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!latest && <div className="text-center py-5 text-muted"><i className="bi bi-robot fs-1 d-block mb-3" /><p>No engine runs yet. Click &quot;Run Engine Now&quot; to start.</p></div>}
    </div>
  );
}
