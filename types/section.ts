import type { AnimBgConfig } from "@/lib/anim-bg/types";
import type { FormField } from "@/types/page";

/**
 * Section Configuration Types for Backend-Controlled Landing Pages
 *
 * SECTION TYPE SYSTEM:
 * - Hero: Always first section, non-movable
 * - Footer: Always last section, non-movable
 * - CTA: Call-to-action sections, movable between hero and footer
 * - Normal: Standard content sections, movable between hero and footer
 */

export type SectionType = "HERO" | "FOOTER" | "CTA" | "NORMAL" | "FLEXIBLE";

/**
 * Legacy type aliases for backward compatibility.
 * Old code referenced these kebab-case section types.
 */
export type HeroCarouselSection = HeroSection;
export type TextImageSection = NormalSection;
export type StatsGridSection = NormalSection;
export type CardGridSection = NormalSection;
export type BannerSection = NormalSection;
export type TableSection = NormalSection;
export type CTAFooterSection = CTASection;

/** Page config type (used in section-data.ts localStorage layer) */
export interface PageConfig {
  id: string;
  slug: string;
  title: string;
  type: string;
  enabled: boolean;
  sections?: SectionConfig[];
}

/**
 * Section Category - Used for positioning logic
 * - special: Hero and Footer (non-movable, fixed positions)
 * - movable: CTA and Normal (can be reordered between hero and footer)
 */
export type SectionCategory = "special" | "movable";

/**
 * Get category for a section type
 */
export function getSectionCategory(type: SectionType): SectionCategory {
  return type === "HERO" || type === "FOOTER" ? "special" : "movable";
}

/**
 * Validate section order
 * - Hero must always be order 0 (first)
 * - Footer must always be order Infinity (last)
 * - CTA and Normal can be any order between hero and footer
 */
export function getValidSectionOrder(
  type: SectionType,
  sections: BaseSectionConfig[]
): number {
  if (type === "HERO") return 0;
  if (type === "FOOTER") return 999999;

  // For CTA and Normal, find max order of movable sections and add 1
  const movableOrders = sections
    .filter((s) => s.type !== "HERO" && s.type !== "FOOTER")
    .map((s) => s.order);

  return movableOrders.length > 0 ? Math.max(...movableOrders) + 1 : 1;
}

export type BackgroundColorPreset =
  | "white"
  | "gray"
  | "blue"
  | "lightblue"
  | "transparent";

/** Background color: preset name OR custom hex string (e.g. "#2563eb") */
export type BackgroundColor = BackgroundColorPreset | (string & {});

export interface BannerConfig {
  content: string;
  variant: "info" | "success" | "warning" | "error";
}

export interface ButtonConfig {
  text: string;
  href: string;
  variant?: "primary" | "secondary" | "outline";
}

// ─── Lower Third Graphic ─────────────────────────────────────────────────────

export type LowerThirdPreset =
  | "wave"
  | "diagonal"
  | "arch"
  | "stepped"
  | "mountain"
  | "blob"
  | "chevron"
  | "ripple";

export interface LowerThirdConfig {
  enabled: boolean;
  mode: "preset" | "image";
  preset: LowerThirdPreset;
  presetColor: string;        // hex e.g. "#ffffff"
  presetOpacity: number;      // 0–1
  imageSrc: string;           // URL for image mode
  height: number;             // px, 40–400
  flipHorizontal: boolean;
  flipVertical: boolean;
}

// ─── Motion / Parallax Elements ──────────────────────────────────────────────

export type MotionEntranceDirection = "top" | "bottom" | "left" | "right";
export type MotionIdleType = "float" | "bob" | "rotate" | "pulse" | "sway";

export interface MotionElementParallax {
  enabled: boolean;
  /** -1 to 1. Positive = moves in scroll direction (slower). Negative = counter-scroll. */
  speed: number;
}

export interface MotionElementEntrance {
  enabled: boolean;
  direction: MotionEntranceDirection;
  distance: number;   // px to travel
  duration: number;   // ms
  delay: number;      // ms
  easing: string;     // anime.js easing string
}

export interface MotionElementExit {
  enabled: boolean;
  direction: MotionEntranceDirection;
  distance: number;
  duration: number;
}

export interface MotionElementIdle {
  enabled: boolean;
  type: MotionIdleType;
  speed: number;       // 0.5–3 multiplier
  amplitude: number;   // px or deg
}

export interface MotionElement {
  id: string;
  type?: "image" | "volt" | "video"; // default "image" when absent
  src: string;
  alt: string;
  // Position (CSS values, absolute within section)
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width: string;        // e.g. "300px" or "25%"
  opacity?: number;     // 0–100, default 100
  zIndex: number;       // legacy — kept for backward compat; use layer when set
  layer?: "behind" | "above-lower-third" | "above-content"; // NEW
  parallax: MotionElementParallax;
  entrance: MotionElementEntrance;
  exit: MotionElementExit;
  idle: MotionElementIdle;
  // ── Silhouette / blend mode enhancements ─────────────────────────────────
  /** "silhouette" applies grayscale+brightness+contrast filter + overlay blend mode */
  filterPreset?: "none" | "silhouette" | "custom";
  /** Custom CSS filter string (used when filterPreset === "custom") */
  customFilter?: string;
  /** CSS mix-blend-mode (default: "normal") */
  mixBlendMode?: React.CSSProperties["mixBlendMode"];
  /** Horizontal parallax — moves element on x-axis as section scrolls (-amount to +amount px) */
  horizontalParallax?: boolean;
  /** px range for horizontal parallax movement (default: 60) */
  horizontalParallaxAmount?: number;
}

