import { describe, it, expect } from "vitest";
import {
  HERO_FACTS_MAX,
  HERO_LIGHT_INK,
  HERO_TONE_ATTR,
  heroDotsVisible,
  heroTabsEnabled,
  normalizeHeroFacts,
  resolveFactsColors,
  resolveHeroControlColors,
  resolveHeroTabsPalette,
  resolveSlideFacts,
  resolveSlideTone,
  resolveTabLabel,
} from "@/lib/hero/hero-slide-extras";

/** WCAG relative luminance / contrast, for the "dark controls are readable on a light slide" checks. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("resolveSlideTone", () => {
  it("is dark when the field is absent (today's behaviour)", () => {
    expect(resolveSlideTone({})).toBe("dark");
    expect(resolveSlideTone({ tone: undefined })).toBe("dark");
  });
  it("is light only for the exact value 'light'", () => {
    expect(resolveSlideTone({ tone: "light" })).toBe("light");
    expect(resolveSlideTone({ tone: "dark" })).toBe("dark");
  });
  it("never throws on bad stored data", () => {
    for (const bad of [null, undefined, 3, "light", [], { tone: 1 }, { tone: "LIGHT" }, { tone: null }, { tone: {} }]) {
      expect(resolveSlideTone(bad)).toBe("dark");
    }
  });
});

describe("resolveHeroControlColors", () => {
  it("dark tone returns the exact colours the carousel has always used", () => {
    expect(resolveHeroControlColors("dark")).toEqual({
      dotActive: "#fff",
      dotIdle: "rgba(255,255,255,0.4)",
      control: "rgba(255,255,255,0.7)",
      counter: "rgba(255,255,255,0.7)",
      meta: "rgba(255,255,255,0.55)",
      scrollLabel: "rgba(255,255,255,0.5)",
      scrollTrack: "rgba(255,255,255,0.15)",
    });
  });
  it("light tone uses ink colours with at least 3:1 contrast on the light background", () => {
    const c = resolveHeroControlColors("light");
    for (const key of ["dotActive", "dotIdle", "control", "counter", "meta", "scrollLabel"] as const) {
      expect(c[key]).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrast(c[key], "#eef1f6")).toBeGreaterThanOrEqual(3);
      expect(c[key]).not.toBe("#000000");
    }
    expect(c.dotActive).toBe(HERO_LIGHT_INK.strong);
    expect(c.dotActive).not.toBe(c.dotIdle);
  });
});

describe("normalizeHeroFacts", () => {
  it("returns [] for anything that is not an array", () => {
    for (const bad of [undefined, null, "a", 5, {}, { 0: { title: "a", text: "b" } }, true]) {
      expect(normalizeHeroFacts(bad)).toEqual([]);
    }
  });
  it("keeps valid rows, trimmed", () => {
    expect(normalizeHeroFacts([{ title: "  Local support ", text: " Based here " }])).toEqual([
      { title: "Local support", text: "Based here" },
    ]);
  });
  it("coerces non-string values to empty and drops rows with nothing to show", () => {
    expect(
      normalizeHeroFacts([
        { title: 5, text: "kept" },
        { title: "only title" },
        { title: "", text: "   " },
        null,
        "string",
        [],
        { title: {}, text: [] },
      ])
    ).toEqual([
      { title: "", text: "kept" },
      { title: "only title", text: "" },
    ]);
  });
  it(`clamps to ${HERO_FACTS_MAX} rows, counting only rows that survive`, () => {
    const many = [null, ...Array.from({ length: 7 }, (_, i) => ({ title: `t${i}`, text: `x${i}` }))];
    const out = normalizeHeroFacts(many);
    expect(HERO_FACTS_MAX).toBe(4);
    expect(out).toHaveLength(4);
    expect(out[0].title).toBe("t0");
    expect(out[3].title).toBe("t3");
  });
  it("does not mutate its input", () => {
    const input = [{ title: " a ", text: " b " }];
    normalizeHeroFacts(input);
    expect(input).toEqual([{ title: " a ", text: " b " }]);
  });
});

describe("resolveSlideFacts", () => {
  const facts = [{ title: "A", text: "b" }];
  it("is empty when nothing is set (existing slides render no facts row)", () => {
    expect(resolveSlideFacts({})).toEqual([]);
    expect(resolveSlideFacts({ overlay: {} })).toEqual([]);
    expect(resolveSlideFacts(null)).toEqual([]);
    expect(resolveSlideFacts({ overlay: "x" })).toEqual([]);
  });
  it("returns the facts for the flow layout", () => {
    expect(resolveSlideFacts({ overlay: { facts } })).toEqual(facts);
    expect(resolveSlideFacts({ overlay: { facts, layoutMode: "preset" } })).toEqual(facts);
  });
  it("is empty in freeform mode and when the text overlay is off", () => {
    expect(resolveSlideFacts({ overlay: { facts, layoutMode: "freeform" } })).toEqual([]);
    expect(resolveSlideFacts({ showTextOverlay: false, overlay: { facts } })).toEqual([]);
  });
});

describe("resolveFactsColors", () => {
  it("follows the slide's own text colours", () => {
    expect(
      resolveFactsColors({ headingRows: [{ color: "#0e1326" }, { color: "#e31e24" }], heading: { color: "#111111" }, subheading: { color: "#3b4358" } })
    ).toEqual({ title: "#0e1326", text: "#3b4358" });
  });
  it("falls back heading rows -> legacy heading -> white, and text -> title", () => {
    expect(resolveFactsColors({ heading: { color: "#123456" } })).toEqual({ title: "#123456", text: "#123456" });
    expect(resolveFactsColors({ headingRows: [], heading: { color: "#123456" } }).title).toBe("#123456");
    expect(resolveFactsColors({})).toEqual({ title: "#ffffff", text: "#ffffff" });
    expect(resolveFactsColors(undefined)).toEqual({ title: "#ffffff", text: "#ffffff" });
    expect(resolveFactsColors({ headingRows: [{ color: 4 }], subheading: { color: "" } })).toEqual({ title: "#ffffff", text: "#ffffff" });
  });
});

describe("resolveTabLabel", () => {
  it("prefers tabLabel, then name, then a numbered fallback", () => {
    expect(resolveTabLabel({ tabLabel: "Fibre", name: "Slide about fibre" }, 1)).toBe("Fibre");
    expect(resolveTabLabel({ name: "Wireless" }, 2)).toBe("Wireless");
    expect(resolveTabLabel({}, 0)).toBe("Slide 1");
  });
  it("treats blank and non-string values as missing", () => {
    expect(resolveTabLabel({ tabLabel: "   ", name: " Voice " }, 4)).toBe("Voice");
    expect(resolveTabLabel({ tabLabel: 7, name: null }, 2)).toBe("Slide 3");
    expect(resolveTabLabel(null, 0)).toBe("Slide 1");
  });
});

describe("heroTabsEnabled / heroDotsVisible", () => {
  it("tabs need the exact flag and more than one slide", () => {
    expect(heroTabsEnabled(true, 5)).toBe(true);
    expect(heroTabsEnabled(true, 1)).toBe(false);
    expect(heroTabsEnabled(undefined, 5)).toBe(false);
    expect(heroTabsEnabled(false, 5)).toBe(false);
    expect(heroTabsEnabled("true", 5)).toBe(false);
    expect(heroTabsEnabled(1, 5)).toBe(false);
  });
  it("dots are unchanged without tabs and hidden with tabs", () => {
    expect(heroDotsVisible(true, 3, false)).toBe(true);
    expect(heroDotsVisible(false, 3, false)).toBe(false);
    expect(heroDotsVisible(true, 1, false)).toBe(false);
    expect(heroDotsVisible(true, 3, true)).toBe(false);
  });
});

describe("resolveHeroTabsPalette", () => {
  it("gives a readable palette for each tone", () => {
    const light = resolveHeroTabsPalette("light");
    const dark = resolveHeroTabsPalette("dark");
    expect(contrast(light.text, "#eef1f6")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.textActive, "#eef1f6")).toBeGreaterThanOrEqual(4.5);
    expect(light.textActive).toBe(HERO_LIGHT_INK.strong);
    expect(dark.text).not.toBe(light.text);
    for (const p of [light, dark]) {
      for (const v of Object.values(p)) expect(typeof v).toBe("string");
    }
  });
});

describe("HERO_TONE_ATTR", () => {
  it("is a data attribute the navbar CSS can scope to", () => {
    expect(HERO_TONE_ATTR).toBe("data-hero-tone");
  });
});

describe("resolveHeroTabsAccent", () => {
  it("uses a stored colour and falls back to the hero accent", async () => {
    const { resolveHeroTabsAccent, HERO_TABS_DEFAULT_ACCENT } = await import("@/lib/hero/hero-slide-extras");
    expect(resolveHeroTabsAccent(" #e31e24 ")).toBe("#e31e24");
    expect(resolveHeroTabsAccent("var(--bs-primary)")).toBe("var(--bs-primary)");
    for (const bad of [undefined, null, "", "   ", 5, {}, "red; background: url(x)", "red}</style>"]) {
      expect(resolveHeroTabsAccent(bad)).toBe(HERO_TABS_DEFAULT_ACCENT);
    }
  });
});

describe("editableHeroFacts", () => {
  it("keeps blank and untrimmed rows for editing, still capped and type-safe", async () => {
    const { editableHeroFacts } = await import("@/lib/hero/hero-slide-extras");
    expect(editableHeroFacts(undefined)).toEqual([]);
    expect(editableHeroFacts("x")).toEqual([]);
    expect(editableHeroFacts([{ title: "", text: "" }, { title: " a ", text: 3 }, null])).toEqual([
      { title: "", text: "" },
      { title: " a ", text: "" },
    ]);
    expect(editableHeroFacts(Array.from({ length: 9 }, () => ({ title: "t", text: "x" })))).toHaveLength(4);
  });
});
