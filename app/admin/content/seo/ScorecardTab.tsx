"use client";

import { useState, useEffect } from "react";
import type { SeoConfig } from "@/lib/seo-config";

interface PageData {
  slug: string;
  title: string;
  metaDescription: string | null;
  metaTitle: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  status: string;
}

interface CheckResult {
  label: string;
  points: number;
  earned: number;
  tip?: string;
}

interface ScoredPage {
  slug: string;
  title: string;
  score: number;
  checks: CheckResult[];
}

interface Props {
  config: SeoConfig;
}

function scorePage(page: PageData, config: SeoConfig): ScoredPage {
  const checks: CheckResult[] = [];

  // Meta title (10–60 chars)
  const title = page.metaTitle || page.title || "";
  const titleLen = title.length;
  const titleOk = titleLen >= 10 && titleLen <= 60;
  checks.push({
    label: "Meta title (10–60 chars)",
    points: 20,
    earned: titleOk ? 20 : titleLen > 0 ? 10 : 0,
    tip: !titleOk
      ? titleLen === 0
        ? "No title set"
        : `Title is ${titleLen} chars — aim for 10–60`
      : undefined,
  });

  // Meta description (50–155 chars)
  const descLen = (page.metaDescription || "").length;
  const descOk = descLen >= 50 && descLen <= 155;
  checks.push({
    label: "Meta description (50–155 chars)",
    points: 20,
    earned: descOk ? 20 : descLen > 0 ? 8 : 0,
    tip: !descOk
      ? descLen === 0
        ? "No description set"
        : `Description is ${descLen} chars — aim for 50–155`
      : undefined,
  });

  // OG image
  checks.push({
    label: "OG image set",
    points: 15,
    earned: page.ogImage ? 15 : 0,
    tip: !page.ogImage ? "No OG image — social shares will look generic" : undefined,
  });

  // Canonical URL resolves
  checks.push({
    label: "Canonical URL resolves",
    points: 15,
    earned: config.canonicalBase ? 15 : 0,
    tip: !config.canonicalBase ? "Set Canonical Base URL in Site Settings" : undefined,
  });

  // Not noindex (assumed pass — no per-page noindex field yet)
  checks.push({
    label: "Not noindex",
    points: 10,
    earned: 10,
  });

  // Keywords / description quality
  checks.push({
    label: "Keywords set",
    points: 10,
    earned: page.metaKeywords?.trim() ? 10 : page.metaDescription?.trim() ? 5 : 0,
    tip: !page.metaKeywords?.trim()
      ? page.metaDescription?.trim()
        ? "Add meta keywords for full score"
        : "Add meta description and keywords"
      : undefined,
  });

  // Structured data enabled
  checks.push({
    label: "Structured data enabled",
    points: 10,
    earned: config.structuredData.enabled ? 10 : 0,
    tip: !config.structuredData.enabled
      ? "Enable structured data in the Schema tab"
      : undefined,
  });

  const score = checks.reduce((s, c) => s + c.earned, 0);
  return { slug: page.slug, title: page.title, score, checks };
}

function scoreBadge(score: number) {
  if (score >= 80) return <span className="badge bg-success fs-6">{score}</span>;
  if (score >= 50) return <span className="badge bg-warning text-dark fs-6">{score}</span>;
  return <span className="badge bg-danger fs-6">{score}</span>;
}

export default function ScorecardTab({ config }: Props) {
  const [pages, setPages] = useState<PageData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pages")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.data?.pages) setPages(data.data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-5"><span className="spinner-border text-primary" /></div>;
  }

  if (!pages?.length) {
    return <div className="text-center py-5 text-muted">No pages found.</div>;
  }

  const scored = pages.map((p) => scorePage(p, config));
  const avg = Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length);
  const quickWins = [...scored].sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <div>
      {/* Site-wide average */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4">
            <div className="mb-1">{scoreBadge(avg)}</div>
            <div className="small text-muted mt-2">Site Average Score</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4">
            <div className="h3 fw-bold mb-0 text-success">{scored.filter(p => p.score >= 80).length}</div>
            <div className="small text-muted">Pages scoring 80+</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4">
            <div className="h3 fw-bold mb-0 text-danger">{scored.filter(p => p.score < 50).length}</div>
            <div className="small text-muted">Pages scoring below 50</div>
          </div>
        </div>
      </div>

      {/* Quick wins */}
      {quickWins.some(p => p.score < 80) && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent border-bottom py-3">
            <h6 className="mb-0 fw-semibold">
              <i className="bi bi-lightning-fill text-warning me-2" />
              Top 3 Quick Wins
            </h6>
          </div>
          <div className="list-group list-group-flush">
            {quickWins.filter(p => p.score < 80).map((p) => {
              const topMiss = p.checks.find((c) => c.earned < c.points);
              return (
                <div key={p.slug} className="list-group-item d-flex align-items-center justify-content-between py-3 px-4">
                  <div>
                    <div className="fw-medium">{p.title}</div>
                    {topMiss && (
                      <div className="small text-muted">
                        <i className="bi bi-arrow-right me-1" />
                        {topMiss.tip || `Missing: ${topMiss.label}`}
                      </div>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {scoreBadge(p.score)}
                    <a
                      href={`/admin/content/pages?seo=${p.slug}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Fix
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score rubric */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-transparent border-bottom py-3">
          <h6 className="mb-0 fw-semibold"><i className="bi bi-info-circle me-2" />Score Breakdown</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Check</th>
                <th className="text-end pe-4">Max Points</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Meta title set (10–60 chars)", 20],
                ["Meta description set (50–155 chars)", 20],
                ["OG image set", 15],
                ["Canonical URL resolves", 15],
                ["Not noindex", 10],
                ["Keywords set", 10],
                ["Structured data enabled", 10],
              ].map(([label, pts]) => (
                <tr key={label as string}>
                  <td className="ps-4 small">{label}</td>
                  <td className="text-end pe-4 small fw-semibold">{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-page scores */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-bottom py-3">
          <h6 className="mb-0 fw-semibold"><i className="bi bi-list-check me-2" />All Pages</h6>
        </div>
        <div className="list-group list-group-flush">
          {[...scored].sort((a, b) => a.score - b.score).map((p) => (
            <div key={p.slug}>
              <div
                className="list-group-item d-flex align-items-center justify-content-between py-3 px-4"
                style={{ cursor: "pointer" }}
                onClick={() => setExpanded(expanded === p.slug ? null : p.slug)}
              >
                <div>
                  <div className="fw-medium">{p.title}</div>
                  <div className="small text-muted font-monospace">/{p.slug}</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  {scoreBadge(p.score)}
                  <i className={`bi bi-chevron-${expanded === p.slug ? "up" : "down"} text-muted`} />
                </div>
              </div>

              {expanded === p.slug && (
                <div className="px-4 pb-3 pt-1">
                  <div className="row g-2">
                    {p.checks.map((c) => (
                      <div key={c.label} className="col-12">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${c.earned === c.points ? "bi-check-circle-fill text-success" : c.earned > 0 ? "bi-exclamation-circle-fill text-warning" : "bi-x-circle-fill text-danger"}`} />
                          <span className="small flex-grow-1">{c.label}</span>
                          <span className="small text-muted">{c.earned}/{c.points}pts</span>
                        </div>
                        {c.tip && (
                          <div className="small text-muted ms-4 ps-1">{c.tip}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <a
                      href={`/admin/content/pages?seo=${p.slug}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      <i className="bi bi-pencil me-1" />Edit SEO for this page
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
