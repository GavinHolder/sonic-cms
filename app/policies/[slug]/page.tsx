import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import prisma from "@/lib/prisma";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import { getPlugin } from "@/lib/plugins/registry";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Fetch an enabled policy only when the Policies plugin is enabled. */
async function getEnabledPolicy(slug: string) {
  const plugin = await getPlugin("policies");
  if (!plugin || !plugin.enabled) return null;
  const policy = await prisma.policy.findUnique({ where: { slug } });
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

  const safeBody = DOMPurify.sanitize(policy.body || "");

  return (
    <main className="container py-5" style={{ maxWidth: 820 }}>
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
