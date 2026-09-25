/**
 * Link destinations catalog — the ONE server-side source of "everything a button/link can point at".
 *
 * Every place an admin picks a link destination (Flexible Designer, section editors, footer,
 * hero slides, …) reads this catalog through `GET /api/link-destinations`, so a new page,
 * section, policy, gallery, plugin route or media file shows up in every picker automatically.
 *
 * Two layers, kept apart so the decision logic is unit-testable without a database:
 *   1. `buildCatalog(rows, opts)` — PURE. Rows in, grouped catalog out.
 *   2. `loadCatalogRows(db)` / `loadCatalog(db, opts)` / `searchMedia(db, params)` — thin Prisma loaders
 *      that take the client as an argument (type-only import) so this file has no runtime DB dependency.
 *
 * INVARIANTS:
 *   1. An item is offered as SELECTABLE only if the public route it points at would actually serve it
 *      (the SAME gate the route enforces — see FEATURE_ROUTES / the page/policy/gallery rules below).
 *      Anything that exists but would 404 is returned with `disabled: true` + a label suffix, NEVER
 *      dropped, so an already-saved value still preselects in the picker.
 *   2. `value` is exactly what gets persisted into the section/page JSON: '/slug', '#<sectionId>',
 *      '/slug#<sectionId>', '/policies/<slug>', … — no sentinels, no client-only tokens.
 *   3. Empty groups are omitted (except "builtin").
 *
 * ASSUMPTIONS:
 *   1. `Page.type` arrives as the Prisma enum string (LANDING | TAB_PAGE | FULL_PAGE | FORM | PDF |
 *      DESIGNER | STANDALONE | GALLERY). app/[slug]/PageClient.tsx routes full/pdf/form/designer/standalone.
 *   2. Two enable sources exist and can disagree: `ClientFeature.enabled` (gates /coverage, /calculator)
 *      and `Plugin.enabled` (gates /policies*). Each route is gated by the source ITS page checks.
 *   3. The homepage is the Page with slug "/" (landing page) — it is offered as the built-in Home.
 *
 * FAILURE MODES:
 *   - One source table unreadable      -> that group is empty, the rest of the catalog still builds (loader logs).
 *   - Page deleted after value saved   -> value no longer in the catalog; the client shows it as Custom URL.
 *   - Two feature sources disagree     -> the route's own gate wins (see FEATURE_ROUTES).
 *   - Huge sites (thousands of entries)-> content entries are capped (MAX_CONTENT_ENTRIES); media is paginated.
 */
import type { Prisma, PrismaClient } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LinkItem {
  /** Group id this item belongs to (matches LinkGroup.id). */
  group: string;
  /** Display label. Carries a suffix such as " (disabled)" when `disabled` is true. */
  label: string;
  /** The exact string persisted into the link field. */
  value: string;
  /** Exists but would not currently resolve on the public site. Still returned so saved values preselect. */
  disabled?: boolean;
  /** Secondary text (usually the URL path). */
  hint?: string;
  /** Other stored values that must preselect THIS item (e.g. the legacy "#<id>" form of a section link). */
  alts?: string[];
}

export interface LinkGroup {
  id: string;
  label: string;
  items: LinkItem[];
}

export interface LinkCatalog {
  groups: LinkGroup[];
  meta: {
    /** Prefix of uploaded-media URLs (lets clients recognise a stored media link). Ends with "/". */
    mediaPrefix: string;
    /** The page slug ("/" = home) the picker is editing, when supplied. */
    currentPage: string | null;
    /** True when a group was cut at its cap. */
    truncated: boolean;
  };
}

export interface PageRow {
  slug: string;
  title: string;
  type: string;
  enabled: boolean;
  status: string;
}

export interface SectionRow {
  id: string;
  type?: string | null;
  displayName?: string | null;
  navLabel?: string | null;
  enabled: boolean;
  order: number;
  page: { slug: string; title: string; type: string; enabled: boolean };
}

