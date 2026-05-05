/**
 * Universal CMS site data — available server-side and as window.__CMS_SITE on all public pages.
 *
 * Template variables (replaced server-side in standalone pages, client-side in HTML blocks):
 *   {{cms.logo}}       logoUrl
 *   {{cms.company}}    companyName
 *   {{cms.tagline}}    tagline
 *   {{cms.phone}}      phone
 *   {{cms.email}}      email
 *   {{cms.address}}    address
 *   {{cms.city}}       city
 *   {{cms.postal}}     postalCode
 *   {{cms.country}}    country
 *   {{cms.copyright}}  copyrightText
 *   {{cms.facebook}}   facebook
 *   {{cms.instagram}}  instagram
 *   {{cms.twitter}}    twitter
 *   {{cms.linkedin}}   linkedin
 *   {{cms.youtube}}    youtube
 *   {{cms.tiktok}}     tiktok
 *
 * JS access (any page):
 *   window.__CMS_SITE.logoUrl
 *   window.__CMS_SITE.navLinks  → [{ type, id, label, href?, navOrder }]
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
}

const EMPTY: CmsSiteData = {
  logoUrl: "", companyName: "", tagline: "", phone: "", email: "",
  address: "", city: "", postalCode: "", country: "", copyrightText: "",
  facebook: "", instagram: "", twitter: "", linkedin: "", youtube: "", tiktok: "",
  navLinks: [],
};

export async function getCmsSiteData(): Promise<CmsSiteData> {
  try {
    const [config, sections, pages] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: "singleton" } }),
      prisma.section.findMany({
        where: { showOnNavbar: true, enabled: true },
        select: { id: true, navLabel: true, displayName: true, navOrder: true },
      }),
      prisma.page.findMany({
        where: { showOnNavbar: true, enabled: true },
        select: { id: true, slug: true, title: true, navLabel: true, navOrder: true },
      }),
    ]);

    const navLinks: CmsSiteNavLink[] = [
      ...sections.map(s => ({
        type: "section" as const,
        id: s.id,
        label: s.navLabel || s.displayName || "",
        navOrder: s.navOrder ?? 999,
      })),
      ...pages.map(p => ({
        type: "page" as const,
        id: p.id,
        label: p.navLabel || p.title,
        href: `/${p.slug}`,
        navOrder: p.navOrder ?? 999,
      })),
    ].sort((a, b) => a.navOrder - b.navOrder);

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
    };
  } catch {
    return EMPTY;
  }
}

// ── Template variable replacement ──────────────────────────────────────────

const VAR_MAP: Array<[RegExp, keyof Omit<CmsSiteData, "navLinks">]> = [
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
    result = result.replace(regex, (data[key] as string) ?? "");
  }
  return result;
}

/** Client-side replacement — reads window.__CMS_SITE automatically */
export function replaceCmsVarsClient(html: string): string {
  if (typeof window === "undefined") return html;
  const d = (window as any).__CMS_SITE as CmsSiteData | undefined;
  if (!d) return html;
  return replaceCmsVars(html, d);
}

/** Safe JSON string for inline script injection — escapes </script> */
export function cmsSiteDataScript(data: CmsSiteData): string {
  return `window.__CMS_SITE=${JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>")};`;
}
