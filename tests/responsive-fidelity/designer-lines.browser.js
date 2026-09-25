/**
 * In-page (Flexible Designer canvas) text-line probe for the round-trip parity phase.
 * Plain JS on purpose — see measure.browser.js. Returns { "<blockId>:<subId>": { lines, h, type } }.
 */
(function designerLines() {
  var out = {};
  document.querySelectorAll(".sub-element[data-sub-id]").forEach(function (el) {
    var blockEl = el.closest("[data-block-id]");
    if (!blockEl) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var rects = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!n.textContent || !n.textContent.trim()) continue;
      if (n.parentElement && n.parentElement.closest("button")) continue; // the "✕" remove button
      var range = document.createRange();
      range.selectNodeContents(n);
      var crs = range.getClientRects();
      for (var k = 0; k < crs.length; k++) {
        if (crs[k].width > 0.5 && crs[k].height > 0.5) rects.push({ y: crs[k].top, h: crs[k].height });
      }
    }
    if (!rects.length) return;
    rects.sort(function (a, b) { return a.y - b.y; });
    var lines = 0, lastTop = -1e9, lastH = 0;
    rects.forEach(function (rc) {
      if (rc.y - lastTop > Math.max(2, lastH * 0.5)) { lines++; lastTop = rc.y; lastH = rc.h; }
    });
    var seType = el.querySelector(".se-heading") ? "heading" : el.querySelector(".se-eyebrow") ? "eyebrow" : el.querySelector(".se-paragraph") ? "paragraph" : "other";
    out[blockEl.getAttribute("data-block-id") + ":" + el.getAttribute("data-sub-id")] = { lines: lines, h: el.offsetHeight, type: seType };
  });
  return out;
})()