export interface FlagRow {
  slug: string;
  enabled: boolean;
}

export interface PolicyRow {
  slug: string;
  title: string;
  navLabel?: string | null;
  enabled: boolean;
  order: number;
}

export interface GalleryRow {
  slug: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface ContentTypeRow {
  slug: string;
  name: string;
  pluralName: string;
  hasPublicListing: boolean;
  hasPublicDetail: boolean;
}

export interface ContentEntryRow {
  typeSlug: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: Date | string | null;
}

export interface CatalogRows {
  pages: PageRow[];
  sections: SectionRow[];
  /** Plugin table (gates /policies*). */
  plugins: FlagRow[];
  /** ClientFeature table (gates /coverage and /calculator). */
  clientFeatures: FlagRow[];
  policies: PolicyRow[];
  galleryCategories: GalleryRow[];
  contentTypes: ContentTypeRow[];
  contentEntries: ContentEntryRow[];
}

export interface CatalogOptions {
  /** Slug of the page being edited ("/" = home). Its sections get the in-page "#id" form. */
  currentPage?: string | null;
  /** Clock override for tests (scheduled content entries). */
  now?: Date;
  /** Media URL prefix; defaults to process.env.MEDIA_URL or "/uploads". */
  mediaPrefix?: string;
}

// ── Route gates (the ONE table of plugin/feature public routes) ─────────────

/**
 * Which flag table a public route actually consults:
 *   clientFeature -> prisma.clientFeature.findUnique({slug}).enabled   (app/coverage/page.tsx, app/calculator/page.tsx)
 *   plugin        -> getPlugin(slug).enabled                            (app/policies/**)
 */
export type GateSource = "clientFeature" | "plugin";

export interface FeatureRoute {
  /** Manifest id in lib/plugins/manifests.ts. */
  id: string;
  label: string;
  path: string;
  gate: { source: GateSource; slug: string };
}

export const FEATURE_ROUTES: readonly FeatureRoute[] = [
  { id: "coverage-maps", label: "Coverage Map", path: "/coverage", gate: { source: "clientFeature", slug: "coverage-maps" } },
  { id: "concrete-calculator", label: "Concrete Calculator", path: "/calculator", gate: { source: "clientFeature", slug: "concrete-calculator" } },
];

/** Manifest public routes that are deliberately NOT link destinations, with the reason. A unit test forces every
 * manifest public route to be either handled by the catalog or listed here, so new plugin routes cannot be forgotten. */
export const NOT_LINKABLE_PUBLIC_ROUTES: Readonly<Record<string, string>> = {
  "/": "Home is a built-in destination",
  "/[slug]": "Pages are listed from the Page table",
  "/client-login": "Static placeholder page with dead links; not a real destination",
  "/maintenance-preview": "Admin preview of the maintenance page",
  "/volt-preview/[id]": "Admin preview of a Volt design",
  "/content/[typeSlug]": "Listed per content type",
  "/content/[typeSlug]/[slug]": "Listed per published entry",
  "/content/[typeSlug]/feed.xml": "RSS feed, not a page",
  "/policies": "Handled by the Policies group",
  "/policies/[slug]": "Handled by the Policies group",
};

const POLICIES_GATE = { source: "plugin", slug: "policies" } as const;

/** Page types app/[slug]/PageClient.tsx actually renders. landing/tab/gallery fall through to notFound(). */
export const ROUTABLE_PAGE_TYPES: ReadonlySet<string> = new Set(["FULL_PAGE", "FORM", "PDF", "DESIGNER", "STANDALONE"]);
/** Types linkable as soon as they are enabled (they do not use the draft/publish flow). */
const UNGATED_BY_STATUS_TYPES: ReadonlySet<string> = new Set(["FORM", "PDF"]);
/** Page types whose sections render as in-page anchors. */
const SECTION_HOST_PAGE_TYPES: ReadonlySet<string> = new Set(["FULL_PAGE", "LANDING"]);

export const MAX_CONTENT_ENTRIES = 300;

const GROUP_LABELS: Readonly<Record<string, string>> = {
  builtin: "Built-in",
  pages: "Pages",
  forms: "Forms",
  documents: "Documents & PDFs",
  features: "Plugins & Features",
  policies: "Policies",
  galleries: "Galleries",
  content: "Content",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function flagEnabled(rows: readonly FlagRow[], slug: string): boolean {
  // Missing row === disabled: both public gates 404 when the row does not exist.
  return rows.some((r) => r.slug === slug && r.enabled === true);
}

function gateOpen(rows: CatalogRows, gate: { source: GateSource; slug: string }): boolean {
  return gate.source === "plugin" ? flagEnabled(rows.plugins, gate.slug) : flagEnabled(rows.clientFeatures, gate.slug);
}

function pagePath(slug: string): string {
  if (slug === "/" || slug === "") return "/";
  return slug.startsWith("/") ? slug : `/${slug}`;
}

function withSuffix(label: string, suffix: string | null): string {
  return suffix ? `${label} (${suffix})` : label;
}

function humanizeType(type?: string | null): string {
  if (!type) return "Section";
  const t = type.toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function byLabel(a: LinkItem, b: LinkItem): number {
  return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
}

/** "/" stays "/", everything else is returned without a leading slash ("about"). */
function normalizeCurrentPage(p?: string | null): string | null {
  if (p === undefined || p === null) return null;
  const s = String(p).trim();
  if (!s) return null;
  return pagePath(s) === "/" ? "/" : pagePath(s).slice(1);
}

function isPublishedNow(entry: ContentEntryRow, now: Date): boolean {
  if (entry.status !== "published") return false;
  if (!entry.publishedAt) return false;
  return new Date(entry.publishedAt).getTime() <= now.getTime();
}

// ── buildCatalog (PURE) ────────────────────────────────────────────────────

export function buildCatalog(rows: CatalogRows, opts: CatalogOptions = {}): LinkCatalog {
  const now = opts.now ?? new Date();
  const currentPage = normalizeCurrentPage(opts.currentPage);
  const groups: LinkGroup[] = [];
  let truncated = false;

  const push = (g: LinkGroup) => {
    if (g.id === "builtin" || g.items.length > 0) groups.push(g);
  };

  // Built-in ------------------------------------------------------------
  push({
    id: "builtin",
    label: GROUP_LABELS.builtin,
    items: [
      { group: "builtin", label: "Home", value: "/", hint: "/" },
      { group: "builtin", label: "Back to Top", value: "#top" },
    ],
  });

  // Pages / Forms / Documents -------------------------------------------
  const pageItems: LinkItem[] = [];
  const formItems: LinkItem[] = [];
  const docItems: LinkItem[] = [];
  for (const p of rows.pages) {
    if (p.slug === "/" || p.slug === "") continue; // Home is built-in
    let suffix: string | null = null;
    if (!ROUTABLE_PAGE_TYPES.has(p.type)) suffix = "not linkable";
    else if (!p.enabled) suffix = "disabled";
    else if (!UNGATED_BY_STATUS_TYPES.has(p.type) && p.status !== "PUBLISHED") {
      suffix = p.status === "ARCHIVED" ? "archived" : "draft";
    }
    const target = p.type === "FORM" ? formItems : p.type === "PDF" ? docItems : pageItems;
    const gid = p.type === "FORM" ? "forms" : p.type === "PDF" ? "documents" : "pages";
    const item: LinkItem = {
      group: gid,
      label: withSuffix(p.title || p.slug, suffix),
      value: pagePath(p.slug),
      hint: pagePath(p.slug),
    };
    if (suffix) item.disabled = true;
    target.push(item);
  }
  push({ id: "pages", label: GROUP_LABELS.pages, items: pageItems.sort(byLabel) });

  // Sections (one group per host page; current page first as "This page") -
  const byPage = new Map<string, { page: SectionRow["page"]; sections: SectionRow[] }>();
  for (const s of rows.sections) {
    if (!SECTION_HOST_PAGE_TYPES.has(s.page.type)) continue; // sections on other page kinds are not anchor targets
    const key = s.page.slug;
    const entry = byPage.get(key) ?? { page: s.page, sections: [] };
    entry.sections.push(s);
    byPage.set(key, entry);
  }
  const rankPage = (k: string) => (currentPage !== null && normalizeCurrentPage(k) === currentPage ? 0 : k === "/" ? 1 : 2);
  const pageKeys = [...byPage.keys()].sort(
    (a, b) => rankPage(a) - rankPage(b) || byPage.get(a)!.page.title.localeCompare(byPage.get(b)!.page.title),
  );
  for (const key of pageKeys) {
    const { page, sections } = byPage.get(key)!;
    const isCurrent = currentPage !== null && normalizeCurrentPage(page.slug) === currentPage;
    const gid = isCurrent ? "sections-this" : `sections:${page.slug}`;
    const glabel = isCurrent ? "Sections - This page" : `Sections - ${page.slug === "/" ? "Home page" : page.title || page.slug}`;
    const items: LinkItem[] = sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => {
        const suffix = !page.enabled ? "page disabled" : !s.enabled ? "disabled" : null;
        const base = pagePath(page.slug);
        const anchor = `#${s.id}`;
        const item: LinkItem = {
          group: gid,
          label: withSuffix(s.navLabel || s.displayName || humanizeType(s.type), suffix),
          value: isCurrent ? anchor : base === "/" ? `/${anchor}` : `${base}${anchor}`,
          hint: isCurrent ? "this page" : base,
        };
        // A bare "#<id>" is how section links were always stored; it must keep preselecting this item.
        if (!isCurrent) item.alts = [anchor];
        if (suffix) item.disabled = true;
        return item;
      });
    push({ id: gid, label: glabel, items });
  }

  push({ id: "forms", label: GROUP_LABELS.forms, items: formItems.sort(byLabel) });
  push({ id: "documents", label: GROUP_LABELS.documents, items: docItems.sort(byLabel) });

  // Plugins & features (each route offered only when ITS gate is open) ---
  const featureItems: LinkItem[] = FEATURE_ROUTES.map((f) => {
    const open = gateOpen(rows, f.gate);
    const item: LinkItem = {
      group: "features",
      label: withSuffix(f.label, open ? null : "feature off"),
      value: f.path,
      hint: f.path,
    };
    if (!open) item.disabled = true;
    return item;
  });
  push({ id: "features", label: GROUP_LABELS.features, items: featureItems });

  // Policies (index + one per policy) ------------------------------------
  const policiesOn = gateOpen(rows, POLICIES_GATE);
  const policyItems: LinkItem[] = [];
  if (rows.policies.length > 0 || policiesOn) {
    const idx: LinkItem = {
      group: "policies",
      label: withSuffix("All policies", policiesOn ? null : "plugin off"),
      value: "/policies",
      hint: "/policies",
    };
    if (!policiesOn) idx.disabled = true;
    policyItems.push(idx);
  }
  for (const pol of rows.policies.slice().sort((a, b) => a.order - b.order)) {
    const suffix = !policiesOn ? "plugin off" : !pol.enabled ? "disabled" : null;
    const item: LinkItem = {
      group: "policies",
      label: withSuffix(pol.navLabel || pol.title, suffix),
      value: `/policies/${pol.slug}`,
      hint: `/policies/${pol.slug}`,
    };
    if (suffix) item.disabled = true;
    policyItems.push(item);
  }
  push({ id: "policies", label: GROUP_LABELS.policies, items: policyItems });

  // Galleries -----------------------------------------------------------
  const galleryItems: LinkItem[] = [];
  if (rows.galleryCategories.length > 0) {
    const anyActive = rows.galleryCategories.some((g) => g.isActive);
    const idx: LinkItem = {
      group: "galleries",
      label: withSuffix("Gallery", anyActive ? null : "no active galleries"),
      value: "/gallery",
      hint: "/gallery",
    };
    if (!anyActive) idx.disabled = true;
    galleryItems.push(idx);
    for (const g of rows.galleryCategories.slice().sort((a, b) => a.order - b.order)) {
      const item: LinkItem = {
        group: "galleries",
        label: withSuffix(g.name || g.slug, g.isActive ? null : "inactive"),
        value: `/gallery/${g.slug}`,
        hint: `/gallery/${g.slug}`,
      };
      if (!g.isActive) item.disabled = true;
      galleryItems.push(item);
    }
  }
  push({ id: "galleries", label: GROUP_LABELS.galleries, items: galleryItems });

  // Content types + entries --------------------------------------------
  const contentItems: LinkItem[] = [];
  const typeBySlug = new Map(rows.contentTypes.map((t) => [t.slug, t]));
  for (const t of rows.contentTypes.slice().sort((a, b) => a.pluralName.localeCompare(b.pluralName))) {
    const item: LinkItem = {
      group: "content",
      label: withSuffix(`${t.pluralName} (all)`, t.hasPublicListing ? null : "no public listing"),
      value: `/content/${t.slug}`,
      hint: `/content/${t.slug}`,
    };
    if (!t.hasPublicListing) item.disabled = true;
    contentItems.push(item);
  }
  const entries = rows.contentEntries
    .filter((e) => typeBySlug.has(e.typeSlug))
    .slice()
    .sort((a, b) => (new Date(b.publishedAt ?? 0).getTime() || 0) - (new Date(a.publishedAt ?? 0).getTime() || 0));
  if (entries.length > MAX_CONTENT_ENTRIES) truncated = true;
  for (const e of entries.slice(0, MAX_CONTENT_ENTRIES)) {
    const t = typeBySlug.get(e.typeSlug)!;
    const live = isPublishedNow(e, now) && t.hasPublicDetail;
    const suffix = live ? null : e.status !== "published" ? "draft" : !t.hasPublicDetail ? "no public detail" : "scheduled";
    const item: LinkItem = {
      group: "content",
      label: withSuffix(`${t.name}: ${e.title}`, suffix),
      value: `/content/${t.slug}/${e.slug}`,
      hint: `/content/${t.slug}/${e.slug}`,
    };
    if (!live) item.disabled = true;
    contentItems.push(item);
  }
  push({ id: "content", label: GROUP_LABELS.content, items: contentItems });

  const mediaPrefix = (opts.mediaPrefix ?? process.env.MEDIA_URL ?? "/uploads").replace(/\/+$/, "") + "/";
  return { groups, meta: { mediaPrefix, currentPage, truncated } };
}

/** Flat list of every item in a catalog (audit / tests). */
export function flattenCatalog(catalog: LinkCatalog): LinkItem[] {
  return catalog.groups.flatMap((g) => g.items);
}

// ── Prisma loaders (thin; take the client as an argument) ──────────────────

/** Runs one source query; a failing source yields `fallback` (logged) instead of failing the whole catalog. */
async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[link-destinations] source "${label}" failed:`, error);
    return fallback;
  }
}

export async function loadCatalogRows(db: PrismaClient): Promise<CatalogRows> {
  const [pages, sections, plugins, clientFeatures, policies, galleryCategories, contentTypes, contentEntries] = await Promise.all([
    safe("pages", () => db.page.findMany({ select: { slug: true, title: true, type: true, enabled: true, status: true } }), []),
    safe(
      "sections",
      () =>
        db.section.findMany({
          select: {
            id: true,
            type: true,
            displayName: true,
            navLabel: true,
            enabled: true,
            order: true,
            page: { select: { slug: true, title: true, type: true, enabled: true } },
          },
          orderBy: { order: "asc" },
        }),
      [],
    ),
    safe("plugins", () => db.plugin.findMany({ select: { slug: true, enabled: true } }), []),
    safe("clientFeatures", () => db.clientFeature.findMany({ select: { slug: true, enabled: true } }), []),
    safe(
      "policies",
      () => db.policy.findMany({ select: { slug: true, title: true, navLabel: true, enabled: true, order: true }, orderBy: { order: "asc" } }),
      [],
    ),
    safe("galleries", () => db.galleryCategory.findMany({ select: { slug: true, name: true, isActive: true, order: true } }), []),
    safe(
      "contentTypes",
      () => db.contentType.findMany({ select: { slug: true, name: true, pluralName: true, hasPublicListing: true, hasPublicDetail: true } }),
      [],
    ),
    safe(
      "contentEntries",
      async () => {
        const found = await db.contentEntry.findMany({
          select: { slug: true, title: true, status: true, publishedAt: true, contentType: { select: { slug: true } } },
          orderBy: { updatedAt: "desc" },
          take: MAX_CONTENT_ENTRIES + 1,
        });
        return found.map((r) => ({ typeSlug: r.contentType.slug, slug: r.slug, title: r.title, status: r.status, publishedAt: r.publishedAt }));
      },
      [] as ContentEntryRow[],
    ),
  ]);
  return {
    pages: pages as PageRow[],
    sections: sections.map((s) => ({ ...s, type: s.type as string })) as SectionRow[],
    plugins,
    clientFeatures,
    policies,
    galleryCategories,
    contentTypes,
    contentEntries,
  };
}

export async function loadCatalog(db: PrismaClient, opts: CatalogOptions = {}): Promise<LinkCatalog> {
  return buildCatalog(await loadCatalogRows(db), opts);
}

// ── Media search (documents / images) ──────────────────────────────────────

export type MediaLinkType = "document" | "image";

export interface MediaSearchParams {
  type: MediaLinkType;
  q?: string;
  page?: number;
  perPage?: number;
  folderId?: string | null;
}

export interface MediaLinkItem {
  group: "media";
  label: string;
  /** MediaAsset.url exactly as stored (may be absolute when MEDIA_URL is a CDN). */
  value: string;
  hint: string;
  thumbnailUrl: string | null;
}

export interface MediaSearchResult {
  items: MediaLinkItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export const MEDIA_MAX_PER_PAGE = 100;
const MEDIA_DEFAULT_PER_PAGE = 20;

function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Same MIME mapping as GET /api/media (?mimeType=document|image). */
export function mediaWhere(params: MediaSearchParams): Prisma.MediaAssetWhereInput {
  const where: Prisma.MediaAssetWhereInput = {
    mimeType: params.type === "image" ? { startsWith: "image/" } : "application/pdf",
  };
  const q = (params.q ?? "").trim().slice(0, 100);
  if (q) {
    where.OR = [
      { filename: { contains: q, mode: "insensitive" } },
      { originalName: { contains: q, mode: "insensitive" } },
      { altText: { contains: q, mode: "insensitive" } },
    ];
  }
  if (params.folderId === "uncategorised") where.folderId = null;
  else if (params.folderId && params.folderId !== "all") where.folderId = params.folderId;
  return where;
}

export async function searchMedia(db: PrismaClient, params: MediaSearchParams): Promise<MediaSearchResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1) || 1);
  const perPage = Math.min(MEDIA_MAX_PER_PAGE, Math.max(1, Math.floor(params.perPage ?? MEDIA_DEFAULT_PER_PAGE) || MEDIA_DEFAULT_PER_PAGE));
  const where = mediaWhere(params);
  const [total, rows] = await Promise.all([
    db.mediaAsset.count({ where }),
    db.mediaAsset.findMany({
      where,
      select: { originalName: true, filename: true, url: true, thumbnailUrl: true, mimeType: true, fileSize: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return {
    items: rows.map((m) => ({
      group: "media" as const,
      label: m.originalName || m.filename || m.url,
      value: m.url,
      hint: [m.mimeType, humanSize(m.fileSize)].filter(Boolean).join(" · "),
      thumbnailUrl: m.thumbnailUrl ?? null,
    })),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}
