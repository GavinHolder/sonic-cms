/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { LANDING_PAGE_PREVIEW_PATH, resolveTemplateLink } from "@/lib/navigation-utils";

const ORIGIN = "https://www.example.test";
const SECTION_ID = "12af9b10-66de-47bd-9274-3b1bc136606d";

type Loc = Parameters<typeof resolveTemplateLink>[1];

/** A Location-like object for `path` (may carry ?search and #hash). */
function at(path: string): Loc {
  const url = new URL(path, ORIGIN);
  return { href: url.href, origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash };
}

/** Hash → section lookup stubs (the real one needs a laid-out #snap-container). */
const isSection = (hash: string): boolean => hash === `#${SECTION_ID}`;
const opts = { isSection };

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("resolveTemplateLink — same page", () => {
  it("/#id on / scrolls in place and keeps the section hash out of the URL", () => {
    expect(resolveTemplateLink(`/#${SECTION_ID}`, at("/"), opts)).toEqual({
      kind: "same-page",
      target: "/",
      push: false,
      sectionId: SECTION_ID,
    });
  });

  it("/#id on the landing-page preview stays on the preview path", () => {
    expect(resolveTemplateLink(`/#${SECTION_ID}`, at(LANDING_PAGE_PREVIEW_PATH), opts)).toEqual({
      kind: "same-page",
      target: LANDING_PAGE_PREVIEW_PATH,
      push: false,
      sectionId: SECTION_ID,
    });
  });

  it("/ on the landing-page preview never targets the host root", () => {
    const result = resolveTemplateLink("/", at(`${LANDING_PAGE_PREVIEW_PATH}?product=x`), opts);
    expect(result).toEqual({ kind: "same-page", target: LANDING_PAGE_PREVIEW_PATH, push: true });
  });

  it("/?product=x#id on the preview keeps the link's query on the preview path", () => {
    expect(resolveTemplateLink(`/?product=x#${SECTION_ID}`, at(LANDING_PAGE_PREVIEW_PATH), opts)).toEqual({
      kind: "same-page",
      target: `${LANDING_PAGE_PREVIEW_PATH}?product=x`,
      push: true,
      sectionId: SECTION_ID,
    });
  });

  it("?product=x#id is same-page with the query on / and on the preview", () => {
    expect(resolveTemplateLink(`?product=x#${SECTION_ID}`, at("/"), opts)).toEqual({
      kind: "same-page",
      target: "/?product=x",
      push: true,
      sectionId: SECTION_ID,
    });
    expect(resolveTemplateLink(`?product=x#${SECTION_ID}`, at(LANDING_PAGE_PREVIEW_PATH), opts)).toEqual({
      kind: "same-page",
      target: `${LANDING_PAGE_PREVIEW_PATH}?product=x`,
      push: true,
      sectionId: SECTION_ID,
    });
  });

  it("#id is same-page on any path", () => {
    expect(resolveTemplateLink(`#${SECTION_ID}`, at("/fibre?product=y"), opts)).toEqual({
      kind: "same-page",
      target: "/fibre?product=y",
      push: false,
      sectionId: SECTION_ID,
    });
  });

  it("does not push when the target equals the current URL", () => {
    const result = resolveTemplateLink("?product=x", at("/?product=x"), opts);
    expect(result).toEqual({ kind: "same-page", target: "/?product=x", push: false });
  });

  it("pushes when only a section hash has to leave the address bar", () => {
    const result = resolveTemplateLink(`#${SECTION_ID}`, at(`/#${SECTION_ID}`), opts);
    expect(result).toEqual({ kind: "same-page", target: "/", push: true, sectionId: SECTION_ID });
  });

  it("keeps a hash that is not a section in the pushed URL, on / and on the preview", () => {
    expect(resolveTemplateLink("/#contact-form", at("/"), opts)).toEqual({
      kind: "same-page",
      target: "/#contact-form",
      push: true,
      sectionId: "contact-form",
    });
    expect(resolveTemplateLink("/#contact-form", at(LANDING_PAGE_PREVIEW_PATH), opts)).toEqual({
      kind: "same-page",
      target: `${LANDING_PAGE_PREVIEW_PATH}#contact-form`,
      push: true,
      sectionId: "contact-form",
    });
  });

  it("decodes the section id and drops one that cannot be decoded", () => {
    expect(resolveTemplateLink("#our%20story", at("/"), opts)).toMatchObject({ sectionId: "our story" });
    const bad = resolveTemplateLink("#%E0%A4%A", at("/"), opts);
    expect(bad).toEqual({ kind: "same-page", target: "/#%E0%A4%A", push: true });
  });

  it("uses the real section lookup by default", () => {
    const container = document.createElement("div");
    container.id = "snap-container";
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.className = "cms-section";
    container.appendChild(section);
    document.body.appendChild(container);
    expect(resolveTemplateLink(`/#${SECTION_ID}`, at(LANDING_PAGE_PREVIEW_PATH))).toMatchObject({
      target: LANDING_PAGE_PREVIEW_PATH,
    });
    expect(resolveTemplateLink("/#nope", at(LANDING_PAGE_PREVIEW_PATH))).toMatchObject({
      target: `${LANDING_PAGE_PREVIEW_PATH}#nope`,
    });
  });
});

