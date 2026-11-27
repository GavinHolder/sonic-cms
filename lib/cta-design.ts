/**
 * Contact-form CTA — the ONE place every presentation decision is made.
 *
 * `resolveCtaDesign(design, ctx)` is pure: it turns the optional `content.design`
 * object into classNames, inline styles and CSS custom properties for each slot of
 * components/sections/CTAFooter.tsx. Hover / focus / placeholder / breakpoint
 * styles cannot be inline, so they live in ONE scoped block in app/globals.css
 * (`.cta-d-*`) that reads only the `--cta-*` variables emitted here.
 *
 * INVARIANTS:
 * 1. No `design` (or a malformed one) returns EXACTLY the literals CTAFooter emitted
 *    before this module existed — proven by __tests__/unit/lib/cta-design.test.ts.
 * 2. Every value read from stored data is validated; a rejected value falls back to
 *    the default for that slot. No resolved string can contain `;` `{` `}` `<` `>`
 *    or `url(`.
 * 3. No colour, font or wording of any particular site lives here. Defaults are the
 *    pre-existing Bootstrap look; everything else comes from section content.
 * 4. A colour override drops that slot's Bootstrap tone class (`text-white`,
 *    `text-dark`, `text-muted` are `!important`, so an inline colour would lose).
 */
import type { CSSProperties } from "react";
import { normalizeFontStack, extractFontFamilyName, buildGoogleFontHref } from "../public/flexible-render-rules.js";

export type CtaTone = "auto" | "light" | "dark";
export type CtaButtonIcon = "send" | "arrow-right" | "none";

export interface CtaDesignCard {
  background?: string;
  radius?: number;
  radiusMobile?: number;
  shadow?: string;
  padding?: number;
  paddingMobile?: number;
  maxWidth?: number;
}

export interface CtaDesignFormCard {
  background?: string;
  radius?: number;
  radiusMobile?: number;
  shadow?: string;
  /** A border colour (1px solid), or "none". */
  border?: string;
  padding?: number;
  paddingMobile?: number;
  titleColor?: string;
}

export interface CtaDesignField {
  background?: string;
  borderColor?: string;
  hoverBorderColor?: string;
  borderWidth?: number;
  radius?: number;
  height?: number;
  textColor?: string;
  placeholderColor?: string;
  labelColor?: string;
  /** Half-width fields become full width on phones. */
  stackOnMobile?: boolean;
}

export interface CtaDesignButton {
  background?: string;
  hover?: string;
  color?: string;
  radius?: number;
  height?: number;
  icon?: CtaButtonIcon;
  iconPosition?: "before" | "after";
  uppercase?: boolean;
  /** Use the heading font for the button label. */
  headingFont?: boolean;
}

export interface CtaDesign {
  /** auto = decide from the section background, as before. */
  tone?: CtaTone;
  /** Veil over the background photo: a colour, or "none". */
  overlay?: string;
  /** ONE panel wrapping both columns. Absent = no panel. */
  card?: CtaDesignCard;
  eyebrowColor?: string;
  headingColor?: string;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
  headingUppercase?: boolean;
  /** Largest heading size in px (scales down on small screens). */
  headingSize?: number;
  headingFont?: string;
  bodyFont?: string;
  contactStyle?: "plain" | "tiles";
  tileBackground?: string;
  tileTextColor?: string;
  tileRadius?: number;
  iconBackground?: string;
  iconColor?: string;
  hideAddressOnMobile?: boolean;
  formCard?: CtaDesignFormCard;
  field?: CtaDesignField;
  button?: CtaDesignButton;
  /** Focus ring for fields, button and contact tiles. */
  focusColor?: string;
  successColor?: string;
  errorColor?: string;
}

export interface CtaDesignContext {
  background?: string;
  hasBgImage: boolean;
  style?: string;
  /** A hint line sits under the form title (tightens the title's bottom margin). */
  hasFormHint?: boolean;
}

export type CtaStyle = CSSProperties & Record<`--${string}`, string>;

export interface CtaSlot {
  className: string;
  style: CtaStyle | undefined;
}

