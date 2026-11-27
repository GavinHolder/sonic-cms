/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { findHashSection, scrollToHashSectionWhenReady, stripSectionHash } from "@/lib/navigation-utils";

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

describe("stripSectionHash", () => {
  let replaceState: ReturnType<typeof vi.spyOn> | undefined;
  let pushState: ReturnType<typeof vi.spyOn> | undefined;

  /** Put the jsdom window on `url` with `state`, then start spying. */
  const visit = (url: string, state: unknown = null): void => {
    window.history.replaceState(state, "", url);
    replaceState = vi.spyOn(window.history, "replaceState");
    pushState = vi.spyOn(window.history, "pushState");
  };

  afterEach(() => {
    replaceState?.mockRestore();
    pushState?.mockRestore();
    window.history.replaceState(null, "", "/");
  });

  it("removes a section hash, keeping pathname, search and history.state, without a new entry", () => {
    const { container } = mountContainer();
    addSection(container, SECTION_ID, 1600);
    visit(`/packages?product=7&x=a%20b#${SECTION_ID}`, { custom: 1 });
    const entries = window.history.length;
    expect(stripSectionHash()).toBe(true);
    expect(window.location.pathname).toBe("/packages");
    expect(window.location.search).toBe("?product=7&x=a%20b");
    expect(window.location.hash).toBe("");
    expect(window.history.state).toEqual({ custom: 1 });
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith({ custom: 1 }, "", "/packages?product=7&x=a%20b");
    expect(pushState).not.toHaveBeenCalled();
    expect(window.history.length).toBe(entries);
  });

  it("keeps a null history.state null (entry made by a native #anchor click)", () => {
    const { container } = mountContainer();
    addSection(container, SECTION_ID, 1600);
    visit(`/#${SECTION_ID}`, null);
    expect(stripSectionHash()).toBe(true);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/");
    expect(window.location.pathname + window.location.search + window.location.hash).toBe("/");
  });

  it("hands the router's state back without its __NA marker so Next's history patch syncs the new URL", () => {
    const { container } = mountContainer();
    addSection(container, SECTION_ID, 1600);
    const tree = { tree: ["", {}], renderedSearch: "" };
    const state = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: tree, custom: "kept" };
    visit(`/#${SECTION_ID}`, state);
    expect(stripSectionHash()).toBe(true);
    expect(replaceState).toHaveBeenCalledWith({ __PRIVATE_NEXTJS_INTERNALS_TREE: tree, custom: "kept" }, "", "/");
    expect(state.__NA).toBe(true); // the caller's object is not mutated
  });

  it.each([
    ["no hash", "/packages?product=7"],
    ["bare #", "/packages#"],
    ["unknown id", "/packages#nope"],
    ["malformed percent-encoding", "/packages#%E0%A4%A"],
    ["id of a non-section element", "/packages#cta-field-email"],
    ["id outside the snap container", "/packages#outside"],
  ])("leaves the URL alone for %s", (_label, url) => {
    const { container } = mountContainer();
    const section = addSection(container, SECTION_ID, 1600);
    const field = document.createElement("input");
    field.id = "cta-field-email";
    section.appendChild(field);
    const outside = document.createElement("div");
    outside.id = "outside";
    document.body.appendChild(outside);
    visit(url);
    const before = window.location.href;
    expect(stripSectionHash()).toBe(false);
    expect(window.location.href).toBe(before);
    expect(replaceState).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("skips /admin even when the hash names a section", () => {
    const { container } = mountContainer();
    addSection(container, SECTION_ID, 1600);
    visit(`/admin/content#${SECTION_ID}`);
    expect(stripSectionHash()).toBe(false);
    expect(window.location.hash).toBe(`#${SECTION_ID}`);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("never scrolls: a same-page #link click is only cleaned up, the browser did the scrolling", () => {
    const { container, scrollTo } = mountContainer();
    const section = addSection(container, SECTION_ID, 1600);
    const windowScrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const scrollIntoView = vi.fn();
    Object.defineProperty(section, "scrollIntoView", { value: scrollIntoView, configurable: true });
    visit(`/#${SECTION_ID}`);
    expect(stripSectionHash()).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(windowScrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    windowScrollTo.mockRestore();
  });

  it("uses the injected location and history", () => {
    const { container } = mountContainer();
    addSection(container, SECTION_ID, 1600);
    const hist = { state: { a: 1 }, replaceState: vi.fn() };
    expect(stripSectionHash({ pathname: "/p", search: "?q=1", hash: `#${SECTION_ID}` }, hist)).toBe(true);
    expect(hist.replaceState).toHaveBeenCalledWith({ a: 1 }, "", "/p?q=1");
  });

  describe("on the load path (scrollToHashSectionWhenReady callbacks)", () => {
    const start = (): (() => void) =>
      scrollToHashSectionWhenReady(window.location.hash, {
        onScrolled: () => stripSectionHash(),
        onUserCancel: () => stripSectionHash(),
      });

    it("keeps the hash until the scroll has been issued, then removes it", () => {
      const { container, scrollTo } = mountContainer();
      visit(`/packages?product=7#${SECTION_ID}`);
      start();
      vi.advanceTimersByTime(450); // section not mounted yet
      expect(scrollTo).not.toHaveBeenCalled();
      expect(window.location.hash).toBe(`#${SECTION_ID}`);
      expect(replaceState).not.toHaveBeenCalled();
      const order: string[] = [];
      scrollTo.mockImplementation(() => order.push("scroll"));
      replaceState?.mockImplementation(() => order.push("strip"));
      addSection(container, SECTION_ID, 2400);
      vi.advanceTimersByTime(100);
      expect(order).toEqual(["scroll", "strip"]);
      expect(replaceState).toHaveBeenCalledWith(null, "", "/packages?product=7");
      expect(pushState).not.toHaveBeenCalled();
    });

    it("leaves the hash when the section never appears (timeout)", () => {
      mountContainer();
      visit(`/#${SECTION_ID}`);
      start();
      vi.advanceTimersByTime(20000);
      expect(vi.getTimerCount()).toBe(0);
      expect(window.location.hash).toBe(`#${SECTION_ID}`);
      expect(replaceState).not.toHaveBeenCalled();
    });

    it("leaves a non-section hash alone and never scrolls for it", () => {
      const { container, scrollTo } = mountContainer();
      const section = addSection(container, SECTION_ID, 1600);
      const field = document.createElement("input");
      field.id = "cta-field-email";
      section.appendChild(field);
      visit("/#cta-field-email");
      start();
      vi.advanceTimersByTime(20000);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(window.location.hash).toBe("#cta-field-email");
      expect(replaceState).not.toHaveBeenCalled();
    });

    it("user interaction cancels the scroll but still removes a hash that names a mounted section", () => {
      const { container, scrollTo } = mountContainer();
      visit(`/#${SECTION_ID}`);
      start();
      addSection(container, SECTION_ID, 2400);
      window.dispatchEvent(new Event("wheel")); // before the first attempt runs
      vi.advanceTimersByTime(10000);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(window.location.hash).toBe("");
      expect(replaceState).toHaveBeenCalledTimes(1);
    });

    it("user interaction before the section exists leaves the hash", () => {
      const { scrollTo } = mountContainer();
      visit(`/#${SECTION_ID}`);
      start();
      vi.advanceTimersByTime(200);
      window.dispatchEvent(new Event("keydown"));
      vi.advanceTimersByTime(10000);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(window.location.hash).toBe(`#${SECTION_ID}`);
      expect(replaceState).not.toHaveBeenCalled();
    });

    it("the returned cancel (route change / unmount) fires no callback", () => {
      const { container } = mountContainer();
      addSection(container, SECTION_ID, 1600);
      visit(`/#${SECTION_ID}`);
      const cancel = start();
      cancel();
      vi.advanceTimersByTime(10000);
      expect(window.location.hash).toBe(`#${SECTION_ID}`);
      expect(replaceState).not.toHaveBeenCalled();
    });
  });
});