/**
 * Base Section Configuration
 * All sections inherit these properties
 */
export interface BaseSectionConfig {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number; // Determines section position (0=hero, 999999=footer, 1-N=movable)
  background?: BackgroundColor;
  banner?: BannerConfig;
  displayName?: string; // Human-readable name for admin panel
  paddingTop?: number; // Top padding in pixels
  paddingBottom?: number; // Bottom padding in pixels
  paddingTopMobile?: number | null; // Mobile override — null = smart default (100px)
  paddingBottomMobile?: number | null; // Mobile override — null = smart default (80px)
  autoTextColor?: boolean; // Auto-detect text color based on background (default: true)
  imageBrightness?: "auto" | "dark" | "light"; // Manual override for background image brightness

  // Triangle overlay configuration (from prototype migration)
  triangleEnabled?: boolean;
  triangleSide?: string; // "top" | "bottom" | "left" | "right"
  triangleShape?: string; // "modern" | "classic"
  triangleHeight?: number; // px, default 200
  triangleTargetId?: string; // ID of target section to navigate to

  // Triangle styling
  triangleGradientType?: string; // "solid" | "linear" | "radial"
  triangleColor1?: string; // hex, default "#4ecdc4"
  triangleColor2?: string; // hex, default "#6a82fb"
  triangleAlpha1?: number; // 0-100, default 100
  triangleAlpha2?: number; // 0-100, default 100
  triangleAngle?: number; // degrees, default 45

  // Triangle image overlay
  triangleImageUrl?: string;
  triangleImageSize?: string; // "cover" | "contain" | "auto"
  triangleImagePos?: string; // legacy text position, replaced by X/Y sliders
  triangleImageX?: number; // 0-100, horizontal center of image, default 50
  triangleImageY?: number; // 0-100, vertical center of image, default 50
  triangleImageScale?: number; // 50-300, scale %, default 100
  triangleImageOpacity?: number; // 0-100, default 100

  // Hover text configuration
  hoverTextEnabled?: boolean;
  hoverText?: string;
  hoverTextStyle?: number; // 1-8 (text style presets)
  hoverFontSize?: number; // px, default 18
  hoverFontFamily?: string; // default "Arial"
  hoverAnimationType?: string; // "slide" | "fade" | "scale" | "none"
  hoverAnimateBehind?: boolean; // default true
  hoverAlwaysShow?: boolean; // default false
  hoverOffsetX?: number; // px, default 0

  // Background image (section-level)
  bgImageUrl?: string;
  bgImageSize?: string; // "cover" | "contain" | "auto"
  bgImagePosition?: string; // "center" | "top" | "bottom" etc
  bgImageRepeat?: string; // "no-repeat" | "repeat" | "repeat-x" | "repeat-y"
  bgImageOpacity?: number; // 0-100, default 100
  bgParallax?: boolean; // default false

  // Section color theme / palette
  colorPalette?: string[]; // Array of 5 hex colors
  colorPaletteHarmony?: string; // Harmony type used to generate
  colorPaletteLocked?: boolean; // When true, palette cannot be edited

  // Content height mode
  contentMode?: "single" | "multi"; // "single" = 100vh locked, "multi" = >100vh allowed

  // Motion/parallax overlay elements (z-index 20, above content and lower-third)
  motionElements?: MotionElement[];
  // Lower third decorative graphic (z-index 10, below motion elements)
  lowerThird?: LowerThirdConfig;

  // Content (flexible JSON structure for each section type)
  content: Record<string, any>;
}

/**
 * Animation types for text overlays
 */
export type AnimationType = "fade" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "zoom" | "none";

/** Animation types specific to FlexibleElement (scroll-triggered via anime.js) */
export type FlexibleAnimationType =
  | "none" | "fadeIn" | "slideUp" | "slideDown" | "slideInLeft" | "slideInRight"
  | "scaleIn" | "zoomIn" | "flipInX" | "flipInY" | "bounceIn" | "rotateIn" | "blurIn";

/**
 * Gradient overlay configuration
 */
export interface GradientOverlay {
  enabled: boolean;
  type: "preset" | "custom";
  // Preset gradient
  preset?: {
    direction: "top" | "bottom" | "left" | "right" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
    startOpacity: number; // 0-100
    endOpacity: number; // 0-100
    color: string; // Hex color
  };
  // Custom gradient image
  custom?: {
    src: string; // Path to gradient image
  };
}

/**
 * Single row in a multi-row hero heading (OVB-style stacked display type).
 * Each row can have independent color, size, weight, and animation.
 */
/**
 * A single word within a heading row — enables per-word outline (stroke) styling
 * and per-word fill colour. When a row has a non-empty `words` array it is rendered
 * word-by-word; otherwise the row's plain `text` is used (backward compatible).
 */
