/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { findHashSection, scrollToHashSectionWhenReady } from "@/lib/navigation-utils";

const SECTION_ID = "12af9b10-66de-47bd-9274-3b1bc136606d";

// jsdom has no layout: rects are all 0 and Element.scrollTo is missing, so both are stubbed.
const rectAt = (top: number): DOMRect =>
  ({ top, bottom: top + 800, left: 0, right: 1200, width: 1200, height: 800, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

function mountContainer(scrollTop = 0): { container: HTMLElement; scrollTo: ReturnType<typeof vi.fn> } {
  const container = document.createElement("div");
  container.id = "snap-container";
  const scrollTo = vi.fn();
  Object.defineProperty(container, "scrollTo", { value: scrollTo, configurable: true });
  Object.defineProperty(container, "scrollTop", { value: scrollTop, configurable: true });
  container.getBoundingClientRect = () => rectAt(0);
  document.body.appendChild(container);
  return { container, scrollTo };
}

/** A real section root: `.cms-section`, `viewportTop` px below the container's top edge. */
function addSection(parent: HTMLElement, id: string, viewportTop: number, className = "cms-section"): HTMLElement {
  const section = document.createElement("section");
  section.id = id;
  if (className) section.className = className;
  section.getBoundingClientRect = () => rectAt(viewportTop);
  parent.appendChild(section);
  return section;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("findHashSection", () => {
  it("resolves a hash to the section inside #snap-container", () => {
    const { container } = mountContainer();
    const section = addSection(container, SECTION_ID, 1600);
    expect(findHashSection(`#${SECTION_ID}`)).toBe(section);
  });

  it("decodes percent-encoded ids", () => {
    const { container } = mountContainer();
    const section = addSection(container, "our story", 800);
    expect(findHashSection("#our%20story")).toBe(section);
  });

  it("returns null for empty, bare, malformed or unknown hashes", () => {
    const { container } = mountContainer();
    addSection(container, SECTION_ID, 800);
    expect(findHashSection("")).toBeNull();
    expect(findHashSection("#")).toBeNull();
    expect(findHashSection("#%E0%A4%A")).toBeNull(); // decodeURIComponent throws
    expect(findHashSection("#nope")).toBeNull();
    expect(findHashSection(SECTION_ID)).toBeNull(); // not a hash
  });

  it("treats the hash as an id, never as a selector", () => {
    const { container } = mountContainer();
    addSection(container, SECTION_ID, 800);
    expect(findHashSection("#section")).toBeNull();
    expect(findHashSection("#*")).toBeNull();
    expect(findHashSection("#snap-container section")).toBeNull();
  });

  it("ignores elements outside the snap container and the container itself", () => {
    const { container } = mountContainer();
    const outside = document.createElement("div");
    outside.id = "outside";
    document.body.appendChild(outside);
    expect(findHashSection("#outside")).toBeNull();
    expect(findHashSection(`#${container.id}`)).toBeNull();
  });

  it("rejects ids inside the container that are not section roots", () => {
    const { container } = mountContainer();
    const section = addSection(container, SECTION_ID, 800);
    for (const id of ["cta-field-email", "motion-el-1"]) {
      const inner = document.createElement("div");
      inner.id = id;
      section.appendChild(inner);
      expect(findHashSection(`#${id}`)).toBeNull();
    }
    addSection(container, "plain-section", 1600, "");
    expect(findHashSection("#plain-section")).toBeNull();
  });

  it("accepts the hero root and the footer section root", () => {
    const { container } = mountContainer();
    const hero = document.createElement("div");
    hero.id = "hero-id";
    hero.className = "hero-carousel position-relative w-100";
    container.appendChild(hero);
    const footer = document.createElement("footer");
    footer.id = "footer-id";
    container.appendChild(footer);
    expect(findHashSection("#hero-id")).toBe(hero);
    expect(findHashSection("#footer-id")).toBe(footer);
  });

  it("returns null when the page has no snap container", () => {
    addSection(document.body, SECTION_ID, 800);
    expect(findHashSection(`#${SECTION_ID}`)).toBeNull();
  });
});

describe("scrollToHashSectionWhenReady", () => {
  it("scrolls the snap container to the section once, after the current task", () => {
    const { container, scrollTo } = mountContainer();
    addSection(container, SECTION_ID, 1600);
    scrollToHashSectionWhenReady(`#${SECTION_ID}`);
    expect(scrollTo).not.toHaveBeenCalled(); // deferred past the layout's scroll-to-top resets
    vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1600, behavior: "smooth" });
    vi.advanceTimersByTime(5000);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("measures a section nested in a positioned wrapper against the container, not offsetTop", () => {
    // Container already scrolled 300px; its top edge sits at viewport y=0.
    const { container, scrollTo } = mountContainer(300);
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    container.appendChild(wrapper);
    // Wrapper-relative offsetTop is 0 (what scrollToSection would use) — the real
    // position is 2100px below the container's top edge in the viewport.
    const section = addSection(wrapper, SECTION_ID, 2100);
    Object.defineProperty(section, "offsetTop", { value: 0, configurable: true });
    scrollToHashSectionWhenReady(`#${SECTION_ID}`);
    vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 2400, behavior: "smooth" });
  });

  it("retries until a late-mounting section appears", () => {
    const { container, scrollTo } = mountContainer();
    scrollToHashSectionWhenReady(`#${SECTION_ID}`);
    vi.advanceTimersByTime(450);
    expect(scrollTo).not.toHaveBeenCalled();
    addSection(container, SECTION_ID, 2400);
    vi.advanceTimersByTime(100);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 2400, behavior: "smooth" });
  });

  it("gives up after the timeout when the section never appears", () => {
    const { container, scrollTo } = mountContainer();
    scrollToHashSectionWhenReady(`#${SECTION_ID}`);
    vi.advanceTimersByTime(7000);
    expect(vi.getTimerCount()).toBe(1); // still waiting: slow client-side section fetch
    vi.advanceTimersByTime(1500);
    addSection(container, SECTION_ID, 2400);
    vi.advanceTimersByTime(5000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["wheel", "touchstart", "pointerdown", "keydown"])("stops waiting as soon as the user interacts (%s)", (type) => {
    const { container, scrollTo } = mountContainer();
    scrollToHashSectionWhenReady(`#${SECTION_ID}`);
    vi.advanceTimersByTime(200);
    window.dispatchEvent(new Event(type));
    addSection(container, SECTION_ID, 2400);
    vi.advanceTimersByTime(10000);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing after the returned cancel function is called", () => {
    const { container, scrollTo } = mountContainer();
    addSection(container, SECTION_ID, 1600);
    const cancel = scrollToHashSectionWhenReady(`#${SECTION_ID}`);
    cancel();
    vi.advanceTimersByTime(5000);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("schedules nothing and adds no listeners when there is no hash", () => {
    const { scrollTo } = mountContainer();
    const addListener = vi.spyOn(window, "addEventListener");
    scrollToHashSectionWhenReady("");
    scrollToHashSectionWhenReady("#");
    expect(vi.getTimerCount()).toBe(0);
    expect(addListener).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    addListener.mockRestore();
  });
});
