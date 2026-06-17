/**
 * legacy-to-designer — bridge the LEGACY FlexibleSection content format
 * (`content.elements` + `content.layout` + section-header fields) to the
 * Flexible Designer's `designerData` JSON schema (the shape emitted by
 * `public/flexible-designer.html` → `buildJson()`), and back.
 *
 * WHY THIS EXISTS:
 * The public renderer (`FlexibleSectionRenderer`) renders BOTH formats, but the
 * Designer canvas only reads `designerData`. Sections seeded in the legacy format
 * therefore open to a blank canvas. `legacyToDesignerData` synthesises an editable
 * designerData payload at designer-open time (no DB mutation until the user saves);
 * `designerBlockToElement` lets the renderer reuse the existing MosaicLayout /
 * FlexibleElementRenderer for `layoutType: "mosaic"` designerData so a migrated
 * section renders byte-identical to its legacy original.
 *
 * ASSUMPTIONS:
 * 1. Legacy elements store visual styling under `element.style` (NOT the typed
 *    `element.styling`) — this matches both the seeded data and what MosaicLayout
 *    reads via `(el as any).style`.
 * 2. Element-specific content (heading/subheading/chips/steps/statsNumber/…) lives
 *    in `element.content`; it is carried verbatim through `props` so all element
 *    types (card/steps/stats/pricing-tabs) round-trip without per-type logic.
 * 3. Designer-only card helper keys (label/cardStyle/glassEffect/heightMode) and the
 *    style-derived keys (bgColor/bgImage/borderRadius) are stripped from `content`
 *    on the way back so they don't leak into the rendered element's content.
 *
 * These functions are pure (no React/DOM) and unit-tested.
 */

import type { FlexibleElement } from "@/types/section";

/** Keys that live in designerData `props` but belong back on `element.style`. */
const STYLE_KEYS = ["bgColor", "bgImage", "borderRadius"] as const;
/** Designer-only card props that must NOT leak into rendered `element.content`. */
const DESIGNER_CARD_KEYS = ["label", "cardStyle", "glassEffect", "heightMode"] as const;

type LooseRecord = Record<string, unknown>;

interface DesignerBlock {
  id: string;
  type: string;
  position: {
    row?: number;
    col?: number;
    colSpan?: number;
    rowSpan?: number;
    section?: number;
    mosaicPreset?: string;
  };
  props: LooseRecord;
  subElements: unknown[];
}

/**
 * Convert a single legacy FlexibleElement → a Designer block (buildJson shape).
 * Content is spread verbatim into `props`; style is flattened into bg* helper keys
 * so the Designer's card panel can edit them and the inverse can rebuild `style`.
 */
export function elementToBlock(el: FlexibleElement): DesignerBlock {
  const style = ((el as unknown as { style?: LooseRecord }).style) || {};
  const pos = el.position || ({} as FlexibleElement["position"]);
  const props: LooseRecord = { ...el.content };

  if (style.backgroundColor != null) props.bgColor = style.backgroundColor;
  if (style.backgroundImage != null) props.bgImage = style.backgroundImage;
  if (style.borderRadius != null) props.borderRadius = style.borderRadius;

  // Defaults so a migrated card opens cleanly in the Designer's card panel.
  if (el.type === "card") {
    if (props.label == null) props.label = "";
    if (props.cardStyle == null) props.cardStyle = "flat";
    if (props.glassEffect == null) props.glassEffect = "none";
  }

  const position: DesignerBlock["position"] = {
    row: pos.gridRow ?? 1,
    col: pos.gridCol ?? 1,
    colSpan: pos.colSpan ?? 12,
    rowSpan: pos.rowSpan ?? 1,
    section: 0,
  };
  if (pos.mosaicPreset) position.mosaicPreset = pos.mosaicPreset;

  return { id: String(el.id), type: el.type, position, props, subElements: [] };
}

/**
 * Inverse of `elementToBlock`: a Designer block → legacy FlexibleElement.
 * Used by FlexibleSectionRenderer's mosaic branch so designerData mosaic blocks
 * render through the existing MosaicLayout/FlexibleElementRenderer path.
 */
export function designerBlockToElement(block: {
  id: string | number;
  type: string;
  position?: LooseRecord;
  props?: LooseRecord;
}): FlexibleElement {
  const props: LooseRecord = { ...(block.props || {}) };

  const style: LooseRecord = {};
  if (props.borderRadius != null) style.borderRadius = props.borderRadius;
  if (props.bgColor != null && props.bgColor !== "transparent") style.backgroundColor = props.bgColor;
  if (props.bgImage != null) style.backgroundImage = props.bgImage;

  const content: LooseRecord = { ...props };
  for (const k of [...STYLE_KEYS, ...DESIGNER_CARD_KEYS]) delete content[k];

  const pos = (block.position || {}) as LooseRecord;
  const position: FlexibleElement["position"] = {
    mode: "grid",
    gridRow: (pos.row as number) ?? 1,
    gridCol: (pos.col as number) ?? 1,
    colSpan: (pos.colSpan as number) ?? 12,
    rowSpan: (pos.rowSpan as number) ?? 1,
  };
  if (pos.mosaicPreset) position.mosaicPreset = pos.mosaicPreset as FlexibleElement["position"]["mosaicPreset"];

  const el: LooseRecord = {
    id: String(block.id),
    type: block.type,
    position,
    content,
  };
  if (Object.keys(style).length) el.style = style;

  return el as unknown as FlexibleElement;
}

/**
 * Build a Designer-ready `designerData` JSON string from a legacy FlexibleSection
 * `content` object. Emits the exact top-level shape `buildJson()` produces so the
 * Designer's INIT handler loads it directly and a subsequent Save is canonical.
 *
 * Returns "" when there are no legacy elements to convert (caller falls back to its
 * own empty-default payload).
 */
export function legacyToDesignerData(content: LooseRecord | null | undefined): string {
  const c = content || {};
  const elements = (c.elements as FlexibleElement[] | undefined) || [];
  if (elements.length === 0) return "";

  const layout = (c.layout as LooseRecord | undefined) || {};
  const isMosaic = layout.layoutMode === "mosaic";
  const layoutTypeRaw = (layout.type as string | undefined) || "preset";

  const payload: LooseRecord = {
    contentMode: (c.contentMode as string) || "single",
    positionMode: "grid",
    layoutType: isMosaic ? "mosaic" : layoutTypeRaw,
    blocks: elements.map(elementToBlock),
    nextId: elements.length + 100,
  };

  if (isMosaic) {
    payload.layout = {
      layoutMode: "mosaic",
      gridAutoRows: (layout.gridAutoRows as number) ?? 200,
      gridGap: (layout.gridGap as number) ?? 16,
    };
  } else if (layoutTypeRaw === "grid") {
    payload.grid = {
      rows: (layout.rows as number) ?? 2,
      cols: (layout.cols as number) ?? 3,
      gap: (layout.gap as number) ?? 16,
    };
  } else {
    payload.preset = (layout.preset as string) || "2-col-split";
  }

  // Section-header / footer fields pass through unchanged (rendered outside the canvas).
  for (const k of [
    "sectionEyebrow",
    "sectionHeading",
    "sectionSubheading",
    "sectionHeaderVariant",
    "sectionLead",
    "sectionFooter",
  ] as const) {
    if (c[k] != null) payload[k] = c[k];
  }

  return JSON.stringify(payload);
}
