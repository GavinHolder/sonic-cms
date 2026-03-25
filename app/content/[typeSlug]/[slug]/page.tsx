/**
 * Public detail page for a single content entry.
 * Renders /blog/my-post, /team/john-doe — whatever content types are configured.
 */

import { notFound } from "next/navigation";
import { getPublishedEntry, getPublishedEntries } from "@/lib/content-types";
import { buildMetadata } from "@/lib/metadata-generator";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ typeSlug: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { typeSlug, slug } = await params;
  const [result, seoConfig] = await Promise.all([
    getPublishedEntry(typeSlug, slug),
    import('@/lib/metadata-generator').then(m => m.fetchSeoConfig()),
  ]);
  if (!result) return {};
  return buildMetadata(
    { title: result.entry.title, metaDescription: result.entry.excerpt || undefined, ogImage: result.entry.coverImage || undefined },
    seoConfig
  );
}

export default async function ContentDetailPage({ params }: Props) {
  const { typeSlug, slug } = await params;
  const result = await getPublishedEntry(typeSlug, slug);
  if (!result) notFound();

  const { contentType, entry } = result;
  const data = entry.data as Record<string, unknown>;

  // Calculate reading time from richtext fields
  const allText = contentType.fields
    .filter(f => f.fieldType === "richtext")
    .map(f => String(data[f.slug] || ""))
    .join(" ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Get related entries (same type, different entry, limit 3)
  const related = await getPublishedEntries(typeSlug, { page: 1, limit: 4 });
  const relatedEntries = (related?.entries || []).filter(e => e.id !== entry.id).slice(0, 3);

  return (
    <div style={{ paddingTop: "var(--navbar-height, 100px)" }}>
      {/* Hero / Cover Image */}
      {entry.coverImage && (
        <div style={{ position: "relative", height: 400, background: "var(--cms-surface)" }}>
          <Image
            src={entry.coverImage}
            alt={entry.title}
            fill
            style={{ objectFit: "cover" }}
            priority
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.6))" }} />
        </div>
      )}

      <div className="container py-5" style={{ maxWidth: 800 }}>
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb" style={{ fontSize: 13 }}>
            <li className="breadcrumb-item">
              <Link href={`/content/${typeSlug}`} style={{ color: "var(--cms-primary)" }}>
                {contentType.pluralName}
              </Link>
            </li>
            <li className="breadcrumb-item active">{entry.title}</li>
          </ol>
        </nav>

        {/* Title */}
        <h1 className="mb-3" style={{ fontFamily: "var(--cms-heading-font)", color: "var(--cms-text)", fontSize: "2.5rem", lineHeight: 1.2 }}>
          {entry.title}
        </h1>

        {/* Meta */}
        <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom" style={{ color: "var(--cms-text-muted)", fontSize: 14 }}>
          {entry.author.firstName && (
            <span>By {entry.author.firstName} {entry.author.lastName}</span>
          )}
          {entry.publishedAt && (
            <span>{new Date(entry.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          )}
          {wordCount > 50 && <span>{readingTime} min read</span>}
        </div>

        {/* Excerpt */}
        {entry.excerpt && (
          <p className="lead mb-4" style={{ color: "var(--cms-text-muted)", fontStyle: "italic" }}>
            {entry.excerpt}
          </p>
        )}

        {/* Content fields */}
        <article style={{ fontFamily: "var(--cms-body-font)", color: "var(--cms-text)", lineHeight: 1.8, fontSize: "1.1rem" }}>
          {contentType.fields.map(field => {
            const value = data[field.slug];
            if (!value) return null;

            switch (field.fieldType) {
              case "richtext":
                return (
                  <div key={field.id} className="mb-4" style={{ whiteSpace: "pre-wrap" }}>
                    {String(value)}
                  </div>
                );
              case "image":
                return (
                  <div key={field.id} className="mb-4">
                    <Image
                      src={String(value)}
                      alt={field.name}
                      width={800}
                      height={450}
                      style={{ width: "100%", height: "auto", borderRadius: "var(--cms-radius-lg)", objectFit: "cover" }}
                    />
                    <small className="d-block text-center mt-1" style={{ color: "var(--cms-neutral)" }}>{field.name}</small>
                  </div>
                );
              case "text":
              case "url":
                return (
                  <div key={field.id} className="mb-3">
                    <strong style={{ color: "var(--cms-text)" }}>{field.name}:</strong>{" "}
                    {field.fieldType === "url" ? (
                      <a href={String(value)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cms-primary)" }}>{String(value)}</a>
                    ) : (
                      <span>{String(value)}</span>
                    )}
                  </div>
                );
              default:
                return null;
            }
          })}
        </article>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="d-flex gap-2 flex-wrap mt-4 pt-3 border-top">
            {entry.tags.map(tag => (
              <Link
                key={tag}
                href={`/content/${typeSlug}?tag=${encodeURIComponent(tag)}`}
                className="badge text-decoration-none"
                style={{ background: "var(--cms-surface)", color: "var(--cms-primary)", fontSize: 12, padding: "6px 12px" }}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Related */}
        {relatedEntries.length > 0 && (
          <div className="mt-5 pt-4 border-top">
            <h4 style={{ fontFamily: "var(--cms-heading-font)" }}>More {contentType.pluralName}</h4>
            <div className="row g-3 mt-2">
              {relatedEntries.map(re => (
                <div key={re.id} className="col-md-4">
                  <Link href={`/content/${typeSlug}/${re.slug}`} className="text-decoration-none">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: "var(--cms-radius)" }}>
                      {re.coverImage && (
                        <div style={{ position: "relative", height: 120 }}>
                          <Image src={re.coverImage} alt={re.title} fill style={{ objectFit: "cover", borderRadius: "var(--cms-radius) var(--cms-radius) 0 0" }} />
                        </div>
                      )}
                      <div className="card-body p-2">
                        <h6 className="mb-0" style={{ color: "var(--cms-text)", fontSize: 14 }}>{re.title}</h6>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
