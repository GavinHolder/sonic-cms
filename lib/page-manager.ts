/**
 * Page Manager - CRUD operations for page metadata
 *
 * Mirrors section-manager.ts pattern for consistency.
 * Pages use the same section system - this only manages metadata.
 * Sections stored separately in cms_sections_{pageSlug}
 */

import type { PageConfig, PageType, FullPageConfig, PDFPageConfig, FormPageConfig, DesignerPageConfig } from "@/types/page";

const PAGES_KEY = "cms_pages";

/**
 * Reserved slugs that cannot be used for pages
 * (existing static routes and system paths)
 */
export const RESERVED_SLUGS = [
  'admin', 'api', '_next', 'images', 'uploads',
  'coverage', 'support', 'services', 'equipment', 'client-login',
  'landing-page', 'navbar-demo', 'snap-react-test', 'canvas-test', 'editor',
  'home', 'index', 'page',
];

/**
 * Get all pages from localStorage
 */
export function getPages(): PageConfig[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(PAGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load pages:", error);
    return [];
  }
}

/**
 * Get single page by slug
 */
export function getPage(slug: string): PageConfig | null {
  const pages = getPages();
  return pages.find(p => p.slug === slug) || null;
}

/**
 * Generate URL-safe slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim hyphens from ends
}

/**
 * Validate slug for uniqueness and format
 *
 * ASSUMPTIONS:
 * 1. Slug is lowercase alphanumeric with hyphens only
 * 2. Reserved slugs list is comprehensive
 * 3. Slug uniqueness check is case-insensitive
 *
 * FAILURE MODES:
 * - Reserved slug used → Reject with clear error
 * - Duplicate slug → Reject with suggestion to use different title
 * - Invalid characters → Sanitized by generateSlug()
 */
export function validateSlug(slug: string, excludeId?: string): { valid: boolean; error?: string } {
  // Check format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: "Slug must contain only lowercase letters, numbers, and hyphens" };
  }

  // Check reserved
  if (RESERVED_SLUGS.includes(slug)) {
    return { valid: false, error: `"${slug}" is a reserved slug and cannot be used` };
  }

  // Check uniqueness
  const pages = getPages();
  const duplicate = pages.find(p => p.slug === slug && p.id !== excludeId);
  if (duplicate) {
    return { valid: false, error: `A page with slug "${slug}" already exists` };
  }

  return { valid: true };
}

/**
 * Create new page with auto-generated slug
 *
 * ASSUMPTIONS:
 * 1. Title is non-empty string
 * 2. localStorage is available
 * 3. Generated slug is unique after validation
 *
 * FAILURE MODES:
 * - Reserved slug → Throw error with clear message
 * - Duplicate slug → Throw error with suggestion
 * - localStorage full → Throw error (caught by caller)
 */
export function createPage(
  title: string,
  type: PageType,
  additionalConfig?: Partial<PageConfig>
): PageConfig {
  const pages = getPages();
  const slug = generateSlug(title);

  // Validate slug
  const validation = validateSlug(slug);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = new Date().toISOString();

  // Base page config
  const baseConfig: PageConfig = {
    id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    slug,
    type,
    title,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    ...additionalConfig,
  };

  let newPage: PageConfig;

  // Type-specific initialization
  switch (type) {
    case 'full':
      newPage = baseConfig as FullPageConfig;
      // Sections will be empty by default in database
      break;

    case 'pdf':
      newPage = {
        ...baseConfig,
        pdfUrl: '',
        displayMode: 'embed',
      } as PDFPageConfig;
      break;

    case 'form':
      newPage = {
        ...baseConfig,
        fields: [],
        submitAction: 'email',
        submitConfig: {
          successMessage: 'Thank you! Your submission has been received.',
        },
      } as FormPageConfig;
      break;

    case 'designer':
      newPage = baseConfig as DesignerPageConfig;
      // Designer content stored in cms_designer_{slug} — starts empty
      break;

    default:
      throw new Error(`Unknown page type: ${type}`);
  }

  pages.push(newPage);
  localStorage.setItem(PAGES_KEY, JSON.stringify(pages));

  return newPage;
}

/**
 * Update page metadata
 */