describe("resolveTemplateLink — navigate", () => {
  it("/#id on another page is a full navigation", () => {
    expect(resolveTemplateLink(`/#${SECTION_ID}`, at("/fibre"), opts)).toEqual({
      kind: "navigate",
      url: `${ORIGIN}/#${SECTION_ID}`,
    });
  });

  it("/coverage on the preview is a full navigation (unchanged)", () => {
    expect(resolveTemplateLink("/coverage", at(LANDING_PAGE_PREVIEW_PATH), opts)).toEqual({
      kind: "navigate",
      url: `${ORIGIN}/coverage`,
    });
  });

  it("only the exact preview path is equivalent to /", () => {
    for (const path of ["/preview", "/preview/landing-page/", "/preview/landing-page/x", "/preview/other"]) {
      expect(resolveTemplateLink(`/#${SECTION_ID}`, at(path), opts).kind).toBe("navigate");
    }
  });

  it("the preview path linked from / is a full navigation", () => {
    expect(resolveTemplateLink(LANDING_PAGE_PREVIEW_PATH, at("/"), opts).kind).toBe("navigate");
  });
});

describe("resolveTemplateLink — off-site and new tab", () => {
  it("another origin opens in a new tab", () => {
    expect(resolveTemplateLink("https://evil.example/path", at("/"), opts)).toEqual({
      kind: "external",
      url: "https://evil.example/path",
    });
  });

  it("protocol-relative and backslash/tab tricks are not same-site", () => {
    for (const href of ["//evil.example/x", "/\\evil.example/x", "\\\\evil.example/x", "/\t/evil.example/x"]) {
      const result = resolveTemplateLink(href, at(LANDING_PAGE_PREVIEW_PATH), opts);
      expect(result.kind).toBe("external");
      expect(result).toMatchObject({ url: "https://evil.example/x" });
    }
  });

  it("same host on another scheme or port is not same-site", () => {
    expect(resolveTemplateLink("http://www.example.test/", at("/"), opts).kind).toBe("external");
    expect(resolveTemplateLink("https://www.example.test:8443/", at("/"), opts).kind).toBe("external");
  });

  it("newTab opens even a same-page link in a new tab, with the link's own URL", () => {
    expect(resolveTemplateLink(`/#${SECTION_ID}`, at(LANDING_PAGE_PREVIEW_PATH), { ...opts, newTab: true })).toEqual({
      kind: "new-tab",
      url: `${ORIGIN}/#${SECTION_ID}`,
    });
  });
});

describe("resolveTemplateLink — schemes", () => {
  it("mailto: and tel: are handed to the browser as written", () => {
    expect(resolveTemplateLink(" mailto:hello@example.test ", at("/"), opts)).toEqual({
      kind: "protocol",
      url: "mailto:hello@example.test",
    });
    expect(resolveTemplateLink("TEL:+27110000000", at("/"), opts)).toEqual({
      kind: "protocol",
      url: "TEL:+27110000000",
    });
  });

  it("javascript:, data: and other schemes are ignored", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<p>x</p>", "vbscript:x", "file:///etc/passwd", "ftp://example.test/x", "blob:https://www.example.test/1"]) {
      expect(resolveTemplateLink(href, at("/"), opts)).toEqual({ kind: "ignore" });
    }
  });
});

describe("resolveTemplateLink — ignored", () => {
  it("empty, whitespace-only and oversized hrefs", () => {
    expect(resolveTemplateLink("", at("/"), opts)).toEqual({ kind: "ignore" });
    expect(resolveTemplateLink("   ", at("/"), opts)).toEqual({ kind: "ignore" });
    expect(resolveTemplateLink(`/${"a".repeat(2048)}`, at("/"), opts)).toEqual({ kind: "ignore" });
    expect(resolveTemplateLink(`/${"a".repeat(2047)}`, at("/"), opts).kind).toBe("navigate");
  });

  it("malformed hrefs", () => {
    expect(resolveTemplateLink("http://", at("/"), opts)).toEqual({ kind: "ignore" });
    expect(resolveTemplateLink("https://[bad", at("/"), opts)).toEqual({ kind: "ignore" });
  });

  it("everything inside /admin, mailto included", () => {
    expect(resolveTemplateLink(`#${SECTION_ID}`, at("/admin/content/landing-page"), opts)).toEqual({ kind: "ignore" });
    expect(resolveTemplateLink("mailto:a@example.test", at("/admin"), opts)).toEqual({ kind: "ignore" });
    expect(resolveTemplateLink("https://evil.example/", at("/admin"), opts)).toEqual({ kind: "ignore" });
  });
});