export interface HeadingWord {
  text: string;
  /** Outlined = transparent fill + text stroke (vs solid fill) */
  outlined?: boolean;
  /** Stroke colour when outlined (defaults to the row colour) */
  outlineColor?: string;
  /** Stroke width in px when outlined (default 2) */
  outlineWidth?: number;
  /**
   * Outline rendering style when `outlined` is true (default "standard"):
   * - "standard" → current stroke width (outlineWidth ?? 2)
   * - "thin"     → hairline stroke, greatly reduces Archivo Black junction crossings
   * - "clean"    → render outline in a single-contour font (Inter) — no R/B/W glyph crossings
   * Undefined renders identically to "standard" (backward compatible).
   */
  outlineStyle?: "thin" | "standard" | "clean";
  /** Solid fill colour override when not outlined (defaults to the row colour) */
  color?: string;
}

/**
 * Toggleable drop-shadow config for hero text overlays (headings + subheading).
 * Optional throughout — when undefined, renderers keep their existing baked look.
 */
export interface TextShadowConfig {
  enabled: boolean;
  offsetX: number; // px
  offsetY: number; // px
  blur: number;    // px
  color: string;   // hex e.g. "#000000"
  opacity: number; // 0-100
}

/**
 * Freeform position — percentage of the hero box (0–100), anchor = element CENTER.
 * Used only when the overlay's `layoutMode === "freeform"`. Optional everywhere so
 * existing preset layouts are untouched.
 */
export interface FreeformPos {
  x: number; // 0–100 (% of hero width)
  y: number; // 0–100 (% of hero height)
}

/**
 * Sensible fallback position for a freeform element that has no explicit `pos`.
 * Shared by the renderer and the editor drag surface so a chip appears where it renders.
 * Staggered so untouched elements don't all pile up dead-center.
 */
export function defaultFreeformPos(
  kind: "eyebrow" | "heading" | "subheading" | "button",
  index = 0
): FreeformPos {
  switch (kind) {
    case "eyebrow":
      return { x: 50, y: 22 };
    case "heading":
      return { x: 50, y: 38 + index * 12 };
    case "subheading":
      return { x: 50, y: 70 };
    case "button":
      return { x: 40 + index * 16, y: 85 };
  }
}

export interface HeadingRow {
  text: string;
  /** Optional per-word styling (outline/fill). Takes precedence over `text` when non-empty. */
  words?: HeadingWord[];
  fontSize: number;        // px — rendered with clamp(28px, 7vw, Xpx)
  fontWeight: number;      // 100–900
  fontFamily: string;
  color: string;
  animation: AnimationType;
  animationDuration: number; // ms
  animationDelay: number;    // ms
  /** Freeform placement (only used when overlay.layoutMode === "freeform"). */
  pos?: FreeformPos;
}

/**
 * Text overlay element (per slide)
 *
 * Supports two heading modes — backward compatible:
 *   legacy: `heading` (single object, original format)
 *   new:    `headingRows` (array, OVB-style multi-row stacked display type)
 *
 * When `headingRows` is present and non-empty, it takes precedence over `heading`.
 * Renderers that see only `heading` but not `headingRows` treat it as a one-row array.
 */
export interface TextOverlayElement {
  /** Legacy single heading — kept for backward compat. Use headingRows for multi-row. */
  heading: {
    text: string;
    fontSize: number; // px
    fontWeight: number; // 100-900
    fontFamily: string;
    color: string;
    animation: AnimationType;
    animationDuration: number; // ms
    animationDelay: number; // ms
  };
  /** Multi-row stacked display heading (OVB-style). Overrides `heading` when present. */
  headingRows?: HeadingRow[];
  /** Small uppercase label shown above the heading rows (e.g. "TWENTY-FIVE YEARS ON") */
  eyebrow?: string;
  /** Eyebrow text color (default: accent / brand green) */
  eyebrowColor?: string;
  /** Eyebrow horizontal alignment override (defaults to the overlay position's alignment) */
  eyebrowAlign?: "left" | "center" | "right";
  /** Hide the eyebrow without clearing its text */
  eyebrowHidden?: boolean;
  subheading?: {
    text: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    color: string;
    animation: AnimationType;
    animationDuration: number;
    animationDelay: number;
  };
  buttons: Array<{
    text: string;
    href: string;
    backgroundColor: string;
    textColor: string;
    variant: "filled" | "outline" | "ghost";
    animation: AnimationType;
    animationDuration: number;
    animationDelay: number;
    /** Freeform placement (only used when overlay.layoutMode === "freeform"). */
    pos?: FreeformPos;
  }>;
  /**
   * Overlay layout mode.
   *  - "preset" (default / undefined): current behaviour — a single positioned text block.
   *  - "freeform": each addressable element (heading rows, subheading, buttons, eyebrow)
   *    is absolutely placed via its own `pos` percentage. Opt-in & fully back-compat.
   */
  layoutMode?: "preset" | "freeform";
  /** Freeform position for the legacy single `heading` (classic mode). */
  headingPos?: FreeformPos;
  /** Freeform position for the subheading. */
  subheadingPos?: FreeformPos;
  /** Freeform position for the eyebrow label. */
  eyebrowPos?: FreeformPos;
  position: "center" | "left" | "right" | "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
  spacing: {
    betweenHeadingSubheading: number; // px
    betweenSubheadingButtons: number; // px
    betweenButtons: number; // px
  };
  /**
   * Drop shadow for the heading rows / legacy heading / subheading.
   * Optional & back-compat: when undefined, renderers keep the current baked look
   * (subheading keeps its shadow, headings keep none). enabled:false = no shadow.
   */
  textShadow?: TextShadowConfig;
  /** Offset the entire text overlay from the edges (in px). Useful for clearing the navbar. */
  overlayOffset?: {
    top: number;    // px (default: 0, recommended ~100 for top positions to clear navbar)
    right: number;  // px (default: 0)
    bottom: number; // px (default: 0)
    left: number;   // px (default: 0)
  };
}

