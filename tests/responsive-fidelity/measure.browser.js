/**
 * In-page measurement for the responsive-fidelity harness.
 *
 * Plain JS on purpose (NOT TypeScript): the runner reads this file as text and evaluates it in
 * the page, and TS tooling would inject helper calls (`__name`) that do not exist in the browser.
 *
 * Returns everything the assertions need as JSON-serialisable data — no assertions in here.
 */
(function measure() {
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  function rect(el) {
    var r = el.getBoundingClientRect();
    return { x: r2(r.left), y: r2(r.top), w: r2(r.width), h: r2(r.height) };
  }
  function matrixOf(el) {
    var t = getComputedStyle(el).transform;
    var m;
    try { m = new DOMMatrix(t === "none" ? undefined : t); } catch (e) { m = new DOMMatrix(); }
    return {
      a: r2(m.a * 10000) / 10000, b: m.b, c: m.c, d: r2(m.d * 10000) / 10000, e: r2(m.e), f: r2(m.f),
      sx: Math.hypot(m.a, m.b), sy: Math.hypot(m.c, m.d),
    };
  }

  var section = document.querySelector("section.flexible-section");
  if (!section) return { error: "no .flexible-section in DOM" };

  var out = {
    vw: window.innerWidth,
    vh: window.innerHeight,
    docScrollW: document.documentElement.scrollWidth,
    section: rect(section),
    sectionScrollW: section.scrollWidth,
    contentMode: section.getAttribute("data-content-mode"),
    sectionBgColor: getComputedStyle(section).backgroundColor,
    sectionBgImage: getComputedStyle(section).backgroundImage,
    fontsStatus: document.fonts.status,
  };

  var stage = section.querySelector("[data-fx-stage]");
  out.stage = stage ? rect(stage) : null;
  var content = section.querySelector("[data-fx-content]");
  out.content = content ? { rect: rect(content), matrix: matrixOf(content), left: content.style.left, top: content.style.top, w: content.style.width, h: content.style.height } : null;
  var bgs = section.querySelectorAll("[data-fx-bg]");
  out.bgPlates = Array.prototype.map.call(bgs, function (el) {
    var cs = getComputedStyle(el);
    return { rect: rect(el), matrix: matrixOf(el), size: cs.backgroundSize, pos: cs.backgroundPosition, image: cs.backgroundImage, w: el.style.width, h: el.style.height };
  });

  // Every element under the section that paints a url() background image (plate or not).
  var all = section.querySelectorAll("*");
  out.bgImages = [];
  out.nonUniform = [];
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    var cs = getComputedStyle(el);
    if (cs.backgroundImage && cs.backgroundImage.indexOf("url(") !== -1 && el.tagName !== "svg") {
      out.bgImages.push({ url: cs.backgroundImage.slice(0, 300), rect: rect(el), size: cs.backgroundSize, pos: cs.backgroundPosition, fx: el.hasAttribute("data-fx-bg"), opacity: cs.opacity });
    }
    if (cs.transform && cs.transform !== "none") {
      var m = matrixOf(el);
      // Ignore degenerate/animation-in-flight cases: only report a meaningful x/y scale mismatch.
      if (Math.abs(m.sx - m.sy) > 0.002 * Math.max(m.sx, m.sy, 1e-6)) {
        out.nonUniform.push({ tag: el.tagName, cls: String(el.className || "").slice(0, 60), fx: el.hasAttribute("data-fx-bg") ? "bg" : el.hasAttribute("data-fx-content") ? "content" : "", sx: r2(m.sx * 10000) / 10000, sy: r2(m.sy * 10000) / 10000 });
      }
    }
  }

  // Text line/geometry for one wrapper.
  function textInfo(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var rects = [];
    var firstParent = null;
    var n;
    while ((n = walker.nextNode())) {
      if (!n.textContent || !n.textContent.trim()) continue;
      if (!firstParent) firstParent = n.parentElement;
      var range = document.createRange();
      range.selectNodeContents(n);
      var crs = range.getClientRects();
      for (var k = 0; k < crs.length; k++) {
        if (crs[k].width > 0.5 && crs[k].height > 0.5) rects.push({ x: crs[k].left, y: crs[k].top, w: crs[k].width, h: crs[k].height });
      }
    }
    if (!rects.length) return { lines: 0, text: null, font: null };
    rects.sort(function (p, q) { return p.y - q.y; });
    var lines = 0, lastTop = -1e9, lastH = 0;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    rects.forEach(function (rc) {
      if (rc.y - lastTop > Math.max(2, lastH * 0.5)) { lines++; lastTop = rc.y; lastH = rc.h; }
      minX = Math.min(minX, rc.x); minY = Math.min(minY, rc.y); maxX = Math.max(maxX, rc.x + rc.w); maxY = Math.max(maxY, rc.y + rc.h);
    });
    var pcs = getComputedStyle(firstParent);
    return {
      lines: lines,
      text: { x: r2(minX), y: r2(minY), w: r2(maxX - minX), h: r2(maxY - minY) },
      font: { family: pcs.fontFamily.slice(0, 80), size: parseFloat(pcs.fontSize), lh: pcs.lineHeight, weight: pcs.fontWeight, whiteSpace: pcs.whiteSpace, letterSpacing: pcs.letterSpacing, transform: pcs.textTransform },
    };
  }

  out.subs = {};
  section.querySelectorAll("[data-fx-sub]").forEach(function (el) {
    var info = textInfo(el);
    out.subs[el.getAttribute("data-fx-sub")] = { rect: rect(el), lines: info.lines, text: info.text, font: info.font, cssH: el.style.height || "" };
  });
  out.blocks = {};
  section.querySelectorAll("[data-fx-block]").forEach(function (el) {
    out.blocks[el.getAttribute("data-fx-block")] = { rect: rect(el) };
  });

  // Reflow / non-plate fallback path: gather every visible text run so readability can be judged.
  out.textRuns = [];
  var tw = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  var tn;
  while ((tn = tw.nextNode())) {
    if (!tn.textContent || !tn.textContent.trim()) continue;
    var pe = tn.parentElement;
    if (!pe || pe.closest("script,style,svg")) continue;
    var rg = document.createRange();
    rg.selectNodeContents(tn);
    var bb = rg.getBoundingClientRect();
    if (bb.width < 1 || bb.height < 1) continue;
    var pcs2 = getComputedStyle(pe);
    if (pcs2.visibility === "hidden" || pcs2.display === "none") continue;
    out.textRuns.push({ t: tn.textContent.trim().slice(0, 40), x: r2(bb.left), y: r2(bb.top), w: r2(bb.width), h: r2(bb.height), fs: parseFloat(pcs2.fontSize) });
  }
  out.hasPlate = !!content;
  out.blockCount = Object.keys(out.blocks).length + Object.keys(out.subs).length;

  // Fixed navbar (if any) — informational, used to describe "clipping under navbar" in the report.
  var nav = document.querySelector("nav, header");
  if (nav) {
    var ncs = getComputedStyle(nav);
    out.navbar = { rect: rect(nav), position: ncs.position };
  } else {
    out.navbar = null;
  }
  return out;
})()
