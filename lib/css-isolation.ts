/**
 * CSS Isolation Utilities
 * Provides scoped CSS and Shadow DOM support for sections
 */

type CSSIsolationMode = "global" | "scoped" | "shadow";

/**
 * Scope CSS rules to a specific section ID
 * Transforms `.class` to `[data-section-id="sectionId"] .class`
 */
export function scopeCSS(css: string, sectionId: string): string {
  if (!css || !css.trim()) return "";

  const scopePrefix = `[data-section-id="${sectionId}"]`;

  // Handle @rules separately (media queries, keyframes, etc.)
  const processedCSS = css.replace(
    /(@(?:media|keyframes|supports|font-face)[^{]*\{)([\s\S]*?)(\}[\s]*\})/g,
    (match, atRule, content, closing) => {
      // For @media and @supports, scope the inner rules
      if (atRule.includes("@media") || atRule.includes("@supports")) {
        const scopedContent = scopeSelectors(content, scopePrefix);
        return `${atRule}${scopedContent}${closing}`;
      }
      // For @keyframes and @font-face, don't scope
      return match;
    }
  );

  // Scope regular rules (not inside @rules)
  return scopeSelectors(processedCSS, scopePrefix);
}

/**
 * Scope CSS selectors with a prefix
 */
function scopeSelectors(css: string, scopePrefix: string): string {
  return css.replace(
    /([^{}@]+)(\{[^{}]*\})/g,
    (match, selectors: string, rules: string) => {
      // Skip if it's an @rule
      if (selectors.trim().startsWith("@")) {
        return match;
      }

      // Scope each selector
      const scopedSelectors = selectors
        .split(",")
        .map((selector: string) => {
          const trimmed = selector.trim();
          if (!trimmed) return trimmed;

          // Don't double-scope if already scoped
          if (trimmed.includes(scopePrefix)) {
            return trimmed;
          }

          // Handle :root, html, body - replace with scope prefix
          if (
            trimmed === ":root" ||
            trimmed === "html" ||
            trimmed === "body"
          ) {
            return scopePrefix;
          }

          // Handle pseudo-elements on root
          if (trimmed.startsWith(":root") || trimmed.startsWith("html") || trimmed.startsWith("body")) {
            return trimmed.replace(/^(:root|html|body)/, scopePrefix);
          }

          return `${scopePrefix} ${trimmed}`;
        })
        .join(", ");

      return `${scopedSelectors}${rules}`;
    }
  );
}

/**
 * Namespace CSS custom properties to prevent conflicts
 */
export function namespaceCustomProperties(
  css: string,
  namespace: string
): string {
  // Namespace --variable declarations and usages
  return css
    .replace(/--([a-zA-Z0-9-]+)(?=\s*:)/g, `--${namespace}-$1`) // declarations
    .replace(/var\(--([a-zA-Z0-9-]+)/g, `var(--${namespace}-$1`); // usages
}

/**
 * Generate a unique style element ID for a section
 */
export function getStyleElementId(sectionId: string): string {
  return `section-styles-${sectionId}`;
}

/**
 * Inject scoped styles into the document head
 */
export function injectScopedStyles(
  sectionId: string,
  css: string,
  mode: CSSIsolationMode = "scoped"
): void {
  if (typeof document === "undefined") return;
  if (!css || !css.trim()) return;

  const styleId = getStyleElementId(sectionId);
  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.setAttribute("data-section-styles", sectionId);
    document.head.appendChild(styleElement);
  }

  // Apply scoping based on mode
  const processedCSS = mode === "scoped" ? scopeCSS(css, sectionId) : css;
  styleElement.textContent = processedCSS;
}

/**
 * Remove scoped styles for a section
 */
export function removeScopedStyles(sectionId: string): void {
  if (typeof document === "undefined") return;

  const styleId = getStyleElementId(sectionId);
  const styleElement = document.getElementById(styleId);
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Inject responsive CSS with media queries
 */
export function injectResponsiveStyles(
  sectionId: string,
  responsiveCSS: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  },
  mode: CSSIsolationMode = "scoped"
): void {
  if (typeof document === "undefined") return;

  const styleId = `${getStyleElementId(sectionId)}-responsive`;
  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.setAttribute("data-section-responsive-styles", sectionId);
    document.head.appendChild(styleElement);
  }

  let css = "";

  // Mobile-first approach
  if (responsiveCSS.mobile) {
    const mobileCss = mode === "scoped"
      ? scopeCSS(responsiveCSS.mobile, sectionId)
      : responsiveCSS.mobile;
    css += `/* Mobile */\n${mobileCss}\n\n`;
  }

  if (responsiveCSS.tablet) {
    const tabletCss = mode === "scoped"
      ? scopeCSS(responsiveCSS.tablet, sectionId)
      : responsiveCSS.tablet;
    css += `/* Tablet */\n@media (min-width: 768px) {\n${tabletCss}\n}\n\n`;
  }

  if (responsiveCSS.desktop) {
    const desktopCss = mode === "scoped"
      ? scopeCSS(responsiveCSS.desktop, sectionId)
      : responsiveCSS.desktop;
    css += `/* Desktop */\n@media (min-width: 1024px) {\n${desktopCss}\n}\n\n`;
  }

  styleElement.textContent = css;
}

/**
 * Remove responsive styles for a section
 */
export function removeResponsiveStyles(sectionId: string): void {
  if (typeof document === "undefined") return;

  const styleId = `${getStyleElementId(sectionId)}-responsive`;
  const styleElement = document.getElementById(styleId);
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Clean up all styles for a section
 */
export function cleanupSectionStyles(sectionId: string): void {
  removeScopedStyles(sectionId);
  removeScopedStyles(`${sectionId}-custom`);
  removeResponsiveStyles(sectionId);
}