/**
 * Carousel slide (image or video)
 */
export interface HeroCarouselSlide {
  id: string;
  type: "image" | "video";
  src: string; // Optimized image/video path
  alt?: string; // Alt text for accessibility
  poster?: string; // Video poster image
  gradient?: GradientOverlay;
  overlay?: TextOverlayElement;
  name?: string; // Admin-facing slide label (editor management only; not rendered)
  showTextOverlay?: boolean; // Default true. When false the slide is image/video-only (no text overlay).
  // Mobile-specific overrides
  mobileSrc?: string; // Portrait-oriented mobile image (falls back to src if not set)
  mobileBgColor?: string; // Solid background color for mobile (overrides image)
  /** Small uppercase eyebrow label above the heading (e.g. "Overberg · Western Cape") */
  eyebrow?: string;
}

/**
 * Hero Section
 * Always first, full-screen carousel with multiple slides
 */
export interface HeroSection extends BaseSectionConfig {
  type: "HERO";
  content: {
    slides: HeroCarouselSlide[];
    autoPlay: boolean;
    autoPlayInterval: number; // ms (default 5000)
    showDots: boolean;
    showArrows: boolean;
    transitionDuration: number; // ms (default 800)
    /** Show "01 / 03" slide counter at bottom-left (OVB-style) */
    showSlideCounter?: boolean;
    /** Show animated scroll indicator at bottom-right ("SCROLL" text + green line) */
    showScrollIndicator?: boolean;
    /** Meta text lines shown near the slide counter (e.g. ["34°25′S · 19°48′E", "SINCE 2001"]) */
    metaLine?: string[];
    /** Position for nav controls (dots + counter) — default: bottom-left */
    controlsPosition?: "bottom-left" | "bottom-right";
    /** Frosted glass bar pinned to bottom of hero — same config on all slides */
    statsStrip?: {
      enabled: boolean;
      items: Array<{ icon: string; text: string }>;
    };
  };
}

/**
 * Position for company info block in footer
 */
export type FooterInfoPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/**
 * Predefined social media platforms with icons
 */
export const SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: "bi-facebook" },
  { value: "twitter", label: "Twitter / X", icon: "bi-twitter-x" },
  { value: "instagram", label: "Instagram", icon: "bi-instagram" },
  { value: "linkedin", label: "LinkedIn", icon: "bi-linkedin" },
  { value: "youtube", label: "YouTube", icon: "bi-youtube" },
  { value: "tiktok", label: "TikTok", icon: "bi-tiktok" },
  { value: "whatsapp", label: "WhatsApp", icon: "bi-whatsapp" },
  { value: "telegram", label: "Telegram", icon: "bi-telegram" },
  { value: "github", label: "GitHub", icon: "bi-github" },
  { value: "pinterest", label: "Pinterest", icon: "bi-pinterest" },
  { value: "snapchat", label: "Snapchat", icon: "bi-snapchat" },
  { value: "reddit", label: "Reddit", icon: "bi-reddit" },
  { value: "discord", label: "Discord", icon: "bi-discord" },
  { value: "threads", label: "Threads", icon: "bi-threads" },
  { value: "mastodon", label: "Mastodon", icon: "bi-mastodon" },
] as const;

/**
 * Footer Section
 * Always last, site footer with links and info
 */
export interface FooterSection extends BaseSectionConfig {
  type: "FOOTER";
  content: {
    logo?: string;
    logoPosition?: FooterInfoPosition;
    tagline?: string;
    companyInfo?: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      position: FooterInfoPosition;
    };
    columns: Array<{
      id: string;
      title: string;
      links: Array<{
        text: string;
        href: string;
      }>;
    }>;
    copyright?: string;
    socialLinks?: Array<{
      platform: string;
      url: string;
      icon: string;
    }>;
    certificationLogos?: Array<{
      id: string;
      image: string;
      text: string;
      position: FooterInfoPosition;
    }>;
    // Background options (same as hero section)
    backgroundImage?: string; // Custom background image URL
    gradient?: GradientOverlay; // Gradient overlay
  };
}

/**
 * CTA Section
 * Call-to-action banner, movable between hero and footer.
 * Supports 4 styles: banner, card, fullwidth, and contact-form.
 */
export interface CTASection extends BaseSectionConfig {
  type: "CTA";
  content: {
    heading: string;
    subheading?: string;
    buttons: ButtonConfig[];
    style?: "banner" | "card" | "fullwidth" | "contact-form";
    // Background options (same as hero section)
    backgroundImage?: string; // Custom background image URL
    backgroundVideo?: string; // Custom background video URL
    videoPoster?: string; // Video poster image
    gradient?: GradientOverlay; // Gradient overlay
    // Contact form mode fields (used when style === "contact-form")
    formFields?: FormField[];
    formTitle?: string;
    formSuccessMessage?: string;
  };
}

/**
 * Layout preset types for different layout modes
 */
export type TextOnlyPreset = "centered" | "left-aligned" | "right-aligned" | "split-column";
export type TextImagePreset = "text-left-image-right" | "text-right-image-left" | "text-overlay-center" | "text-overlay-bottom";
export type ImageTextPreset = "image-left-text-right" | "image-right-text-left" | "image-overlay-center" | "image-overlay-bottom";
export type GridPreset = "standard-grid" | "overlay-top" | "overlay-bottom" | "overlay-center";
export type ColumnsPreset = "standard-columns" | "with-overlay";