export interface CtaResolvedDesign {
  designed: boolean;
  dark: boolean;
  root: { className: string; vars: Record<string, string> };
  overlay: CSSProperties | null;
  container: { style: CSSProperties };
  card: CtaSlot | null;
  layout: { row: string; left: string; right: string };
  eyebrow: CtaSlot;
  heading: CtaSlot;
  accent: CtaSlot;
  body: CtaSlot;
  contact: {
    mode: "plain" | "tiles";
    list: { className: string; style: CSSProperties | undefined };
    item: string;
    itemLast: string;
    icon: CtaSlot;
    phoneLink: CtaSlot;
    emailLink: CtaSlot;
    address: CtaSlot;
  };
  formCard: { className: string; style: CSSProperties };
  success: CtaSlot;
  title: CtaSlot;
  hint: CtaSlot;
  label: CtaSlot;
  checkLabel: CtaSlot;
  fieldWrap: string;
  /** Extra class for inputs / textareas / selects ("" = none). */
  control: string;
  error: CtaSlot;
  button: { className: string; style: CtaStyle | undefined; iconClassName: string | null; iconPosition: "before" | "after" };
  /** Web font family names the section needs loaded. */
  fonts: string[];
}

/** Weights requested for a design font. 400 is mandatory (Google Fonts css2 rejects a list without it). */
export const CTA_FONT_WEIGHTS: readonly number[] = [400, 500, 600, 700];

/** Google Fonts stylesheet URL for one design font family. */
export function ctaFontHref(family: string): string {
  return buildGoogleFontHref(family, [...CTA_FONT_WEIGHTS]);
}

