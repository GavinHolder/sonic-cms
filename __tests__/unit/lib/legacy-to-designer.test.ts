import { describe, it, expect } from "vitest";
import {
  elementToBlock,
  designerBlockToElement,
  legacyToDesignerData,
} from "@/lib/flexible/legacy-to-designer";
import type { FlexibleElement } from "@/types/section";

/** The real "Declaration" section card, as stored in prod (legacy mosaic format). */
const declarationCard = {
  id: "el-dec-1",
  type: "card",
  style: { borderRadius: 12, backgroundColor: "var(--theme-card-bg)" },
  content: {
    chips: ["Kleinmond", "Sandbaai", "Betty's Bay", "Hermanus"],
    heading: "Towns we cover",
    subheading: "Greater Overberg",
  },
  position: { colSpan: 12, rowSpan: 1 },
} as unknown as FlexibleElement;

const declarationContent = {
  contentMode: "single",
  layout: { gridGap: 16, layoutMode: "mosaic", gridAutoRows: 210 },
  elements: [declarationCard],
  sectionEyebrow: "A promise to the Overberg",
  sectionHeading: "Reliably serviced. No excuses.",
  sectionSubheading: "We boldly stand behind every connection in our backyard.",
  sectionHeaderVariant: "centered",
};

describe("elementToBlock", () => {
  it("flattens style into bg helper keys and spreads content into props", () => {
    const b = elementToBlock(declarationCard);
    expect(b.type).toBe("card");
    expect(b.id).toBe("el-dec-1");
    expect(b.props.heading).toBe("Towns we cover");
    expect(b.props.subheading).toBe("Greater Overberg");
    expect(b.props.chips).toEqual(["Kleinmond", "Sandbaai", "Betty's Bay", "Hermanus"]);
    expect(b.props.bgColor).toBe("var(--theme-card-bg)");
    expect(b.props.borderRadius).toBe(12);
    expect(b.position.colSpan).toBe(12);
    expect(b.position.rowSpan).toBe(1);
    expect(b.subElements).toEqual([]);
  });

  it("adds editable card defaults (label/cardStyle/glassEffect)", () => {
    const b = elementToBlock(declarationCard);
    expect(b.props.label).toBe("");
    expect(b.props.cardStyle).toBe("flat");
    expect(b.props.glassEffect).toBe("none");
  });
});

describe("round-trip elementToBlock → designerBlockToElement", () => {
  it("preserves type, content, style and mosaic position; strips designer-only keys", () => {
    const back = designerBlockToElement(elementToBlock(declarationCard));
    expect(back.type).toBe("card");
    expect(back.id).toBe("el-dec-1");
    expect(back.content).toEqual({
      chips: ["Kleinmond", "Sandbaai", "Betty's Bay", "Hermanus"],
      heading: "Towns we cover",
      subheading: "Greater Overberg",
    });
    // style reconstructed exactly (theme-token bg must NOT be dropped)
    expect((back as unknown as { style: Record<string, unknown> }).style).toEqual({
      borderRadius: 12,
      backgroundColor: "var(--theme-card-bg)",
    });
    expect(back.position.colSpan).toBe(12);
    expect(back.position.rowSpan).toBe(1);
    expect(back.position.mode).toBe("grid");
    // designer-only helper keys must not leak into rendered content
    expect((back.content as Record<string, unknown>).label).toBeUndefined();
    expect((back.content as Record<string, unknown>).bgColor).toBeUndefined();
    expect((back.content as Record<string, unknown>).cardStyle).toBeUndefined();
  });

  it("preserves a mosaicPreset when present", () => {
    const el = { ...declarationCard, position: { mosaicPreset: "s-wide", colSpan: 8, rowSpan: 1 } } as unknown as FlexibleElement;
    const back = designerBlockToElement(elementToBlock(el));
    expect(back.position.mosaicPreset).toBe("s-wide");
    expect(back.position.colSpan).toBe(8);
  });

  it("does not emit a style object when the element has none", () => {
    const el = { id: "x", type: "card", content: { heading: "Hi" }, position: { colSpan: 6, rowSpan: 1 } } as unknown as FlexibleElement;
    const back = designerBlockToElement(elementToBlock(el));
    expect((back as unknown as { style?: unknown }).style).toBeUndefined();
    expect(back.content).toEqual({ heading: "Hi" });
  });
});

