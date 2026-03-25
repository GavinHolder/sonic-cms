/**
 * Public listing page for content type entries.
 * Renders /blog, /team, /faq — whatever content types are configured.
 */

import { notFound } from "next/navigation";
import { getPublishedEntries } from "@/lib/content-types";
import { buildMetadata } from "@/lib/metadata-generator";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ typeSlug: string }>;
  searchParams: Promise<{ page?: string; tag?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { typeSlug } = await params;
  const [result, seoConfig] = await Promise.all([
    getPublishedEntries(typeSlug, { page: 1, limit: 1 }),
    import('@/lib/metadata-generator').then(m => m.fetchSeoConfig()),
  ]);
  if (!result) return {};
  return buildMetadata(null, {
    ...seoConfig,
    siteName: result.contentType.pluralName,
    defaultDescription: result.contentType.description || `Browse ${result.contentType.pluralName.toLowerCase()}`,
  });
}

export default async function ContentListingPage({ params, searchParams }: Props) {
  const { typeSlug } = await params;
  const { page: pageStr, tag } = await searchParams;
  const page = parseInt(pageStr || "1");

  const result = await getPublishedEntries(typeSlug, { page, limit: 12, tag });
  if (!result) notFound();

  const { contentType, entries, total, totalPages } = result;

  return (
    <div style={{ paddingTop: "var(--navbar-height, 100px)" }}>
      <div className="container py-5" style={{ maxWidth: "var(--cms-container-max, 1320px)" }}>
        {/* Header */}
        <div className="text-center mb-5">
          <h1 style={{ fontFamily: "var(--cms-heading-font)", color: "var(--cms-text)" }}>
            {contentType.pluralName}
          </h1>
          {contentType.description && (
            <p className="lead" style={{ color: "var(--cms-text-muted)" }}>{contentType.description}</p>
          )}
        </div>

        {/* Entries grid */}
        {entries.length === 0 ? (
          <div className="text-center py-5">
            <p style={{ color: "var(--cms-text-muted)" }}>No {contentType.pluralName.toLowerCase()} published yet.</p>
          </div>
        ) : (
          <div className="row g-4">
            {entries.map(entry => (
              <div key={entry.id} className={contentType.listingLayout === "list" ? "col-12" : "col-md-6 col-lg-4"}>
                <Link
                  href={`/content/${typeSlug}/${entry.slug}`}
                  className="text-decoration-none"
                >
                  <div className="card h-100 shadow-sm border-0" style={{ borderRadius: "var(--cms-radius-lg, 16px)", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}>
                    {entry.coverImage && (
                      <div style={{ position: "relative", height: 200 }}>
                        <Image
                          src={entry.coverImage}
                          alt={entry.title}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <div className="card-body">
                      <h5 className="card-title" style={{ fontFamily: "var(--cms-heading-font)", color: "var(--cms-text)" }}>
                        {entry.title}
                      </h5>
                      {entry.excerpt && (
                        <p className="card-text" style={{ color: "var(--cms-text-muted)", fontSize: 14 }}>
                          {entry.excerpt}
                        </p>
                      )}
                      <div className="d-flex align-items-center gap-2 mt-2">
                        {entry.publishedAt && (
                          <small style={{ color: "var(--cms-neutral)" }}>
                            {new Date(entry.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </small>
                        )}
                        {entry.tags.length > 0 && (
                          <div className="d-flex gap-1 flex-wrap">
                            {entry.tags.slice(0, 3).map(t => (
                              <span key={t} className="badge" style={{ background: "var(--cms-surface)", color: "var(--cms-primary)", fontSize: 11 }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="d-flex justify-content-center mt-5">
            <ul className="pagination">
              {page > 1 && (
                <li className="page-item">
                  <Link href={`/content/${typeSlug}?page=${page - 1}${tag ? `&tag=${tag}` : ""}`} className="page-link">Previous</Link>
                </li>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                  <Link href={`/content/${typeSlug}?page=${p}${tag ? `&tag=${tag}` : ""}`} className="page-link">{p}</Link>
                </li>
              ))}
              {page < totalPages && (
                <li className="page-item">
                  <Link href={`/content/${typeSlug}?page=${page + 1}${tag ? `&tag=${tag}` : ""}`} className="page-link">Next</Link>
                </li>
              )}
            </ul>
          </nav>
        )}

        <div className="text-center mt-3">
          <small style={{ color: "var(--cms-neutral)" }}>{total} {total === 1 ? contentType.name.toLowerCase() : contentType.pluralName.toLowerCase()}</small>
        </div>
      </div>
    </div>
  );
}
