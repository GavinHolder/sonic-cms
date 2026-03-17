/**
 * Page Manager - CRUD operations for page metadata
 *
 * Uses the /api/pages database API for persistence.
 * Designer page content still stored in localStorage (canvas data).
 */

import type { PageConfig, PageType, FullPageConfig, PDFPageConfig, FormPageConfig, DesignerPageConfig } from "@/types/page";

/**
 * Reserved slugs that cannot be used for pages
 */
export const RESERVED_SLUGS = [
  'admin', 'api', '_next', 'images', 'uploads',
  'coverage', 'support', 'services', 'equipment', 'client-login',
  'landing-page', 'navbar-demo', 'snap-react-test', 'canvas-test', 'editor',
  'home', 'index', 'page',
];

/**
 * Generate URL-safe slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate slug format (client-side only — uniqueness is checked server-side)
 */
export function validateSlugFormat(slug: string): { valid: boolean; error?: string } {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: "Slug must contain only lowercase letters, numbers, and hyphens" };
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return { valid: false, error: `"${slug}" is a reserved slug and cannot be used` };
  }
  return { valid: true };
}

/** @deprecated Use validateSlugFormat instead */
export function validateSlug(slug: string, _excludeId?: string): { valid: boolean; error?: string } {
  return validateSlugFormat(slug);
}

// ──────────────────────────────────────────────
// API helpers
// ──────────────────────────────────────────────

function mapApiPage(p: any): PageConfig {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    type: p.type as PageType,
    enabled: p.enabled ?? true,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    // Form-specific
    ...(p.type === "form" && p.formConfig ? {
      fields: (p.formConfig as any).fields ?? [],
      submitAction: (p.formConfig as any).submitAction ?? "email",
      submitConfig: (p.formConfig as any).submitConfig ?? {},
    } : {}),
    // PDF-specific
    ...(p.type === "pdf" && p.formConfig ? {
      pdfUrl: (p.formConfig as any).pdfUrl ?? "",
      displayMode: (p.formConfig as any).displayMode ?? "embed",
    } : {}),
  } as PageConfig;
}

function buildFormConfig(type: PageType, data: Partial<PageConfig>): object | undefined {
  if (type === "form") {
    const d = data as Partial<FormPageConfig>;
    return {
      fields: d.fields ?? [],
      submitAction: d.submitAction ?? "email",
      submitConfig: d.submitConfig ?? {},
    };
  }
  if (type === "pdf") {
    const d = data as Partial<PDFPageConfig>;
    return {
      pdfUrl: d.pdfUrl ?? "",
      displayMode: d.displayMode ?? "embed",
    };
  }
  return undefined;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Get all pages from database
 */
export async function getPages(): Promise<PageConfig[]> {
  try {
    const res = await fetch("/api/pages");
    if (!res.ok) return [];
    const json = await res.json();
    const pages: any[] = json?.data?.pages ?? [];
    return pages
      .filter(p => ["form", "pdf", "designer", "full"].includes(p.type))
      .map(mapApiPage);
  } catch {
    return [];
  }
}

/**
 * Get single page by slug
 */
export async function getPage(slug: string): Promise<PageConfig | null> {
  try {
    const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.data?.page;
    return p ? mapApiPage(p) : null;
  } catch {
    return null;
  }
}

/**
 * Create new page with auto-generated slug
 */
export async function createPage(
  title: string,
  type: PageType,
  additionalConfig?: Partial<PageConfig>
): Promise<PageConfig> {
  const slug = additionalConfig?.slug ?? generateSlug(title);

  const formatCheck = validateSlugFormat(slug);
  if (!formatCheck.valid) throw new Error(formatCheck.error);

  const formConfig = buildFormConfig(type, { ...additionalConfig } as Partial<PageConfig>);

  const res = await fetch("/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      title,
      type,
      enabled: additionalConfig?.enabled ?? true,
      formConfig,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Failed to create page");

  return mapApiPage(json.data.page);
}

/**
 * Update page metadata
 */
export async function updatePage(slug: string, updates: Partial<PageConfig>): Promise<PageConfig> {
  const page = await getPage(slug);
  if (!page) throw new Error(`Page "${slug}" not found`);

  const merged: Partial<PageConfig> = { ...page, ...updates };
  const formConfig = buildFormConfig(page.type, merged);

  const body: any = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.slug !== undefined) body.slug = updates.slug;
  if (updates.enabled !== undefined) body.enabled = updates.enabled;
  if (formConfig !== undefined) body.formConfig = formConfig;

  const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Failed to update page");

  return mapApiPage(json.data.page);
}

/**
 * Delete page
 */
export async function deletePage(slug: string): Promise<void> {
  const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "Failed to delete page");
  }
}

/**
 * Toggle page enabled state
 */
export async function togglePageEnabled(slug: string): Promise<PageConfig> {
  const page = await getPage(slug);
  if (!page) throw new Error(`Page "${slug}" not found`);
  return updatePage(slug, { enabled: !page.enabled });
}

/**
 * Duplicate page
 */
export async function duplicatePage(slug: string): Promise<PageConfig> {
  const res = await fetch(`/api/pages/${encodeURIComponent(slug)}/duplicate`, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Failed to duplicate page");
  // Fetch the full new page
  const newPage = await getPage(json.data.page.slug);
  return newPage!;
}

/**
 * Get designer page data (JSON string) — still stored in localStorage
 */
export function getDesignerData(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`cms_designer_${slug}`);
}

/**
 * Save designer page data — still stored in localStorage
 */
export function saveDesignerData(slug: string, data: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`cms_designer_${slug}`, data);
  }
}