export function updatePage(slug: string, updates: Partial<PageConfig>): PageConfig {
  const pages = getPages();
  const index = pages.findIndex(p => p.slug === slug);

  if (index === -1) {
    throw new Error(`Page with slug "${slug}" not found`);
  }

  // If slug is being changed, validate new slug
  if (updates.slug && updates.slug !== slug) {
    const validation = validateSlug(updates.slug, pages[index].id);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Move sections / designer data to new slug
    if (pages[index].type === 'full') {
      const oldKey = `cms_sections_${slug}`;
      const newKey = `cms_sections_${updates.slug}`;
      const sections = localStorage.getItem(oldKey);
      if (sections) {
        localStorage.setItem(newKey, sections);
        localStorage.removeItem(oldKey);
      }
    } else if (pages[index].type === 'designer') {
      const oldKey = `cms_designer_${slug}`;
      const newKey = `cms_designer_${updates.slug}`;
      const data = localStorage.getItem(oldKey);
      if (data) {
        localStorage.setItem(newKey, data);
        localStorage.removeItem(oldKey);
      }
    }
  }

  const updatedPage: PageConfig = {
    ...pages[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  pages[index] = updatedPage;
  localStorage.setItem(PAGES_KEY, JSON.stringify(pages));

  return updatedPage;
}

/**
 * Delete page and its sections
 *
 * ASSUMPTIONS:
 * 1. User has confirmed deletion (caller handles confirmation)
 * 2. Page slug exists
 *
 * FAILURE MODES:
 * - Page not found → Throw error
 * - Sections not fully deleted → Log warning (non-critical)
 */
export function deletePage(slug: string): void {
  const pages = getPages();
  const page = pages.find(p => p.slug === slug);

  if (!page) {
    throw new Error(`Page with slug "${slug}" not found`);
  }

  // Remove from pages list
  const updated = pages.filter(p => p.slug !== slug);
  localStorage.setItem(PAGES_KEY, JSON.stringify(updated));

  // Remove type-specific data
  if (page.type === 'full') {
    try {
      localStorage.removeItem(`cms_sections_${slug}`);
    } catch (error) {
      console.warn(`Failed to delete sections for page "${slug}":`, error);
    }
  } else if (page.type === 'designer') {
    try {
      localStorage.removeItem(`cms_designer_${slug}`);
    } catch (error) {
      console.warn(`Failed to delete designer data for page "${slug}":`, error);
    }
  }
}

/**
 * Toggle page enabled state
 */
export function togglePageEnabled(slug: string): PageConfig {
  const page = getPage(slug);
  if (!page) {
    throw new Error(`Page with slug "${slug}" not found`);
  }

  return updatePage(slug, { enabled: !page.enabled });
}

/**
 * Duplicate page (create copy with new slug)
 */
export function duplicatePage(slug: string): PageConfig {
  const page = getPage(slug);
  if (!page) {
    throw new Error(`Page with slug "${slug}" not found`);
  }

  // Generate new title and slug
  const newTitle = `${page.title} (Copy)`;
  let newSlug = generateSlug(newTitle);

  // Ensure unique slug
  let counter = 1;
  while (getPage(newSlug)) {
    newSlug = generateSlug(`${newTitle} ${counter}`);
    counter++;
  }

  // Create new page
  const { id, slug: _, createdAt, updatedAt, ...pageData } = page;
  const newPage = createPage(newTitle, page.type, {
    ...pageData,
    slug: newSlug,
  });

  // Copy type-specific data
  if (page.type === 'full') {
    const sourceSections = localStorage.getItem(`cms_sections_${slug}`);
    if (sourceSections) {
      localStorage.setItem(`cms_sections_${newSlug}`, sourceSections);
    }
  } else if (page.type === 'designer') {
    const sourceData = localStorage.getItem(`cms_designer_${slug}`);
    if (sourceData) {
      localStorage.setItem(`cms_designer_${newSlug}`, sourceData);
    }
  }

  return newPage;
}

/**
 * Get designer page data (JSON string from flexible-designer)
 */
export function getDesignerData(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`cms_designer_${slug}`);
}

/**
 * Save designer page data
 */
export function saveDesignerData(slug: string, data: string): void {
  localStorage.setItem(`cms_designer_${slug}`, data);
}