export type LayoutPreset = TextOnlyPreset | TextImagePreset | ImageTextPreset | GridPreset | ColumnsPreset;

/**
 * Normal Section
 * Standard content section, movable between hero and footer
 */
export interface NormalSection extends BaseSectionConfig {
  type: "NORMAL";
  content: {
    /** Animated background layers (stored in content JSONB, no migration needed) */
    animBg?: AnimBgConfig;
    heading?: string;
    subheading?: string;
    body?: string; // HTML or plain text
    layout?:
      | "text-only"
      | "text-image"
      | "image-text"
      | "grid"
      | "columns";
    layoutPreset?: LayoutPreset; // Layout-specific positioning preset
    // Flexible content for different layouts
    items?: Array<Record<string, any>>;
    columns?: number;
    imageSrc?: string;
    imageAlt?: string;
    // Background options (same as hero section)
    backgroundImage?: string; // Custom background image URL
    backgroundVideo?: string; // Custom background video URL
    videoPoster?: string; // Video poster image
    gradient?: GradientOverlay; // Gradient overlay
    // Text overlay (animated on scroll)
    overlay?: {
      heading?: string;
      subheading?: string;
      animation?: AnimationType;
      position?: "center" | "left" | "right" | "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
    };
  };
}

/** Named mosaic size presets — map to colSpan/rowSpan pairs */
export type MosaicSizePreset = "s-lg" | "s-md" | "s-sm" | "s-tall" | "s-wide" | "s-mid";

/** Row in a numbered steps block */
export interface StepItem {
  number: string;   // e.g. "01", "1", "A"
  heading: string;
  subtext?: string;
}

/** Single image in a photo-strip block */
export interface PhotoStripImage {
  src: string;
  alt?: string;
}

/**
 * Flexible Section - New section type with advanced layout control
 * Supports Bootstrap grid, absolute positioning, element library, and creative layouts
 */
export interface FlexibleSection extends BaseSectionConfig {
  type: "FLEXIBLE";
  contentMode?: "single" | "multi"; // alias for content.contentMode (for top-level access)
  content: {
    // Content mode: "single" (100vh snap) or "multi" (grows with content)
    contentMode?: "single" | "multi";
    // Animated background layers (stored in content JSONB, no migration needed)
    animBg?: AnimBgConfig;
    // Layout configuration
    layout: {
      type: "grid" | "absolute" | "preset";
      // Grid layout (Bootstrap 4.1)
      gridRows?: number; // 1-10
      gridCols?: number; // 1-12 (Bootstrap columns)
      gridGap?: number; // Gap between grid items in px
      // Preset layouts
      preset?: "2-col-split" | "3-col-grid" | "asymmetric-2col-60-40" | "asymmetric-2col-40-60"
        | "asymmetric-3col-50-25-25" | "asymmetric-3col-25-50-25" | "4-col-grid"
        | "hero-2col" | "sidebar-70-30" | "sidebar-30-70" | "masonry";
      /** Mosaic layout: 12-column CSS grid with per-element colSpan/rowSpan */
      layoutMode?: "columns" | "mosaic";
      /** Mosaic: auto row height in px (default: 180) */
      gridAutoRows?: number;
    };
    // Elements in the section
    elements: FlexibleElement[];
    // Header/footer graphics (blend into theme)
    headerGraphic?: GraphicConfig;
    footerGraphic?: GraphicConfig;

    // ── Section header variants ───────────────────────────────────────────
    /** Section-level heading (above elements) */
    sectionHeading?: string;
    /** Section-level subheading */
    sectionSubheading?: string;
    /** Small uppercase eyebrow label above the section heading */
    sectionEyebrow?: string;
    /** Lead paragraph — shown right column in split variant */
    sectionLead?: string;
    /** "centered" = standard centred heading; "split" = heading left ~60% / lead right ~40% */
    sectionHeaderVariant?: "centered" | "split";

    // ── Section footer row ────────────────────────────────────────────────
    /** Row rendered below section content: left text + optional right ghost button */
    sectionFooter?: {
      leftText?: string;   // Supports <em> tag for green highlights
      rightButton?: { label: string; href: string };
    };
  };
}

/**
 * Flexible Element - Individual element in flexible section
 */