describe("round-trip for non-card element types", () => {
  it("stats: statsNumber/statsLabel stay in content", () => {
    const el = { id: "s1", type: "stats", content: { statsNumber: "99.9%", statsLabel: "Uptime" }, position: { colSpan: 4, rowSpan: 1 } } as unknown as FlexibleElement;
    const back = designerBlockToElement(elementToBlock(el));
    expect(back.type).toBe("stats");
    expect(back.content).toEqual({ statsNumber: "99.9%", statsLabel: "Uptime" });
  });

  it("steps: steps array preserved verbatim", () => {
    const steps = [{ number: "01", heading: "Call", subtext: "Ring us" }];
    const el = { id: "st", type: "steps", content: { steps, stepsNumberWidth: 100 }, position: { colSpan: 12, rowSpan: 1 } } as unknown as FlexibleElement;
    const back = designerBlockToElement(elementToBlock(el));
    expect(back.type).toBe("steps");
    expect((back.content as Record<string, unknown>).steps).toEqual(steps);
    expect((back.content as Record<string, unknown>).stepsNumberWidth).toBe(100);
  });

  it("pricing-tabs: arbitrary content spread through verbatim", () => {
    const el = { id: "pt", type: "pricing-tabs", content: { tabs: [{ label: "Home" }], note: "x" }, position: { colSpan: 12, rowSpan: 1 } } as unknown as FlexibleElement;
    const back = designerBlockToElement(elementToBlock(el));
    expect(back.type).toBe("pricing-tabs");
    expect(back.content).toEqual({ tabs: [{ label: "Home" }], note: "x" });
  });
});

describe("legacyToDesignerData", () => {
  it("emits the buildJson mosaic shape for the Declaration section", () => {
    const json = legacyToDesignerData(declarationContent);
    const d = JSON.parse(json);
    expect(d.layoutType).toBe("mosaic");
    expect(d.positionMode).toBe("grid");
    expect(d.contentMode).toBe("single");
    expect(d.layout).toEqual({ layoutMode: "mosaic", gridAutoRows: 210, gridGap: 16 });
    expect(d.sectionEyebrow).toBe("A promise to the Overberg");
    expect(d.sectionHeading).toBe("Reliably serviced. No excuses.");
    expect(d.sectionSubheading).toBe("We boldly stand behind every connection in our backyard.");
    expect(d.sectionHeaderVariant).toBe("centered");
    expect(d.blocks).toHaveLength(1);
    expect(d.blocks[0].props.chips).toHaveLength(4);
    expect(d.blocks[0].props.heading).toBe("Towns we cover");
  });

  it("returns '' when there are no elements (caller uses its own default)", () => {
    expect(legacyToDesignerData({ elements: [] })).toBe("");
    expect(legacyToDesignerData({})).toBe("");
    expect(legacyToDesignerData(null)).toBe("");
  });

  it("emits a grid payload for a non-mosaic grid layout", () => {
    const json = legacyToDesignerData({
      layout: { type: "grid", rows: 2, cols: 3, gap: 20 },
      elements: [declarationCard],
    });
    const d = JSON.parse(json);
    expect(d.layoutType).toBe("grid");
    expect(d.grid).toEqual({ rows: 2, cols: 3, gap: 20 });
    expect(d.layout).toBeUndefined();
  });

  it("emits a preset payload (default) when layout has no mosaic/grid type", () => {
    const json = legacyToDesignerData({ elements: [declarationCard] });
    const d = JSON.parse(json);
    expect(d.layoutType).toBe("preset");
    expect(d.preset).toBe("2-col-split");
  });
});
