/**
 * Universal CMS site data — available server-side and as window.__CMS_SITE on all public pages.
 *
 * Template variables (replaced server-side in standalone pages, client-side in HTML blocks):
 *   {{cms.logo}}              logoUrl
 *   {{cms.company}}           companyName
 *   {{cms.tagline}}           tagline
 *   {{cms.phone}}             phone
 *   {{cms.email}}             email
 *   {{cms.address}}           address
 *   {{cms.city}}              city
 *   {{cms.postal}}            postalCode
 *   {{cms.country}}           country
 *   {{cms.copyright}}         copyrightText
 *   {{cms.facebook}}          facebook
 *   {{cms.instagram}}         instagram
 *   {{cms.twitter}}           twitter
 *   {{cms.linkedin}}          linkedin
 *   {{cms.youtube}}           youtube
 *   {{cms.tiktok}}            tiktok
 *   {{cms.pages.SLUG}}        URL of any enabled+published page (e.g. "/about"), or "#" if not found
 *   {{cms.features.SLUG}}     "true"/"false" — whether a client feature is enabled
 *   {{cms.media.SLOTNAME}}    URL from a page-level media slot (replaced in standalone renderer)
 *   {{cms.form.SLUG}}         Injected CMS form HTML (replaced in standalone renderer)
 *
 * JS access (any page):
 *   window.__CMS_SITE.logoUrl
 *   window.__CMS_SITE.navLinks  → [{ type, id, label, href?, navOrder }]
 *   window.__CMS_SITE.pages     → { slug: "/slug", ... }
 *   window.__CMS_SITE.features  → { slug: true/false, ... }
 */

import prisma from "@/lib/prisma";

export interface CmsSiteNavLink {
  type: "section" | "page";
  id: string;
  label: string;
  href?: string;
  navOrder: number;
}

export interface CmsSiteData {
  logoUrl: string;
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  copyrightText: string;
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  navLinks: CmsSiteNavLink[];
  pages: Record<string, string>;
  features: Record<string, boolean>;
}

const EMPTY: CmsSiteData = {
  logoUrl: "", companyName: "", tagline: "", phone: "", email: "",
  address: "", city: "", postalCode: "", country: "", copyrightText: "",
  facebook: "", instagram: "", twitter: "", linkedin: "", youtube: "", tiktok: "",
  navLinks: [],
  pages: {},
  features: {},
};

export async function getCmsSiteData(): Promise<CmsSiteData> {
  try {
    const [config, sections, navPages, allPages, allFeatures] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: "singleton" } }),
      prisma.section.findMany({
        where: { showOnNavbar: true, enabled: true },
        select: { id: true, navLabel: true, displayName: true, navOrder: true },
      }),
      prisma.page.findMany({
        where: { showOnNavbar: true, enabled: true },
        select: { id: true, slug: true, title: true, navLabel: true, navOrder: true },
      }),
      prisma.page.findMany({
        where: { enabled: true, status: "PUBLISHED" },
        select: { slug: true },
      }),
      prisma.clientFeature.findMany({
        select: { slug: true, enabled: true },
      }),
    ]);

    const navLinks: CmsSiteNavLink[] = [
      ...sections.map(s => ({
        type: "section" as const,
        id: s.id,
        label: s.navLabel || s.displayName || "",
        navOrder: s.navOrder ?? 999,
      })),
      ...navPages.map(p => ({
        type: "page" as const,
        id: p.id,
        label: p.navLabel || p.title,
        href: `/${p.slug}`,
        navOrder: p.navOrder ?? 999,
      })),
    ].sort((a, b) => a.navOrder - b.navOrder);

    const pages: Record<string, string> = {};
    for (const p of allPages) {
      pages[p.slug] = `/${p.slug}`;
    }

    const features: Record<string, boolean> = {};
    for (const f of allFeatures) {
      features[f.slug] = f.enabled;
    }

    return {
      logoUrl:       config?.logoUrl       ?? "",
      companyName:   config?.companyName   ?? "",
      tagline:       config?.tagline       ?? "",
      phone:         config?.phone         ?? "",
      email:         config?.email         ?? "",
      address:       config?.address       ?? "",
      city:          config?.city          ?? "",
      postalCode:    config?.postalCode    ?? "",
      country:       config?.country       ?? "",
      copyrightText: config?.copyrightText ?? "",
      facebook:      config?.facebook      ?? "",
      instagram:     config?.instagram     ?? "",
      twitter:       config?.twitter       ?? "",
      linkedin:      config?.linkedin      ?? "",
      youtube:       config?.youtube       ?? "",
      tiktok:        config?.tiktok        ?? "",
      navLinks,
      pages,
      features,
    };
  } catch {
    return EMPTY;
  }
}

// ── Template variable replacement ──────────────────────────────────────────

type StringKey = keyof Pick<CmsSiteData,
  "logoUrl" | "companyName" | "tagline" | "phone" | "email" | "address" |
  "city" | "postalCode" | "country" | "copyrightText" | "facebook" |
  "instagram" | "twitter" | "linkedin" | "youtube" | "tiktok"
>;

const VAR_MAP: Array<[RegExp, StringKey]> = [
  [/\{\{cms\.logo\}\}/g,      "logoUrl"],
  [/\{\{cms\.company\}\}/g,   "companyName"],
  [/\{\{cms\.tagline\}\}/g,   "tagline"],
  [/\{\{cms\.phone\}\}/g,     "phone"],
  [/\{\{cms\.email\}\}/g,     "email"],
  [/\{\{cms\.address\}\}/g,   "address"],
  [/\{\{cms\.city\}\}/g,      "city"],
  [/\{\{cms\.postal\}\}/g,    "postalCode"],
  [/\{\{cms\.country\}\}/g,   "country"],
  [/\{\{cms\.copyright\}\}/g, "copyrightText"],
  [/\{\{cms\.facebook\}\}/g,  "facebook"],
  [/\{\{cms\.instagram\}\}/g, "instagram"],
  [/\{\{cms\.twitter\}\}/g,   "twitter"],
  [/\{\{cms\.linkedin\}\}/g,  "linkedin"],
  [/\{\{cms\.youtube\}\}/g,   "youtube"],
  [/\{\{cms\.tiktok\}\}/g,    "tiktok"],
];

/** Server-side replacement — pass fetched CmsSiteData */
export function replaceCmsVars(html: string, data: CmsSiteData): string {
  let result = html;
  for (const [regex, key] of VAR_MAP) {
    result = result.replace(regex, data[key] ?? "");
  }
  // Dynamic page URLs: {{cms.pages.slug}}
  result = result.replace(/\{\{cms\.pages\.([a-z0-9-]+)\}\}/g, (_, s) => data.pages[s] ?? "#");
  // Feature flags: {{cms.features.slug}}
  result = result.replace(/\{\{cms\.features\.([a-z0-9_-]+)\}\}/g, (_, s) => String(data.features[s] ?? false));
  return result;
}

/** Client-side replacement — reads window.__CMS_SITE automatically */
export function replaceCmsVarsClient(html: string): string {
  if (typeof window === "undefined") return html;
  const d = (window as Window & { __CMS_SITE?: CmsSiteData }).__CMS_SITE;
  if (!d) return html;
  return replaceCmsVars(html, d);
}

/** Safe JSON string for inline script injection — escapes </script> */
export function cmsSiteDataScript(data: CmsSiteData): string {
  return `window.__CMS_SITE=${JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>")};`;
}