// ── validation ──────────────────────────────────────────────────────────────

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_COLOR = /^(?:rgb|hsl)a?\(\s*[-0-9.,%\s/]+(?:deg)?[-0-9.,%\s/]*\)$/i;
const UNSAFE = /[;{}<>\\]|url\s*\(/i;
const SHADOW_CHARS = /^[-0-9a-z#.,%()\s/]+$/i;
const SHADOW_WORDS = new Set(["px", "rem", "em", "rgb", "rgba", "hsl", "hsla", "inset", "none", "deg"]);
const FONT_STACK = /^[A-Za-z0-9 ,'"-]+$/;

/** hex / rgb() / rgba() / hsl() / hsla() only; anything else → undefined. */
export function safeCssColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v || v.length > 64 || UNSAFE.test(v)) return undefined;
  return HEX_COLOR.test(v) || FUNC_COLOR.test(v) ? v : undefined;
}

/** "none", or box-shadow layers built only from lengths, `inset` and safe colours. */
export function safeCssShadow(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v || v.length > 200 || UNSAFE.test(v) || !SHADOW_CHARS.test(v)) return undefined;
  const words = v.replace(/#[0-9a-f]{3,8}\b/gi, " ").match(/[a-z]+/gi) ?? [];
  if (!words.every((w) => SHADOW_WORDS.has(w.toLowerCase()))) return undefined;
  if (v.toLowerCase() === "none") return v;
  // Every # token must be a real hex colour, and a layer needs at least two offsets.
  const hexTokens = v.match(/#[^\s,)]*/g) ?? [];
  if (!hexTokens.every((t) => HEX_COLOR.test(t))) return undefined;
  if (!/(?:^|[\s,])-?[0-9.]+(?:px|rem|em)?\s+-?[0-9.]+(?:px|rem|em)?(?:\s|,|$)/i.test(v)) return undefined;
  return v;
}

function safeNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function px(value: unknown, min: number, max: number): string | undefined {
  const n = safeNumber(value, min, max);
  return n === undefined ? undefined : `${n}px`;
}

function safeFontStack(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v || v.length > 120 || !FONT_STACK.test(v)) return undefined;
  return normalizeFontStack(v);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

/** Drops undefined entries; undefined when nothing is left (so React emits no style attribute). */
function compactStyle(style: Record<string, string | number | undefined>): CtaStyle | undefined {
  const entries = Object.entries(style).filter(([, v]) => v !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as CtaStyle) : undefined;
}

function compactVars(vars: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(vars).filter((e): e is [string, string] => e[1] !== undefined));
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Editor-side tidy-up before saving: drops blank values (undefined, "", false) and
 * emptied groups. `card` is kept even when empty, because its presence is itself the
 * "one panel behind both columns" setting. Returns undefined when nothing is left,
 * so the `design` key is removed and the section is back to the classic look.
 */
export function pruneCtaDesign(design: CtaDesign): CtaDesign | undefined {
  const isBlank = (v: unknown) => v === undefined || v === null || v === "" || v === false;
  const entries = Object.entries(design)
    .map(([key, value]): [string, unknown] =>
      asRecord(value) ? [key, Object.fromEntries(Object.entries(value as object).filter(([, v]) => !isBlank(v)))] : [key, value],
    )
    .filter(([key, value]) => {
      if (isBlank(value)) return false;
      const group = asRecord(value);
      return !group || key === "card" || Object.keys(group).length > 0;
    });
  return entries.length > 0 ? (Object.fromEntries(entries) as CtaDesign) : undefined;
}

// ── tone ────────────────────────────────────────────────────────────────────

function isHexDark(hex?: string): boolean {
  if (!hex?.startsWith("#") || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/** The pre-existing rule: light text on blue / dark hex backgrounds, and over a photo in contact-form mode. */
export function ctaAutoDark(ctx: CtaDesignContext): boolean {
  const { background, hasBgImage, style } = ctx;
  return background === "blue" || background === "lightblue" || isHexDark(background) || (hasBgImage && style === "contact-form");
}

const BUTTON_ICONS: Record<Exclude<CtaButtonIcon, "none">, string> = {
  send: "bi bi-send",
  "arrow-right": "bi bi-arrow-right",
};

// ── resolver ────────────────────────────────────────────────────────────────

/**
 * ASSUMPTIONS:
 * 1. `design` is untrusted stored JSON (any shape, any types).
 * 2. `ctx` comes from the component and is trusted.
 * 3. The caller appends `root.className` / spreads `root.vars` on the section root
 *    and renders the `card` wrapper only when `card` is non-null.
 *
 * FAILURE MODES:
 * - Hostile colour/shadow/font string → rejected by the validators → slot default.
 * - Out-of-range number → clamped; non-number → slot default.
 * - A colour applied next to an `!important` Bootstrap tone class would be ignored
 *   → the tone class is dropped whenever that slot's colour is set (invariant 4).
 */
export function resolveCtaDesign(design: unknown, ctx: CtaDesignContext): CtaResolvedDesign {
  const d = asRecord(design);
  const designed = d !== undefined;
  const get = (key: keyof CtaDesign): unknown => (d ? d[key] : undefined);

  const tone = get("tone");
  const dark = tone === "light" ? false : tone === "dark" ? true : ctaAutoDark(ctx);
  const strong = dark ? "text-white" : "text-dark";
  const soft = dark ? "text-white opacity-75" : "text-muted";

  const card = asRecord(get("card"));
  const formCard = asRecord(get("formCard"));
  const field = asRecord(get("field"));
  const button = asRecord(get("button"));

  const headingColor = safeCssColor(get("headingColor"));
  const textColor = safeCssColor(get("textColor"));
  const mutedColor = safeCssColor(get("mutedColor"));
  const eyebrowColor = safeCssColor(get("eyebrowColor"));
  const accentColor = safeCssColor(get("accentColor"));
  const focusColor = safeCssColor(get("focusColor"));
  const successColor = safeCssColor(get("successColor"));
  const errorColor = safeCssColor(get("errorColor"));
  const headingFont = safeFontStack(get("headingFont"));
  const bodyFont = safeFontStack(get("bodyFont"));
  const uppercase = get("headingUppercase") === true;
  const headingSize = safeNumber(get("headingSize"), 24, 96);
  const tiles = get("contactStyle") === "tiles";

  // Overlay — only ever drawn over a photo in contact-form mode (unchanged condition).
  const overlayRaw = get("overlay");
  const overlayColor = safeCssColor(overlayRaw);
  const overlay: CSSProperties | null =
    ctx.hasBgImage && ctx.style === "contact-form" && overlayRaw !== "none"
      ? { position: "absolute", inset: 0, background: overlayColor ?? "rgba(0,0,0,0.45)", pointerEvents: "none" }
      : null;

  // Form card
  const formCardBg = formCard ? safeCssColor(formCard.background) : undefined;
  const formCardBorderColor = formCard ? safeCssColor(formCard.border) : undefined;
  const formCardBorder = formCard?.border === "none" ? "none" : formCardBorderColor ? `1px solid ${formCardBorderColor}` : undefined;
  const formCardShadow = formCard ? safeCssShadow(formCard.shadow) : undefined;
  const titleColor = formCard ? safeCssColor(formCard.titleColor) : undefined;
  const formCardStyle: CSSProperties = {
    background: formCardBg ?? (dark ? "rgba(255,255,255,0.1)" : "#ffffff"),
    backdropFilter: !formCardBg && dark ? "blur(10px)" : undefined,
    border: formCardBorder ?? (dark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #dee2e6"),
    // With an outer card, that card is the one scroll container (no nested scrollbars).
    maxHeight: card ? "none" : "calc(100vh - 200px)",
    overflowY: card ? "visible" : "auto",
    ...(formCardShadow ? { boxShadow: formCardShadow } : {}),
  };

  // Fields
  const labelColor = field ? safeCssColor(field.labelColor) : undefined;

  // Button
  const btnBg = button ? safeCssColor(button.background) : undefined;
  const btnHover = button ? safeCssColor(button.hover) : undefined;
  const btnColor = button ? safeCssColor(button.color) : undefined;
  const btnUpper = button?.uppercase === true;
  const btnIconRaw = button?.icon;
  const btnIcon: CtaButtonIcon = btnIconRaw === "arrow-right" || btnIconRaw === "none" ? btnIconRaw : "send";
  const iconPosition: "before" | "after" = button?.iconPosition === "after" ? "after" : "before";
  const buttonStyle = button
    ? compactStyle({
        "--bs-btn-bg": btnBg,
        "--bs-btn-border-color": btnBg,
        "--bs-btn-disabled-bg": btnBg,
        "--bs-btn-disabled-border-color": btnBg,
        "--bs-btn-hover-bg": btnHover,
        "--bs-btn-hover-border-color": btnHover,
        "--bs-btn-active-bg": btnHover,
        "--bs-btn-active-border-color": btnHover,
        "--bs-btn-color": btnColor,
        "--bs-btn-hover-color": btnColor,
        "--bs-btn-active-color": btnColor,
        "--bs-btn-disabled-color": btnColor,
        "--bs-btn-border-radius": px(button.radius, 0, 80),
        minHeight: px(button.height, 32, 96),
        textTransform: btnUpper ? "uppercase" : undefined,
        letterSpacing: btnUpper ? "0.08em" : undefined,
        fontFamily: button.headingFont === true ? headingFont : undefined,
      })
    : undefined;

  const vars = compactVars({
    "--cta-focus": focusColor,
    "--cta-error": errorColor,
    "--cta-muted": mutedColor,
    "--cta-card-radius": card ? px(card.radius, 0, 80) : undefined,
    "--cta-card-radius-m": card ? px(card.radiusMobile, 0, 80) : undefined,
    "--cta-card-pad": card ? px(card.padding, 0, 120) : undefined,
    "--cta-card-pad-m": card ? px(card.paddingMobile, 0, 120) : undefined,
    "--cta-card-max": card ? px(card.maxWidth, 480, 1320) : undefined,
    "--cta-panel-radius": formCard ? px(formCard.radius, 0, 80) : undefined,
    "--cta-panel-radius-m": formCard ? px(formCard.radiusMobile, 0, 80) : undefined,
    "--cta-panel-pad": formCard ? px(formCard.padding, 0, 80) : undefined,
    "--cta-panel-pad-m": formCard ? px(formCard.paddingMobile, 0, 80) : undefined,
    "--cta-field-bg": field ? safeCssColor(field.background) : undefined,
    "--cta-field-border": field ? safeCssColor(field.borderColor) : undefined,
    "--cta-field-hover": field ? safeCssColor(field.hoverBorderColor) : undefined,
    "--cta-field-bw": field ? px(field.borderWidth, 0, 4) : undefined,
    "--cta-field-radius": field ? px(field.radius, 0, 40) : undefined,
    "--cta-field-h": field ? px(field.height, 32, 80) : undefined,
    "--cta-field-color": field ? safeCssColor(field.textColor) : undefined,
    "--cta-field-ph": field ? safeCssColor(field.placeholderColor) : undefined,
    "--cta-tile-bg": safeCssColor(get("tileBackground")),
    "--cta-tile-color": safeCssColor(get("tileTextColor")),
    "--cta-tile-radius": px(get("tileRadius"), 0, 40),
    "--cta-ico-bg": safeCssColor(get("iconBackground")),
    "--cta-ico-color": safeCssColor(get("iconColor")),
  });

  const alertStyle = (color: string | undefined, base: Record<string, string | number | undefined>): CtaStyle | undefined =>
    compactStyle({
      ...base,
      "--bs-alert-color": color,
      "--bs-alert-bg": color ? `color-mix(in srgb, ${color} 10%, transparent)` : undefined,
      "--bs-alert-border-color": color ? "transparent" : undefined,
    });

  const linkTone = dark ? "text-white text-decoration-none" : "text-dark text-decoration-none";
  const fonts = [headingFont, bodyFont]
    .map((stack) => (stack ? extractFontFamilyName(stack) : ""))
    .filter((name, i, all) => name !== "" && all.indexOf(name) === i);

  return {
    designed,
    dark,
    root: { className: cx(designed && "cta-designed", focusColor && "cta-has-focus"), vars },
    overlay,
    container: { style: { maxWidth: "1320px", margin: "0 auto", ...(bodyFont ? { fontFamily: bodyFont } : {}) } },
    card: card
      ? {
          className: "cta-d-card",
          style: compactStyle({ background: safeCssColor(card.background), boxShadow: safeCssShadow(card.shadow) }),
        }
      : null,
    layout: card
      ? { row: "cta-d-grid", left: "cta-d-col", right: "cta-d-col" }
      : { row: "row align-items-center gy-5", left: "col-lg-5", right: "col-lg-6 ms-lg-auto" },
    eyebrow: {
      className: cx("cta-d-eyebrow", !eyebrowColor && soft),
      style: compactStyle({ color: eyebrowColor, fontFamily: headingFont }),
    },
    heading: {
      className: headingColor ? "display-5 fw-bold mb-3" : `display-5 fw-bold mb-3 ${strong}`,
      style: compactStyle({
        color: headingColor,
        fontFamily: headingFont,
        textTransform: uppercase ? "uppercase" : undefined,
        fontSize: headingSize !== undefined ? `clamp(${Math.round(headingSize * 0.6)}px, 4.2vw, ${headingSize}px)` : undefined,
        lineHeight: headingSize !== undefined ? 1.05 : undefined,
      }),
    },
    accent: { className: "cta-d-accent", style: compactStyle({ color: accentColor }) },
    body: {
      className: textColor ? "lead mb-4" : `lead mb-4 ${soft}`,
      style: compactStyle({ color: textColor }),
    },
    contact: {
      mode: tiles ? "tiles" : "plain",
      list: tiles
        ? { className: cx("cta-d-ways", get("hideAddressOnMobile") === true && "cta-d-ways--hide-addr"), style: undefined }
        : { className: "list-unstyled mb-0", style: { marginTop: 8 } },
      item: "mb-3 d-flex align-items-center gap-2",
      itemLast: "d-flex align-items-center gap-2",
      icon: { className: mutedColor ? "fs-5" : `fs-5 ${soft}`, style: compactStyle({ color: mutedColor }) },
      phoneLink: {
        className: textColor ? "text-decoration-none fw-semibold" : `${linkTone} fw-semibold`,
        style: compactStyle({ color: textColor }),
      },
      emailLink: {
        className: textColor ? "text-decoration-none" : `${linkTone}`,
        style: compactStyle({ color: textColor }),
      },
      address: { className: textColor ? "" : `${soft}`, style: compactStyle({ color: textColor }) },
    },
    formCard: { className: formCard ? "cta-d-panel" : "p-4 rounded-3", style: formCardStyle },
    success: {
      className: `alert ${dark ? "alert-light" : "alert-success"} text-center mb-0`,
      style: alertStyle(successColor, {}),
    },
    title: {
      className: `fw-semibold ${ctx.hasFormHint ? "mb-1" : "mb-3"}${titleColor ? "" : ` ${strong}`}`,
      style: compactStyle({
        color: titleColor,
        fontFamily: headingFont,
        textTransform: uppercase ? "uppercase" : undefined,
        letterSpacing: uppercase ? "0.02em" : undefined,
      }),
    },
    hint: { className: cx("cta-d-hint", !mutedColor && soft), style: compactStyle({ color: mutedColor }) },
    label: {
      className: field ? cx("form-label", "cta-d-label", !labelColor && dark && "text-white") : `form-label ${dark ? "text-white" : ""}`,
      style: compactStyle({ fontSize: 14, color: labelColor }),
    },
    checkLabel: {
      className: labelColor ? "form-check-label" : `form-check-label ${dark ? "text-white" : ""}`,
      style: compactStyle({ color: labelColor }),
    },
    fieldWrap: cx("mb-3", field?.stackOnMobile === true && "cta-d-stack"),
    control: field ? "cta-d-field" : "",
    error: { className: "alert alert-warning py-2 mb-3", style: alertStyle(errorColor, { fontSize: 13 }) },
    button: {
      className: cx("btn w-100", dark ? (btnColor ? "btn-light" : "btn-light text-primary") : "btn-primary", button && "cta-d-btn"),
      style: buttonStyle,
      iconClassName: btnIcon === "none" ? null : `${BUTTON_ICONS[btnIcon]} ${iconPosition === "after" ? "ms-2" : "me-2"}`,
      iconPosition,
    },
    fonts,
  };
}
