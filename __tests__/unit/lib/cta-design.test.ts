import { describe, it, expect } from "vitest";
import { resolveCtaDesign, ctaAutoDark, safeCssColor, safeCssShadow, pruneCtaDesign, ctaFontHref, type CtaDesignContext } from "@/lib/cta-design";

/**
 * ORACLE — the literals CTAFooter.tsx emitted in contact-form mode BEFORE the design
 * resolver existed (copied from the component at commit 380fb54). With no `design`
 * the resolver must reproduce every one of them exactly.
 */
function legacyIsDark(background: string | undefined, hasBgImage: boolean, style: string | undefined): boolean {
  const isHexDark = (hex?: string) => {
    if (!hex?.startsWith("#") || hex.length < 7) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  };
  return background === "blue" || background === "lightblue" || isHexDark(background) || (hasBgImage && style === "contact-form");
}

function legacy(isBlueBackground: boolean, hasBgImage: boolean, style: string | undefined) {
  return {
    overlay:
      hasBgImage && style === "contact-form"
        ? { position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", pointerEvents: "none" }
        : null,
    containerStyle: { maxWidth: "1320px", margin: "0 auto" },
    row: "row align-items-center gy-5",
    left: "col-lg-5",
    right: "col-lg-6 ms-lg-auto",
    heading: `display-5 fw-bold mb-3 ${isBlueBackground ? "text-white" : "text-dark"}`,
    body: `lead mb-4 ${isBlueBackground ? "text-white opacity-75" : "text-muted"}`,
    list: "list-unstyled mb-0",
    listStyle: { marginTop: 8 },
    item: "mb-3 d-flex align-items-center gap-2",
    itemLast: "d-flex align-items-center gap-2",
    phoneIcon: `bi bi-telephone-fill fs-5 ${isBlueBackground ? "text-white opacity-75" : "text-muted"}`,
    phoneLink: `${isBlueBackground ? "text-white text-decoration-none" : "text-dark text-decoration-none"} fw-semibold`,
    emailLink: `${isBlueBackground ? "text-white text-decoration-none" : "text-dark text-decoration-none"}`,
    address: `${isBlueBackground ? "text-white opacity-75" : "text-muted"}`,
    formCard: "p-4 rounded-3",
    formCardStyle: {
      background: isBlueBackground ? "rgba(255,255,255,0.1)" : "#ffffff",
      backdropFilter: isBlueBackground ? "blur(10px)" : undefined,
      border: isBlueBackground ? "1px solid rgba(255,255,255,0.2)" : "1px solid #dee2e6",
      maxHeight: "calc(100vh - 200px)",
      overflowY: "auto",
    },
    success: `alert ${isBlueBackground ? "alert-light" : "alert-success"} text-center mb-0`,
    title: `fw-semibold mb-3 ${isBlueBackground ? "text-white" : "text-dark"}`,
    label: `form-label ${isBlueBackground ? "text-white" : ""}`,
    labelStyle: { fontSize: 14 },
    checkLabel: `form-check-label ${isBlueBackground ? "text-white" : ""}`,
    fieldWrap: "mb-3",
    error: "alert alert-warning py-2 mb-3",
    errorStyle: { fontSize: 13 },
    button: `btn w-100 ${isBlueBackground ? "btn-light text-primary" : "btn-primary"}`,
    buttonIcon: "bi bi-send me-2",
  };
}

const BACKGROUNDS: Array<string | undefined> = [undefined, "white", "gray", "blue", "lightblue", "transparent", "#101820", "#F6F2EC", "#abc", "rgb(0,0,0)"];
const STYLES: Array<string | undefined> = ["contact-form", "banner", undefined];

function ctxOf(background: string | undefined, hasBgImage: boolean, style: string | undefined): CtaDesignContext {
  return { background, hasBgImage, style };
}

function expectLegacy(r: ReturnType<typeof resolveCtaDesign>, o: ReturnType<typeof legacy>) {
  expect(r.designed).toBe(false);
  expect(r.root.className).toBe("");
  expect(r.root.vars).toEqual({});
  expect(r.overlay).toEqual(o.overlay);
  expect(r.container.style).toEqual(o.containerStyle);
  expect(r.card).toBeNull();
  expect(r.layout).toEqual({ row: o.row, left: o.left, right: o.right });
  expect(r.heading).toEqual({ className: o.heading, style: undefined });
  expect(r.body).toEqual({ className: o.body, style: undefined });
  expect(r.contact.mode).toBe("plain");
  expect(r.contact.list).toEqual({ className: o.list, style: o.listStyle });
  expect(r.contact.item).toBe(o.item);
  expect(r.contact.itemLast).toBe(o.itemLast);
  expect(`bi bi-telephone-fill ${r.contact.icon.className}`).toBe(o.phoneIcon);
  expect(r.contact.icon.style).toBeUndefined();
  expect(r.contact.phoneLink).toEqual({ className: o.phoneLink, style: undefined });
  expect(r.contact.emailLink).toEqual({ className: o.emailLink, style: undefined });
  expect(r.contact.address).toEqual({ className: o.address, style: undefined });
  expect(r.formCard.className).toBe(o.formCard);
  expect(r.formCard.style).toEqual(o.formCardStyle);
  expect(r.success).toEqual({ className: o.success, style: undefined });
  expect(r.title).toEqual({ className: o.title, style: undefined });
  expect(r.label).toEqual({ className: o.label, style: o.labelStyle });
  expect(r.checkLabel).toEqual({ className: o.checkLabel, style: undefined });
  expect(r.fieldWrap).toBe(o.fieldWrap);
  expect(r.control).toBe("");
  expect(r.error).toEqual({ className: o.error, style: o.errorStyle });
  expect(r.button.className).toBe(o.button);
  expect(r.button.style).toBeUndefined();
  expect(r.button.iconClassName).toBe(o.buttonIcon);
  expect(r.button.iconPosition).toBe("before");
  expect(r.fonts).toEqual([]);
}

describe("resolveCtaDesign — no design reproduces the pre-existing look exactly", () => {
  for (const background of BACKGROUNDS) {
    for (const hasBgImage of [false, true]) {
      for (const style of STYLES) {
        it(`background=${String(background)} image=${hasBgImage} style=${String(style)}`, () => {
          const dark = legacyIsDark(background, hasBgImage, style);
          expect(ctaAutoDark(ctxOf(background, hasBgImage, style))).toBe(dark);
          const r = resolveCtaDesign(undefined, ctxOf(background, hasBgImage, style));
          expect(r.dark).toBe(dark);
          expectLegacy(r, legacy(dark, hasBgImage, style));
        });
      }
    }
  }

  it.each([null, "x", 7, [], true])("a malformed design (%j) is treated as no design", (bad) => {
    expectLegacy(resolveCtaDesign(bad, ctxOf("blue", true, "contact-form")), legacy(true, true, "contact-form"));
  });

  it("a form hint alone only tightens the title margin", () => {
    const r = resolveCtaDesign(undefined, { ...ctxOf("white", false, "contact-form"), hasFormHint: true });
    expect(r.title.className).toBe("fw-semibold mb-1 text-dark");
    expect(r.hint).toEqual({ className: "cta-d-hint text-muted", style: undefined });
  });

  it("an empty design object changes no slot, only marks the section as designed", () => {
    for (const hasBgImage of [false, true]) {
      const ctx = ctxOf("white", hasBgImage, "contact-form");
      const base = resolveCtaDesign(undefined, ctx);
      const r = resolveCtaDesign({}, ctx);
      expect(r.designed).toBe(true);
      expect(r.root).toEqual({ className: "cta-designed", vars: {} });
      expect({ ...r, designed: false, root: base.root }).toEqual(base);
    }
  });
});

describe("resolveCtaDesign — tone", () => {
  const photo = ctxOf("transparent", true, "contact-form");
  it("auto matches the existing logic", () => {
    expect(resolveCtaDesign({ tone: "auto" }, photo).dark).toBe(true);
    expect(resolveCtaDesign({ tone: "auto" }, ctxOf("white", false, "contact-form")).dark).toBe(false);
    expect(resolveCtaDesign({ tone: "nonsense" }, photo).dark).toBe(true);
  });
  it("light forces dark-on-light classes even over a photo", () => {
    const r = resolveCtaDesign({ tone: "light" }, photo);
    expect(r.dark).toBe(false);
    expect(r.heading.className).toBe("display-5 fw-bold mb-3 text-dark");
    expect(r.button.className).toBe("btn w-100 btn-primary");
    expect(r.formCard.style.background).toBe("#ffffff");
  });
  it("dark forces light-on-dark classes on a white background", () => {
    const r = resolveCtaDesign({ tone: "dark" }, ctxOf("white", false, "contact-form"));
    expect(r.dark).toBe(true);
    expect(r.body.className).toBe("lead mb-4 text-white opacity-75");
  });
});

/** Slots that differ between two resolved results. */
function changedSlots(a: ReturnType<typeof resolveCtaDesign>, b: ReturnType<typeof resolveCtaDesign>): string[] {
  const keys = Object.keys(a) as Array<keyof typeof a>;
  return keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(String).sort();
}

describe("resolveCtaDesign — each override changes only its own slot", () => {
  const ctx: CtaDesignContext = { ...ctxOf("transparent", true, "contact-form"), hasFormHint: true };
  const base = resolveCtaDesign({}, ctx);
  const cases: Array<[string, Record<string, unknown>, string[]]> = [
    ["overlay colour", { overlay: "rgba(0,0,0,0.2)" }, ["overlay"]],
    ["overlay none", { overlay: "none" }, ["overlay"]],
    ["eyebrow colour", { eyebrowColor: "#123456" }, ["eyebrow"]],
    ["heading colour", { headingColor: "#123456" }, ["heading"]],
    ["heading uppercase", { headingUppercase: true }, ["heading", "title"]],
    ["heading size", { headingSize: 56 }, ["heading"]],
    ["accent colour", { accentColor: "#123456" }, ["accent"]],
    ["text colour", { textColor: "#123456" }, ["body", "contact"]],
    ["muted colour", { mutedColor: "#123456" }, ["contact", "hint", "root"]],
    ["form card", { formCard: { background: "#fefefe" } }, ["formCard"]],
    ["form card radius", { formCard: { radius: 16 } }, ["formCard", "root"]],
    ["form title colour", { formCard: { titleColor: "#123456" } }, ["formCard", "title"]],
    ["field", { field: { borderColor: "#123456" } }, ["control", "label", "root"]],
    ["field label colour", { field: { labelColor: "#123456" } }, ["checkLabel", "control", "label"]],
    ["field stack", { field: { stackOnMobile: true } }, ["control", "fieldWrap", "label"]],
    ["button", { button: { background: "#123456" } }, ["button"]],
    ["focus colour", { focusColor: "#123456" }, ["root"]],
    ["success colour", { successColor: "#123456" }, ["success"]],
    ["error colour", { errorColor: "#123456" }, ["error", "root"]],
    ["tiles", { contactStyle: "tiles" }, ["contact"]],
    ["card", { card: { background: "#ffffff" } }, ["card", "formCard", "layout"]],
    ["heading font", { headingFont: "'Space Grotesk', sans-serif" }, ["eyebrow", "fonts", "heading", "title"]],
    ["body font", { bodyFont: "'Inter', sans-serif" }, ["container", "fonts"]],
  ];
  it.each(cases)("%s", (_name, design, expected) => {
    expect(changedSlots(base, resolveCtaDesign(design, ctx))).toEqual([...expected].sort());
  });
});

describe("resolveCtaDesign — values", () => {
  const ctx = ctxOf("transparent", true, "contact-form");

  it("a colour override drops the !important tone class so the colour can apply", () => {
    const r = resolveCtaDesign({ headingColor: "#16181D", textColor: "#3A3D44" }, ctx);
    expect(r.heading).toEqual({ className: "display-5 fw-bold mb-3", style: { color: "#16181D" } });
    expect(r.body).toEqual({ className: "lead mb-4", style: { color: "#3A3D44" } });
  });

  it("card: one panel, grid layout, inner form card stops scrolling on its own", () => {
    const r = resolveCtaDesign(
      { card: { background: "rgba(246,242,236,0.95)", radius: 20, radiusMobile: 16, shadow: "0 24px 60px rgba(0,0,0,.28)", padding: 48, paddingMobile: 20, maxWidth: 1120 } },
      ctx,
    );
    expect(r.card).toEqual({ className: "cta-d-card", style: { background: "rgba(246,242,236,0.95)", boxShadow: "0 24px 60px rgba(0,0,0,.28)" } });
    expect(r.layout).toEqual({ row: "cta-d-grid", left: "cta-d-col", right: "cta-d-col" });
    expect(r.root.vars).toEqual({
      "--cta-card-radius": "20px",
      "--cta-card-radius-m": "16px",
      "--cta-card-pad": "48px",
      "--cta-card-pad-m": "20px",
      "--cta-card-max": "1120px",
    });
    expect(r.formCard.style.maxHeight).toBe("none");
    expect(r.formCard.style.overflowY).toBe("visible");
  });

  it("form card: var-driven padding/radius, border and shadow", () => {
    const r = resolveCtaDesign({ formCard: { background: "#FEFDFB", radius: 16, padding: 28, paddingMobile: 18, border: "none", shadow: "none" } }, ctx);
    expect(r.formCard.className).toBe("cta-d-panel");
    expect(r.formCard.style).toMatchObject({ background: "#FEFDFB", border: "none", boxShadow: "none", maxHeight: "calc(100vh - 200px)", overflowY: "auto" });
    expect(r.formCard.style.backdropFilter).toBeUndefined();
    expect(r.root.vars).toEqual({ "--cta-panel-radius": "16px", "--cta-panel-pad": "28px", "--cta-panel-pad-m": "18px" });
  });

  it("fields: class + variables only", () => {
    const r = resolveCtaDesign(
      { field: { background: "#FFFDFA", borderColor: "#8A8478", hoverBorderColor: "#16181D", borderWidth: 1.5, radius: 10, height: 48, textColor: "#16181D", placeholderColor: "#7A7D85", labelColor: "#16181D" } },
      ctx,
    );
    expect(r.control).toBe("cta-d-field");
    expect(r.label).toEqual({ className: "form-label cta-d-label", style: { fontSize: 14, color: "#16181D" } });
    expect(r.root.vars).toEqual({
      "--cta-field-bg": "#FFFDFA",
      "--cta-field-border": "#8A8478",
      "--cta-field-hover": "#16181D",
      "--cta-field-bw": "1.5px",
      "--cta-field-radius": "10px",
      "--cta-field-h": "48px",
      "--cta-field-color": "#16181D",
      "--cta-field-ph": "#7A7D85",
    });
  });

  it("button: Bootstrap button variables, icon choice and position", () => {
    const r = resolveCtaDesign(
      { button: { background: "#E31E24", hover: "#CC1A20", color: "#FEFDFB", radius: 10, height: 52, icon: "arrow-right", iconPosition: "after", uppercase: true } },
      ctx,
    );
    expect(r.button.className).toBe("btn w-100 btn-light cta-d-btn");
    expect(r.button.iconClassName).toBe("bi bi-arrow-right ms-2");
    expect(r.button.iconPosition).toBe("after");
    expect(r.button.style).toEqual({
      "--bs-btn-bg": "#E31E24",
      "--bs-btn-border-color": "#E31E24",
      "--bs-btn-disabled-bg": "#E31E24",
      "--bs-btn-disabled-border-color": "#E31E24",
      "--bs-btn-hover-bg": "#CC1A20",
      "--bs-btn-hover-border-color": "#CC1A20",
      "--bs-btn-active-bg": "#CC1A20",
      "--bs-btn-active-border-color": "#CC1A20",
      "--bs-btn-color": "#FEFDFB",
      "--bs-btn-hover-color": "#FEFDFB",
      "--bs-btn-active-color": "#FEFDFB",
      "--bs-btn-disabled-color": "#FEFDFB",
      "--bs-btn-border-radius": "10px",
      minHeight: "52px",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    });
    expect(resolveCtaDesign({ button: { icon: "none" } }, ctx).button.iconClassName).toBeNull();
    expect(resolveCtaDesign({ button: { icon: "send", iconPosition: "after" } }, ctx).button.iconClassName).toBe("bi bi-send ms-2");
    expect(resolveCtaDesign({ button: { icon: "rocket" } }, ctx).button.iconClassName).toBe("bi bi-send me-2");
  });

  it("tiles: list classes and variables", () => {
    const r = resolveCtaDesign(
      { contactStyle: "tiles", tileBackground: "#FEFDFB", tileTextColor: "#16181D", tileRadius: 10, iconBackground: "#E31E24", iconColor: "#FEFDFB", hideAddressOnMobile: true, mutedColor: "#5F636C" },
      ctx,
    );
    expect(r.contact.mode).toBe("tiles");
    expect(r.contact.list).toEqual({ className: "cta-d-ways cta-d-ways--hide-addr", style: undefined });
    expect(r.root.vars).toEqual({
      "--cta-muted": "#5F636C",
      "--cta-tile-bg": "#FEFDFB",
      "--cta-tile-color": "#16181D",
      "--cta-tile-radius": "10px",
      "--cta-ico-bg": "#E31E24",
      "--cta-ico-color": "#FEFDFB",
    });
  });

  it("focus colour marks the root and exposes the variable", () => {
    const r = resolveCtaDesign({ focusColor: "#E31E24" }, ctx);
    expect(r.root).toEqual({ className: "cta-designed cta-has-focus", vars: { "--cta-focus": "#E31E24" } });
  });

  it("fonts: safe stacks applied, family names listed for loading once", () => {
    const r = resolveCtaDesign({ headingFont: "'Space Grotesk', sans-serif", bodyFont: "Inter" }, ctx);
    expect(r.heading.style).toEqual({ fontFamily: "'Space Grotesk', sans-serif" });
    expect(r.container.style).toEqual({ maxWidth: "1320px", margin: "0 auto", fontFamily: "Inter" });
    expect(r.fonts).toEqual(["Space Grotesk", "Inter"]);
    expect(resolveCtaDesign({ headingFont: "Inter", bodyFont: "Inter" }, ctx).fonts).toEqual(["Inter"]);
    expect(resolveCtaDesign({ headingFont: "sans-serif" }, ctx).fonts).toEqual([]);
  });

  it("numbers are clamped", () => {
    const r = resolveCtaDesign({ card: { radius: 9999, padding: -5, maxWidth: 10 }, headingSize: 5000 }, ctx);
    expect(r.root.vars["--cta-card-radius"]).toBe("80px");
    expect(r.root.vars["--cta-card-pad"]).toBe("0px");
    expect(r.root.vars["--cta-card-max"]).toBe("480px");
    expect(r.heading.style?.fontSize).toBe("clamp(58px, 4.2vw, 96px)");
  });
});

describe("resolveCtaDesign — hostile stored values fall back to the default for that slot", () => {
  const ctx = ctxOf("transparent", true, "contact-form");
  const base = resolveCtaDesign({}, ctx);
  const HOSTILE = [
    "red; background: url(https://evil.example/x)",
    "url(javascript:alert(1))",
    "#fff} body{display:none",
    "<script>alert(1)</script>",
    "expression(alert(1))",
    "var(--x)",
    "rgba(0,0,0,.5); color: red",
    "javascript:alert(1)",
    "#12",
    "",
    "   ",
    { nested: true },
    Number.NaN,
    Number.POSITIVE_INFINITY,
    true,
    null,
  ];

  it.each(HOSTILE)("colour %j is rejected", (bad) => {
    expect(safeCssColor(bad)).toBeUndefined();
  });

  it.each(HOSTILE.filter((h) => h !== "none"))("shadow %j is rejected", (bad) => {
    expect(safeCssShadow(bad)).toBeUndefined();
  });

  it.each(["#fff", "#FFFFFF", "#ffffff80", "rgb(0, 0, 0)", "rgba(246,242,236,.95)", "hsl(210 50% 40%)", "hsla(210, 50%, 40%, 0.5)", "rgb(0 0 0 / 50%)"])(
    "colour %s is accepted",
    (ok) => {
      expect(safeCssColor(ok)).toBe(ok);
    },
  );

  it.each(["none", "0 24px 60px rgba(0,0,0,.28)", "0 1px 2px #0003, inset 0 0 0 1px rgb(0 0 0 / 10%)"])("shadow %s is accepted", (ok) => {
    expect(safeCssShadow(ok)).toBe(ok);
  });

  it("every hostile value in every slot leaves that slot at its default", () => {
    for (const bad of HOSTILE) {
      const r = resolveCtaDesign(
        {
          overlay: bad,
          eyebrowColor: bad,
          headingColor: bad,
          accentColor: bad,
          textColor: bad,
          mutedColor: bad,
          headingFont: bad,
          bodyFont: bad,
          headingSize: bad,
          tileBackground: bad,
          tileTextColor: bad,
          tileRadius: bad,
          iconBackground: bad,
          iconColor: bad,
          focusColor: bad,
          successColor: bad,
          errorColor: bad,
          tone: bad,
          contactStyle: bad,
        },
        ctx,
      );
      expect(r).toEqual(base);
    }
  });

  it("hostile nested values fall back inside their group", () => {
    for (const bad of HOSTILE) {
      const r = resolveCtaDesign(
        {
          card: { background: bad, radius: bad, shadow: bad, padding: bad, maxWidth: bad },
          formCard: { background: bad, radius: bad, shadow: bad, border: bad, padding: bad, titleColor: bad },
          field: { background: bad, borderColor: bad, radius: bad, height: bad, textColor: bad, placeholderColor: bad, labelColor: bad, borderWidth: bad },
          button: { background: bad, hover: bad, color: bad, radius: bad, height: bad, icon: bad, iconPosition: bad },
        },
        ctx,
      );
      expect(r.root.vars).toEqual({});
      expect(r.card).toEqual({ className: "cta-d-card", style: undefined });
      expect(r.formCard.style).toEqual({ ...base.formCard.style, maxHeight: "none", overflowY: "visible" });
      expect(r.button.style).toBeUndefined();
      expect(r.button.iconClassName).toBe("bi bi-send me-2");
      expect(r.label.style).toEqual({ fontSize: 14 });
    }
  });

  it("no resolved string ever carries a rule-breaking character", () => {
    const r = resolveCtaDesign(
      { headingFont: "Inter; } body { display:none", bodyFont: "x</style>", card: { shadow: "0 0 0 red; position:fixed" }, overlay: "rgba(0,0,0,.2)}" },
      ctx,
    );
    const strings: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === "string") strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(r);
    expect(strings.length).toBeGreaterThan(10);
    for (const s of strings) expect(s).not.toMatch(/[;{}<>]|url\(/);
  });
});

describe("pruneCtaDesign — what the editor stores", () => {
  it("drops blank values and emptied groups", () => {
    expect(pruneCtaDesign({ headingColor: "", headingUppercase: false, tone: undefined, button: { background: "" }, field: {} })).toBeUndefined();
  });
  it("keeps an empty card: its presence is the setting", () => {
    expect(pruneCtaDesign({ card: {} })).toEqual({ card: {} });
    expect(pruneCtaDesign({ card: { background: "", radius: 20 } })).toEqual({ card: { radius: 20 } });
  });
  it("keeps real values, including 0", () => {
    const d = { headingColor: "#111111", overlay: "none", button: { radius: 0, uppercase: true, hover: "" } };
    expect(pruneCtaDesign(d)).toEqual({ headingColor: "#111111", overlay: "none", button: { radius: 0, uppercase: true } });
  });
  it("does not mutate its input", () => {
    const d = { button: { background: "" }, headingColor: "#111111" };
    const before = JSON.stringify(d);
    pruneCtaDesign(d);
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe("ctaFontHref", () => {
  it("always requests weight 400 (Google Fonts rejects a list without it)", () => {
    expect(ctaFontHref("Space Grotesk")).toBe("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap");
  });
});