export interface FlexibleElement {
  id: string;
  type: "hero" | "text" | "image" | "video" | "banner" | "button" | "card" | "stats" | "divider" | "html" | "isp-price-card" | "steps" | "photo-strip" | "marquee" | "packages";
  // Position (grid-based OR absolute)
  position: {
    mode: "grid" | "absolute";
    // Grid position (Bootstrap)
    gridRow?: number; // 1-based row index
    gridCol?: number; // 1-based column index
    gridColSpan?: number; // How many columns to span (1-12)
    gridRowSpan?: number; // How many rows to span
    // Mosaic grid position (12-col CSS grid)
    colSpan?: number;       // 1–12 (mosaic mode)
    rowSpan?: number;       // 1–6 (mosaic mode)
    mosaicPreset?: MosaicSizePreset; // Named preset — sets colSpan/rowSpan automatically
    // Absolute position (px or %)
    x?: string; // "100px" or "50%"
    y?: string;
    width?: string;
    height?: string;
    zIndex?: number; // Layering (0-100)
  };
  // Styling
  styling?: {
    backgroundColor?: string;
    backgroundGradient?: string; // CSS gradient string
    textColor?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    padding?: string;
    margin?: string;
    borderRadius?: string;
    boxShadow?: string;
    clipPath?: string;
    textAlign?: "left" | "center" | "right" | "justify";
  };
  // Element-specific content (all fields are optional; only relevant ones used per type)
  content: {
    // ── Hero block ──
    heroType?: "mini-hero" | "full-hero";
    backgroundImage?: string;
    backgroundVideo?: string;
    gradient?: GradientOverlay | string;
    gradientOpacity?: number; // 0-100
    overlay?: TextOverlayElement;
    heroHeading?: string;
    heroSubheading?: string;
    heroText?: string; // HTML
    heroAlign?: "left" | "center" | "right";
    heroMinHeight?: number; // px
    heroButton?: { text: string; href: string; icon?: string };
    heroSecondButton?: { text: string; href: string; icon?: string };
    // ── Text block ──
    text?: string; // HTML or plain text
    heading?: string;
    subheading?: string;
    badge?: string;
    badgeColor?: string;
    accent?: string;
    headingAlign?: "left" | "center" | "right";
    // ── Image block ──
    imageSrc?: string;
    imageAlt?: string;
    imageOverlay?: string;
    imageHeight?: number; // px
    imageFit?: "cover" | "contain" | "fill";
    imageCaption?: string;
    clipPath?: string;
    // ── Video block ──
    videoSrc?: string;
    videoPoster?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    videoHeight?: number; // px
    // ── Banner block ──
    bannerType?: "image" | "gradient" | "gif" | "video";
    bannerSrc?: string;
    bannerGradient?: string; // CSS gradient or color
    bannerHeight?: number; // px
    bannerHeading?: string;
    bannerSubheading?: string;
    bannerTextPosition?: "left" | "center" | "right";
    bannerButton?: { text: string; href: string; icon?: string };
    bannerOverlay?: string; // rgba(...)
    bannerFloat?: "none" | "left" | "right";
    bannerFloatWidth?: string; // e.g. "45%"
    // ── Button ──
    buttonText?: string;
    buttonHref?: string;
    buttonVariant?: "filled" | "outline" | "dark" | "ghost";
    buttonIcon?: string;
    buttonSize?: "sm" | "md" | "lg";
    buttonFullWidth?: boolean;
    // ── Card ──
    cardImage?: string;
    cardImageHeight?: number; // px
    cardTitle?: string;
    cardBody?: string;
    cardButton?: { text: string; href: string; icon?: string; variant?: string };
    cardBadge?: string;
    cardBadgeColor?: string;
    cardTags?: string[];
    cardIcon?: string;
    cardTextColor?: string;
    cardFooter?: string;
    cardBgType?: "default" | "solid" | "gradient" | "image" | "image-gradient";
    cardBgColor?: string;
    cardBgGradient?: string;
    cardBgImage?: string;
    cardBgImageGradient?: string;
    cardEffect?: "default" | "glass" | "glow" | "rgb" | "shimmer" | "pulse-glow";
    cardGlowColor?: string;
    // ── Stats ──
    statsNumber?: string;
    statsLabel?: string;
    statsSubLabel?: string;
    statsIcon?: string;
    statsAccentColor?: string;
    statsTrend?: "up" | "down" | "neutral";
    statsTrendValue?: string;
    statsGlass?: boolean;
    // Extended stats (animated counter + style variants)
    statsAnimateOnScroll?: boolean;   // Count up from 0 on IntersectionObserver
    statsCountDuration?: number;      // ms (default: 1600)
    statsPrefix?: string;             // e.g. "R"
    statsSuffix?: string;             // e.g. "+", "m³", "%"
    statsDisplaySuffix?: string;      // Separate label under the number
    statsStyleVariant?: "stacked" | "counter" | "row-dividers";
    // ── Steps block ──
    steps?: StepItem[];
    stepsNumberStyle?: "large-accent"; // 64px green tabular-nums (default)
    stepsDividers?: boolean;           // border-top on each step
    stepsLastDivider?: boolean;        // border-bottom on last step
    stepsNumberWidth?: number;         // px (default: 120)
    // ── Photo strip block ──
    photoStripImages?: PhotoStripImage[];
    photoStripHeight?: number;         // px (default: 180)
    photoStripGap?: number;            // px (default: 4)
    photoStripHoverBrightness?: boolean;
    photoStripColumns?: number;        // default: auto (fills evenly)
    // ── Marquee / stat strip (animated horizontal scroll) ──
    // Generic strip: each item shows an optional big `value` (display font) + `label`.
    // "town" style renders label only (uppercase). "stat" style renders value over label.
    marqueeItems?: { value?: string; label: string }[];
    marqueeSpeed?: number;                       // seconds per loop (default 36; lower = faster)
    marqueeDirection?: "left" | "right";         // scroll direction (default "left")
    marqueePauseOnHover?: boolean;               // default true
    marqueeSeparator?: "star" | "dot" | "bar" | "none"; // glyph between items (default "star" = red ✦)
    marqueeStyle?: "town" | "stat";              // "town" = label only uppercase; "stat" = value + label
    // ── Packages (coverage plugin) ──
    // Card bound to a package: packageId → {{pkg.*}} tokens in card fields resolve live.
    packageId?: string;
    // Packages grid block: render a network's packages as cards.
    networkSlug?: string;
    packageColumns?: number;
    // ── Divider ──
    dividerType?: "line" | "dots" | "gradient" | "wave";
    dividerHeight?: number;
    dividerColor?: string;
    dividerLabel?: string;
    // ── Custom HTML ──
    html?: string;
  };
  // Animation (scroll-triggered via anime.js)
  animation?: {
    type?: FlexibleAnimationType;
    duration?: number;
    delay?: number;
  };
}

