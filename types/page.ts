/**
 * Page Configuration Types
 *
 * Pages are navigable routes (e.g., /about, /contact) that use the same
 * section system as the landing page. They're accessed via different routes
 * and excluded from navbar/landing page.
 */

export type PageType = 'full' | 'pdf' | 'form' | 'designer';

/**
 * Base page configuration
 */
export interface PageConfig {
  id: string;
  slug: string;              // URL slug (e.g., "about")
  type: PageType;
  title: string;             // Admin display name
  enabled: boolean;
  metaTitle?: string;        // SEO title
  metaDescription?: string;  // SEO description
  createdAt: string;
  updatedAt: string;
}

/**
 * Full page with sections (uses same section system as landing page)
 * Sections stored separately in cms_sections_{slug}
 */
export interface FullPageConfig extends PageConfig {
  type: 'full';
}

/**
 * PDF document page
 */
export interface PDFPageConfig extends PageConfig {
  type: 'pdf';
  pdfUrl: string;
  displayMode: 'embed' | 'download' | 'both';
  description?: string;
}

/**
 * Form page with custom fields
 */
export interface FormPageConfig extends PageConfig {
  type: 'form';
  fields: FormField[];
  submitAction: 'email' | 'webhook';
  submitConfig: {
    emailTo?: string;
    webhookUrl?: string;
    successMessage?: string;
  };
}

/**
 * Designer page — visual page builder (flexible-designer.html)
 * Content stored separately in cms_designer_{slug} localStorage key.
 */
export interface DesignerPageConfig extends PageConfig {
  type: 'designer';
}

/**
 * Form field configuration
 */
export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  label: string;
  name: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}
