/**
 * Brand Token System — Single source of truth for site-wide brand identity.
 *
 * Tokens are stored as a JSON blob in SystemSettings (key: "brand_tokens").
 * Root layout reads them and injects CSS custom properties + Google Fonts link.
 * Every section, Volt design, navbar, and footer consumes these via var(--cms-*).
 */

import prisma from '@/lib/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  neutral: string
  background: string
  surface: string
  text: string
  textMuted: string
}

export interface BrandTypography {
  headingFont: string
  bodyFont: string
  baseSize: number
  scaleRatio: number
}

export interface BrandSpacing {
  sectionPadding: number
  containerMax: number
}

export interface BrandBorders {
  radius: number
  radiusLarge: number
}

export interface BrandTokens {
  colors: BrandColors
  typography: BrandTypography
  spacing: BrandSpacing
  borders: BrandBorders
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_BRAND_TOKENS: BrandTokens = {
  colors: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#f59e0b',
    neutral: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseSize: 16,
    scaleRatio: 1.25,
  },
  spacing: {
    sectionPadding: 80,
    containerMax: 1320,
  },
  borders: {
    radius: 8,
    radiusLarge: 16,
  },
}

const SETTINGS_KEY = 'brand_tokens'

// ── Read/Write ───────────────────────────────────────────────────────────────

export async function getBrandTokens(): Promise<BrandTokens> {
  try {
    const row = await prisma.systemSettings.findUnique({
      where: { key: SETTINGS_KEY },
    })
    if (row?.value) {
      const parsed = JSON.parse(row.value)
      // Merge with defaults so new fields get fallback values
      return {
        colors: { ...DEFAULT_BRAND_TOKENS.colors, ...parsed.colors },
        typography: { ...DEFAULT_BRAND_TOKENS.typography, ...parsed.typography },
        spacing: { ...DEFAULT_BRAND_TOKENS.spacing, ...parsed.spacing },
        borders: { ...DEFAULT_BRAND_TOKENS.borders, ...parsed.borders },
      }
    }
  } catch {
    // If parsing fails, return defaults
  }
  return DEFAULT_BRAND_TOKENS
}

export async function saveBrandTokens(tokens: BrandTokens): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(tokens) },
    update: { value: JSON.stringify(tokens) },
  })
}

// ── CSS Generation ───────────────────────────────────────────────────────────

/** Generate CSS custom properties string for injection into <style> tag. */
export function brandTokensToCss(tokens: BrandTokens): string {
  const { colors, typography, spacing, borders } = tokens
  // Use html selector for brand tokens — higher specificity than Bootstrap's :root
  return `html {
  /* Brand Colors */
  --cms-primary: ${colors.primary};
  --cms-secondary: ${colors.secondary};
  --cms-accent: ${colors.accent};
  --cms-neutral: ${colors.neutral};
  --cms-background: ${colors.background};
  --cms-surface: ${colors.surface};
  --cms-text: ${colors.text};
  --cms-text-muted: ${colors.textMuted};

  /* Typography */
  --cms-heading-font: '${typography.headingFont}', system-ui, sans-serif;
  --cms-body-font: '${typography.bodyFont}', system-ui, sans-serif;
  --cms-base-size: ${typography.baseSize}px;
  --cms-scale-ratio: ${typography.scaleRatio};

  /* Spacing */
  --cms-section-padding: ${spacing.sectionPadding}px;
  --cms-container-max: ${spacing.containerMax}px;

  /* Borders */
  --cms-radius: ${borders.radius}px;
  --cms-radius-lg: ${borders.radiusLarge}px;

  /* Bootstrap overrides — html selector wins over Bootstrap's :root */
  --bs-primary: ${colors.primary};
  --bs-primary-rgb: ${hexToRgb(colors.primary)};
  --bs-body-font-family: '${typography.bodyFont}', system-ui, sans-serif;
  --bs-body-font-size: ${typography.baseSize}px;
  --bs-body-color: ${colors.text};
  --bs-body-bg: ${colors.background};
}
/* Brand fonts apply to public site only — admin uses system fonts */
body:not(:has(.admin-layout)) {
  font-family: var(--cms-body-font);
  color: var(--cms-text);
}
body:not(:has(.admin-layout)) h1,
body:not(:has(.admin-layout)) h2,
body:not(:has(.admin-layout)) h3,
body:not(:has(.admin-layout)) h4,
body:not(:has(.admin-layout)) h5,
body:not(:has(.admin-layout)) h6 {
  font-family: var(--cms-heading-font);
}`
}

/** Generate Google Fonts <link> URL for the selected fonts. */
export function brandTokensToFontUrl(tokens: BrandTokens): string | null {
  const fonts = new Set<string>()
  const { headingFont, bodyFont } = tokens.typography

  // Skip system/default fonts
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'system-ui']
  if (!systemFonts.includes(headingFont)) fonts.add(headingFont)
  if (!systemFonts.includes(bodyFont)) fonts.add(bodyFont)

  if (fonts.size === 0) return null

  const families = [...fonts]
    .map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`)
    .join('&')

  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** Convert hex color to comma-separated RGB for Bootstrap rgb() usage. */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