/**
 * Header/Footer Graphic Configuration
 */
export interface GraphicConfig {
  enabled: boolean;
  type: "shape" | "image" | "gradient" | "svg";
  // Shape options
  shape?: "wave" | "curve" | "triangle" | "diagonal" | "blob";
  shapeColor?: string;
  // Image options
  image?: string;
  // Gradient options
  gradient?: GradientOverlay;
  // SVG options
  svgPath?: string; // Custom SVG path
  // Universal options
  height: number; // px or %
  blendMode?: "normal" | "multiply" | "overlay" | "screen" | "darken" | "lighten";
  opacity?: number; // 0-100
  position: "top" | "bottom";
}

/**
 * Props for the contact-form block type in Flexible Designer.
 * Submits to existing /api/contact route.
 */
export interface ContactFormBlockProps {
  formTitle?: string;
  fields?: {
    name?: boolean;
    email?: boolean;
    phone?: boolean;
    message?: boolean;
    subject?: boolean;
  };
  submitLabel?: string;
  successMessage?: string;
  emailTo?: string;
}

/**
 * Props for the how-steps block type in Flexible Designer.
 * Renders a numbered step card with an optional connecting line to the right.
 */
export interface HowStepsBlockProps {
  stepNumber?: string;
  title?: string;
  description?: string;
  isLast?: boolean;
  accentColor?: string;
}

/**
 * Union type for all section configurations
 */
export type SectionConfig =
  | HeroSection
  | FooterSection
  | CTASection
  | NormalSection
  | FlexibleSection;

/**
 * Default seed templates for each section type
 */
export const DEFAULT_SECTION_SEEDS: Record<
  SectionType,
  Omit<SectionConfig, "id" | "order">
