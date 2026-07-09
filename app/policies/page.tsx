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
    <main className="container py-5" style={{ maxWidth: 820 }}>
      <h1 className="fw-bold mb-4">Policies</h1>
      {policies.length === 0 ? (
        <p className="text-muted">No policies published yet.</p>
      ) : (
        <ul className="list-unstyled">
          {policies.map((p) => (
            <li key={p.id} className="mb-2">
              <Link href={`/policies/${p.slug}`} className="fs-5">
                {p.navLabel || p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
