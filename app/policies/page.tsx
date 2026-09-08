import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import { getPlugin } from "@/lib/plugins/registry";

export const dynamic = "force-dynamic";

async function getEnabledPolicies() {
  const plugin = await getPlugin("policies");
  if (!plugin || !plugin.enabled) return null;
  return prisma.policy.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { id: true, slug: true, title: true, navLabel: true },
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata({ title: "Policies", slug: "policies" }, seoConfig);
}

export default async function PoliciesIndexPage() {
  const policies = await getEnabledPolicies();
  if (!policies) notFound();

  return (
    <main className="policy-pdf-page">
      <div className="container pb-5" style={{ maxWidth: 820, paddingTop: "var(--navbar-height, 100px)" }}>
        <span className="eyebrow d-block mb-2">Legal &amp; Compliance</span>
        <h1 className="fw-bold mb-4">Policies</h1>
        {policies.length === 0 ? (
          <p className="text-muted">No policies published yet.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {policies.map((p) => (
              <Link
                key={p.id}
                href={`/policies/${p.slug}`}
                className="doc-card d-flex align-items-center justify-content-between text-decoration-none"
                style={{ color: "#1f2937" }}
              >
                <span className="fw-semibold fs-5">{p.navLabel || p.title}</span>
                <i className="bi bi-arrow-right" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
