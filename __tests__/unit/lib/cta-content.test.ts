import { describe, it, expect } from "vitest";
import { buildCtaContent, blankToUndefined, compactStringRecord } from "@/lib/cta-content";

describe("buildCtaContent — the CTA editor's save keeps keys it does not own", () => {
  const stored = {
    heading: "Old heading",
    subheading: "Old sub",
    style: "contact-form",
    contactInfo: { phone: "000 000 0000", email: "a@example.com" },
    submitText: "Send message",
    somethingFromANewerVersion: { nested: [1, 2, 3] },
  };

  it("keeps unknown keys through a save", () => {
    const out = buildCtaContent(stored, { heading: "New heading", style: "contact-form" });
    expect(out.contactInfo).toEqual(stored.contactInfo);
    expect(out.submitText).toBe("Send message");
    expect(out.somethingFromANewerVersion).toEqual({ nested: [1, 2, 3] });
  });

  it("writes the keys the editor owns", () => {
    const out = buildCtaContent(stored, { heading: "New heading", buttons: [] });
    expect(out.heading).toBe("New heading");
    expect(out.buttons).toEqual([]);
  });

  it("removes an owned key the user cleared (undefined)", () => {
    const out = buildCtaContent(stored, { heading: "H", subheading: undefined });
    expect("subheading" in out).toBe(false);
  });

  it("clearing a key that was never stored is harmless", () => {
    const out = buildCtaContent(stored, { gradient: undefined });
    expect("gradient" in out).toBe(false);
    expect(out.heading).toBe("Old heading");
  });

  it("keeps falsy-but-defined owned values", () => {
    const out = buildCtaContent(stored, { heading: "", flag: false, count: 0, nothing: null });
    expect(out.heading).toBe("");
    expect(out.flag).toBe(false);
    expect(out.count).toBe(0);
    expect(out.nothing).toBeNull();
  });

  it("does not mutate the stored content or the owned object", () => {
    const before = JSON.stringify(stored);
    const owned = { heading: "X", subheading: undefined };
    buildCtaContent(stored, owned);
    expect(JSON.stringify(stored)).toBe(before);
    expect(Object.keys(owned)).toEqual(["heading", "subheading"]);
  });

  it.each([undefined, null, [] as unknown as Record<string, unknown>, "x" as unknown as Record<string, unknown>])(
    "treats a missing or malformed stored content (%j) as empty",
    (bad) => {
      expect(buildCtaContent(bad, { heading: "H" })).toEqual({ heading: "H" });
    },
  );

  it("saving twice gives the same result", () => {
    const owned = { heading: "H", subheading: undefined, style: "contact-form" };
    const once = buildCtaContent(stored, owned);
    expect(buildCtaContent(once, owned)).toEqual(once);
  });
});

describe("blankToUndefined / compactStringRecord", () => {
  it("blank strings become undefined, others are trimmed", () => {
    expect(blankToUndefined("")).toBeUndefined();
    expect(blankToUndefined("   ")).toBeUndefined();
    expect(blankToUndefined(null)).toBeUndefined();
    expect(blankToUndefined(undefined)).toBeUndefined();
    expect(blankToUndefined("  hi ")).toBe("hi");
  });

  it("drops blank entries and returns undefined when empty", () => {
    expect(compactStringRecord({ phone: " 1 ", email: "", address: undefined })).toEqual({ phone: "1" });
    expect(compactStringRecord({ phone: "", email: "  " })).toBeUndefined();
  });
});