> = {
  HERO: {
    type: "HERO",
    enabled: true,
    background: "transparent",
    displayName: "Hero Section",
    paddingTop: 0,
    paddingBottom: 0,
    content: {
      slides: [
        {
          id: "slide-1",
          type: "image",
          src: "/images/hero-bg.jpg",
          gradient: {
            enabled: true,
            type: "preset",
            preset: {
              direction: "bottom",
              startOpacity: 70,
              endOpacity: 0,
              color: "#000000",
            },
          },
          overlay: {
            heading: {
              text: "Welcome to Your Company",
              fontSize: 56,
              fontWeight: 700,
              fontFamily: "inherit",
              color: "#ffffff",
              animation: "slideUp",
              animationDuration: 800,
              animationDelay: 200,
            },
            subheading: {
              text: "Fast, Reliable Service",
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "inherit",
              color: "#ffffff",
              animation: "slideUp",
              animationDuration: 800,
              animationDelay: 400,
            },
            buttons: [
              {
                text: "Get Started",
                href: "#contact",
                backgroundColor: "#2563eb",
                textColor: "#ffffff",
                variant: "filled",
                animation: "slideUp",
                animationDuration: 800,
                animationDelay: 600,
              },
            ],
            position: "center",
            spacing: {
              betweenHeadingSubheading: 16,
              betweenSubheadingButtons: 32,
              betweenButtons: 16,
            },
            overlayOffset: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
        },
      ],
      autoPlay: true,
      autoPlayInterval: 5000,
      showDots: true,
      showArrows: true,
      transitionDuration: 800,
    },
  },
  FOOTER: {
    type: "FOOTER",
    enabled: true,
    background: "gray",
    displayName: "Footer Section",
    paddingTop: 60,
    paddingBottom: 40,
    content: {
      logo: "/images/logo.png",
      tagline: "Fast, reliable service for your region",
      companyInfo: {
        name: "Your Company",
        address: "123 Main Road, Your City, 0000",
        phone: "+27 28 123 4567",
        email: "info@yourcompany.co.za",
        position: "top-left",
      },
      columns: [
        {
          id: "col-1",
          title: "Company",
          links: [
            { text: "About Us", href: "/about" },
            { text: "Coverage", href: "/coverage" },
            { text: "Contact", href: "/contact" },
          ],
        },
        {
          id: "col-2",
          title: "Services",
          links: [
            { text: "Fiber Internet", href: "/services#fiber" },
            { text: "Wireless", href: "/services#wireless" },
            { text: "Equipment", href: "/equipment" },
          ],
        },
        {
          id: "col-3",
          title: "Support",
          links: [
            { text: "Help Center", href: "/support" },
            { text: "FAQs", href: "/support#faq" },
            { text: "Client Login", href: "/client-login" },
          ],
        },
      ],
      copyright: "© 2026 Your Company. All rights reserved.",
      socialLinks: [
        { platform: "facebook", url: "#", icon: "bi-facebook" },
        { platform: "twitter", url: "#", icon: "bi-twitter-x" },
        { platform: "linkedin", url: "#", icon: "bi-linkedin" },
      ],
    },
  },
  CTA: {
    type: "CTA",
    enabled: true,
    background: "blue",
    displayName: "Call to Action",
    paddingTop: 100,
    paddingBottom: 80,
    content: {
      heading: "Ready to Get Started?",
      subheading: "Join thousands of happy customers with fast, reliable internet",
      buttons: [
        {
          text: "View Plans",
          href: "/services",
          variant: "primary",
        },
        {
          text: "Contact Us",
          href: "/contact",
          variant: "outline",
        },
      ],
      style: "banner",
    },
  },
  NORMAL: {
    type: "NORMAL",
    enabled: true,
    background: "white",
    displayName: "Content Section",
    paddingTop: 100,
    paddingBottom: 80,
    content: {
      heading: "Your Section Title",
      subheading: "Add a compelling subheading to capture attention",
      body: `
        <div class="row g-4">
          <div class="col-md-6">
            <div class="d-flex align-items-start mb-4">
              <div class="bg-primary bg-opacity-10 rounded p-3 me-3">
                <i class="bi bi-star-fill text-primary fs-2"></i>
              </div>
              <div>
                <h4 class="fw-bold mb-2">Key Feature One</h4>
                <p class="text-muted mb-0">
                  Describe your first key feature or benefit. Use this space to highlight what makes your offering unique and valuable to customers.
                </p>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="d-flex align-items-start mb-4">
              <div class="bg-success bg-opacity-10 rounded p-3 me-3">
                <i class="bi bi-lightning-charge-fill text-success fs-2"></i>
              </div>
              <div>
                <h4 class="fw-bold mb-2">Key Feature Two</h4>
                <p class="text-muted mb-0">
                  Highlight your second major feature or advantage. Focus on tangible benefits that resonate with your target audience.
                </p>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="d-flex align-items-start mb-4">
              <div class="bg-info bg-opacity-10 rounded p-3 me-3">
                <i class="bi bi-shield-check-fill text-info fs-2"></i>
              </div>
              <div>
                <h4 class="fw-bold mb-2">Key Feature Three</h4>
                <p class="text-muted mb-0">
                  Emphasize trust, security, or reliability aspects. Help visitors understand why they should choose you over competitors.
                </p>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="d-flex align-items-start mb-4">
              <div class="bg-warning bg-opacity-10 rounded p-3 me-3">
                <i class="bi bi-people-fill text-warning fs-2"></i>
              </div>
              <div>
                <h4 class="fw-bold mb-2">Key Feature Four</h4>
                <p class="text-muted mb-0">
                  Showcase customer support, community, or personalization features. Make visitors feel valued and supported.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-5 pt-4 border-top">
          <p class="lead mb-4">
            Ready to experience the difference? Edit this template to match your brand and message.
          </p>
          <a href="#" class="btn btn-primary btn-lg me-2">Get Started</a>
          <a href="#" class="btn btn-outline-primary btn-lg">Learn More</a>
        </div>
      `,
      layout: "text-only",
    },
  },
  FLEXIBLE: {
    type: "FLEXIBLE",
    enabled: true,
    background: "white",
    displayName: "Flexible Section",
    paddingTop: 100,
    paddingBottom: 80,
    contentMode: "single",
    content: {
      layout: {
        type: "grid",
        gridRows: 2,
        gridCols: 3,
        gridGap: 20,
      },
      elements: [
        {
          id: "element-1",
          type: "text",
          position: {
            mode: "grid",
            gridRow: 1,
            gridCol: 1,
            gridColSpan: 3,
            gridRowSpan: 1,
          },
          styling: {
            textColor: "#1a1a1a",
            fontSize: 32,
            fontWeight: 700,
            padding: "20px",
          },
          content: {
            heading: "Flexible Section Example",
            subheading: "Create custom layouts with grid, absolute positioning, or presets",
            text: "<p>This is a flexible section with a 2x3 grid layout. You can add various element types (hero, text, image, video, banner, button, card, stats, divider, HTML) and position them using Bootstrap grid or absolute positioning.</p>",
          },
        },
        {
          id: "element-2",
          type: "card",
          position: {
            mode: "grid",
            gridRow: 2,
            gridCol: 1,
            gridColSpan: 1,
            gridRowSpan: 1,
          },
          styling: {
            backgroundColor: "#f0f6fc",
            padding: "24px",
            borderRadius: "8px",
          },
          content: {
            cardTitle: "Feature One",
            cardBody: "Add cards to showcase features or services.",
            cardButton: {
              text: "Learn More",
              href: "#",
              variant: "filled",
            },
          },
        },
        {
          id: "element-3",
          type: "stats",
          position: {
            mode: "grid",
            gridRow: 2,
            gridCol: 2,
            gridColSpan: 1,
            gridRowSpan: 1,
          },
          styling: {
            textColor: "#0969da",
            padding: "24px",
          },
          content: {
            statsNumber: "99.9%",
            statsLabel: "Uptime",
            statsIcon: "bi-graph-up-arrow",
          },
        },
        {
          id: "element-4",
          type: "button",
          position: {
            mode: "grid",
            gridRow: 2,
            gridCol: 3,
            gridColSpan: 1,
            gridRowSpan: 1,
          },
          styling: {
            padding: "24px",
          },
          content: {
            buttonText: "Get Started",
            buttonHref: "#contact",
            buttonVariant: "filled",
            buttonIcon: "bi-arrow-right",
          },
        },
      ],
    },
  } as FlexibleSection,
};
