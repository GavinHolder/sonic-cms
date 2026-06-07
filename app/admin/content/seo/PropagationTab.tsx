"use client";

import { useState, useEffect } from "react";

interface PropPage {
  slug: string;
  title: string;
  updatedAt: string;
  status: string;
  enabled: boolean;
}

interface Props {
  canonicalBase: string;
}

// Neutral wording only — this is derived purely from updatedAt and says nothing
// about whether Google has actually indexed the page. Real index status comes
// from the Search Console tab (GSC URL inspection).
function indexStatus(updatedAt: string): { label: string; color: string } {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000;
  if (daysSince < 14) return { label: "Recently updated — verify in Search Console", color: "info" };
  return               { label: "Verify in Search Console",                          color: "secondary" };
}

export default function PropagationTab({ canonicalBase }: Props) {
  const [pages, setPages] = useState<PropPage[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pages?status=PUBLISHED")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.data?.pages) setPages(data.data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sitemapUrl = canonicalBase ? `${canonicalBase}/sitemap.xml` : null;

  return (
    <div>
      {/* Info banner */}
      <div className="alert alert-info d-flex gap-3 align-items-start mb-4">
        <i className="bi bi-clock-history fs-5 flex-shrink-0 mt-1" />
        <div>
          <strong>Google indexing is not instant.</strong> After publishing a page, it typically
          appears in search results within <strong>4–14 days</strong> of sitemap submission.
          Use the Google tab to verify indexing and request faster discovery via Search Console.
        </div>
      </div>

      {/* Actions row */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {sitemapUrl && (
          <a
            href={sitemapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="bi bi-file-earmark-code me-1" />View Sitemap
          </a>
        )}
      </div>

      {/* Note */}
      <p className="text-muted small mb-3">
        Submit your sitemap in <strong>Google Search Console</strong> — automatic sitemap
        pinging is no longer supported by Google (the ping endpoint was retired in June 2023).
        New pages typically appear in Google within 4–14 days of sitemap submission.
        Use <strong>Request Indexing</strong> in Search Console to speed up discovery.
      </p>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border text-primary" />
        </div>
      ) : !pages?.length ? (
        <div className="text-center py-5 text-muted">No published pages found.</div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Page</th>
                  <th>In Sitemap</th>
                  <th>Last Modified</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => {
                  const { label, color } = indexStatus(page.updatedAt);
                  const pageUrl = canonicalBase ? `${canonicalBase}/${page.slug}` : `/${page.slug}`;
                  const gscUrl = canonicalBase
                    ? `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(canonicalBase)}&item_url=${encodeURIComponent(pageUrl)}`
                    : null;
                  return (
                    <tr key={page.slug}>
                      <td className="ps-4">
                        <div className="fw-medium">{page.title}</div>
                        <div className="small text-muted font-monospace">/{page.slug}</div>
                      </td>
                      <td>
                        <span className="badge bg-success">Yes</span>
                      </td>
                      <td className="small text-muted">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge bg-${color} ${color === "info" ? "text-dark" : ""}`}>
                          {label}
                        </span>
                      </td>
                      <td>
                        {gscUrl ? (
                          <a
                            href={gscUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-secondary btn-sm"
                          >
                            <i className="bi bi-google me-1" />Request Indexing
                          </a>
                        ) : (
                          <span className="text-muted small">Set canonical base first</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
