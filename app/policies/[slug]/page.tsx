import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import prisma from "@/lib/prisma";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import { getPlugin } from "@/lib/plugins/registry";
import PageClient from "@/app/[slug]/PageClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Fetch an enabled policy only when the Policies plugin is enabled. */
async function getEnabledPolicy(slug: string) {
  const plugin = await getPlugin("policies");
  if (!plugin || !plugin.enabled) return null;
  const policy = await prisma.policy.findUnique({
    where: { slug },
    include: { linkedPage: { select: { slug: true, enabled: true } } },
  });
  if (!policy || !policy.enabled) return null;
  return policy;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [seoConfig, policy] = await Promise.all([fetchSeoConfig(), getEnabledPolicy(slug)]);
  if (!policy) return buildMetadata(null, seoConfig);
  return buildMetadata(
    {
      title: policy.title,
      metaTitle: policy.metaTitle,
      metaDescription: policy.metaDescription,
      noindex: policy.noindex,
      slug: `policies/${policy.slug}`,
    },
    seoConfig
  );
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = await getEnabledPolicy(slug);
  if (!policy) notFound();

  // Page mode: the policy is an alias for an existing Page's own content (full
  // sections, designer canvas, etc.) — rendered exactly as that Page renders at
  // its own URL, no reading-column wrapper here (sections are full-bleed/100vh
  // and would be broken by one). The Policy still owns the URL, footer listing,
  // and SEO meta (see generateMetadata above); the Page supplies 100% of the
  // visual content, including its own heading — no separate <h1> here to avoid
  // a redundant title stacked above the Page's own hero/heading.
  if (policy.docType === "page") {
    if (!policy.linkedPage || !policy.linkedPage.enabled) {
      return (
        <main className="container pb-5" style={{ maxWidth: 820, paddingTop: "var(--navbar-height, 100px)" }}>
          <p className="text-muted">This content is not currently available.</p>
        </main>
      );
    }
    return <PageClient params={Promise.resolve({ slug: policy.linkedPage.slug })} />;
  }

  // PDF mode: the policy IS the uploaded file. `body` is optional here — an
  // admin-authored intro/summary (same rich-text editor as HTML mode) rendered
  // in the left column above the embed; a doc-card in the right column gives
  // view/download actions. Sonic-branded via .policy-pdf-page (see globals.css)
  // instead of the old bare Bootstrap container.
  if (policy.docType === "pdf" && policy.pdfUrl) {
    const safeIntro = DOMPurify.sanitize(policy.body || "");
    return (
      <main className="policy-pdf-page">
        <div className="container pb-5" style={{ maxWidth: 1040, paddingTop: "var(--navbar-height, 100px)" }}>
          {policy.navLabel && <span className="eyebrow d-block mb-2">{policy.navLabel}</span>}
          <h1 className="fw-bold mb-4">{policy.title}</h1>
          <div className="row g-4">
            <div className={safeIntro ? "col-lg-8" : "col-12"}>
              {safeIntro && (
                <div
                  className="policy-pdf-intro mb-2"
                  // Safe: body is sanitized on save AND again here with DOMPurify.
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: safeIntro }}
                />
              )}
            </div>
            <div className={safeIntro ? "col-lg-4" : "col-12"}>
              <div className="doc-card d-flex flex-column gap-2">
                <h3 className="h6 fw-bold mb-1">{policy.title}</h3>
                <a href={policy.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  Download PDF
                </a>
                <a href={`#pdf-preview`} className="btn btn-outline-secondary btn-sm">
                  View below
                </a>
              </div>
            </div>
          </div>
          <div id="pdf-preview" className="mt-4">
            <iframe
              src={policy.pdfUrl}
              title={policy.title}
              style={{ width: "100%", height: "85vh", border: "1px solid #e5e7eb", borderRadius: 8 }}
            />
            <p className="text-muted small mt-2">
              Can&apos;t see the document above?{" "}
              <a href={policy.pdfUrl} target="_blank" rel="noopener noreferrer">Open the PDF directly</a>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const safeBody = DOMPurify.sanitize(policy.body || "");

  return (
    <main className="container pb-5" style={{ maxWidth: 820, paddingTop: "var(--navbar-height, 100px)" }}>
      <article>
        <h1 className="fw-bold mb-4">{policy.title}</h1>
        <div
          className="policy-body"
          style={{ lineHeight: 1.7 }}
          // Safe: body is sanitized on save AND again here with DOMPurify.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: safeBody }}
        />
      </article>
    </main>
  );
}
