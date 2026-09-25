/**
 * link-destinations.js
 *
 * Shared client for the "link destination" picker used by the Flexible Designer
 * (public/flexible-designer.html, an iframe running plain JS). ONE module owns
 * everything a picker needs, so every consumer offers the same destinations and
 * treats every stored value the same way:
 *
 *   - fetch + cache of the server catalog        GET /api/link-destinations
 *   - media (documents / images) typeahead        GET /api/link-destinations?group=media
 *   - classify(value, catalog)                    stored value  ->  picker state
 *   - buildOptionsHtml(...)                       <optgroup>/<option> markup (HTML-escaped)
 *   - renderPicker(cfg) + inline-handler entry points (onSelect / onInput / onSearch / onPick)
 *
 * Loadable two ways (UMD-lite), same as flexible-render-rules.js:
 *   - plain <script> tag  -> window.LinkDestinations
 *   - require()/import    -> module.exports (used by the unit tests and scripts/audit-saved-links.ts)
 *
 * STORED-VALUE CONTRACT (what the picker persists into the section JSON):
 *   ''            no link
 *   '/'  '#top'   built-ins
 *   '/slug'  '/policies/<slug>'  '/coverage'  '/gallery/<slug>'  '/content/<type>[/<entry>]'   catalog items
 *   '#<sectionId>'          section on the page being edited (the format links have always used)
 *   '/<page>#<sectionId>'   section on another page ('/#<id>' for the home page)
 *   '/uploads/<file>'       media-library document or image, exactly as MediaAsset.url is stored
 *   'tel:…' 'mailto:…' 'https://…' anything else  -> "Custom URL" (kept verbatim)
 * UI-only sentinels ('__custom__', '__tel__', …) are NEVER persisted. Old builds persisted the literals
 * 'custom' / 'tel' / 'mailto' by mistake; those resolve to '#' (see LEGACY_SENTINELS).
 *
 * INVARIANT: for every stored value V, classify(V).canonical === V — re-selecting the preselected option writes back
 * exactly V — except the legacy literals above (canonical '#'). scripts/audit-saved-links.ts enforces this on live data.
 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  } else {
    root.LinkDestinations = mod;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var API = "/api/link-destinations";
  var S_CUSTOM = "__custom__";
  var S_TEL = "__tel__";
  var S_MAILTO = "__mailto__";
  var S_DOC = "__doc__";
  var S_IMG = "__img__";
  var LEGACY_SENTINELS = { custom: 1, tel: 1, mailto: 1 };
  var LEGACY_MEDIA_PREFIXES = ["/uploads/", "/images/uploads/"];

  /** Shown when the catalog cannot be fetched (not logged in, offline): the picker still works. */
  var FALLBACK_CATALOG = {
    groups: [
      {
        id: "builtin",
        label: "Built-in",
        items: [
          { group: "builtin", label: "Home", value: "/", hint: "/" },
          { group: "builtin", label: "Back to Top", value: "#top" },
        ],
      },
    ],
    meta: { mediaPrefix: "/uploads/", currentPage: null, truncated: false, fallback: true },
  };

  function escapeHtml(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function flatItems(catalog) {
    var out = [];
    var groups = (catalog && catalog.groups) || [];
    for (var i = 0; i < groups.length; i++) {
      var items = groups[i].items || [];
      for (var j = 0; j < items.length; j++) out.push(items[j]);
    }
    return out;
  }

  function startsWithCI(str, prefix) {
    return str.slice(0, prefix.length).toLowerCase() === prefix;
  }

  function mediaPrefixes(catalog) {
    var p = catalog && catalog.meta && catalog.meta.mediaPrefix;
    var list = LEGACY_MEDIA_PREFIXES.slice();
    if (p && list.indexOf(p) === -1) list.unshift(p);
    return list;
  }

  function mediaTypeFor(url) {
    return /\.pdf(\?|#|$)/i.test(url) ? "document" : "image";
  }

  /**
   * Stored value -> picker state.
   *   mode: 'none' | 'item' | 'tel' | 'mailto' | 'media' | 'custom'
   *   canonical: the value re-selecting this state writes back (=== the stored value, except legacy literals)
   *   optionValue (mode 'item'): the <option value> to preselect. For an alias match (a bare '#<id>' that the
   *     catalog lists as '/#<id>') this is the STORED value, so re-selecting never rewrites it.
   */
  function classify(value, catalog) {
    var v = value === undefined || value === null ? "" : String(value);
    if (v === "") return { mode: "none", canonical: "" };
    if (Object.prototype.hasOwnProperty.call(LEGACY_SENTINELS, v)) {
      return { mode: "custom", text: "#", legacy: true, canonical: "#" };
    }
    var items = flatItems(catalog);
    var i;
    for (i = 0; i < items.length; i++) {
      if (items[i].value === v) return { mode: "item", item: items[i], optionValue: v, canonical: v };
    }
    for (i = 0; i < items.length; i++) {
      var alts = items[i].alts || [];
      if (alts.indexOf(v) !== -1) return { mode: "item", item: items[i], optionValue: v, canonical: v, viaAlias: true };
    }
    // Built-ins are always known, even when the catalog could not be fetched.
    if (v === "/" || v === "#top") {
      return { mode: "item", item: { group: "builtin", label: v === "/" ? "Home" : "Back to Top", value: v }, optionValue: v, canonical: v };
    }
    if (startsWithCI(v, "tel:")) return { mode: "tel", text: v, canonical: v };
    if (startsWithCI(v, "mailto:")) return { mode: "mailto", text: v, canonical: v };
    var prefixes = mediaPrefixes(catalog);
    for (i = 0; i < prefixes.length; i++) {
      if (v.indexOf(prefixes[i]) === 0 && v.length > prefixes[i].length) {
        return { mode: "media", mediaType: mediaTypeFor(v), text: v, canonical: v };
      }
    }
    return { mode: "custom", text: v, canonical: v };
  }

  /** The <select> value that represents a state. */
  function selectValueFor(state) {
    switch (state.mode) {
      case "none": return "";
      case "item": return state.optionValue;
      case "tel": return S_TEL;
      case "mailto": return S_MAILTO;
      case "media": return state.mediaType === "image" ? S_IMG : S_DOC;
      default: return S_CUSTOM;
    }
  }

  function optionHtml(value, label, selected, disabled, title) {
    return (
      '<option value="' + escapeHtml(value) + '"' +
      (selected ? " selected" : "") +
      (disabled ? " disabled" : "") +
      (title ? ' title="' + escapeHtml(title) + '"' : "") +
      ">" + escapeHtml(label) + "</option>"
    );
  }

  /**
   * <option>/<optgroup> markup for the picker <select>. Everything is HTML-escaped.
   * A disabled catalog item is emitted `disabled` (not pickable) unless it IS the current value, so a saved
   * link to something now switched off still shows as the selection instead of silently becoming "No link".
   * opts: { allowNone (default true) }
   */
  function buildOptionsHtml(catalog, state, opts) {
    var allowNone = !opts || opts.allowNone !== false;
    var sel = selectValueFor(state);
    var html = "";
    if (allowNone) html += optionHtml("", "— No link —", sel === "", false);
    var groups = (catalog && catalog.groups) || [];
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var items = group.items || [];
      if (!items.length) continue;
      html += '<optgroup label="' + escapeHtml(group.label) + '">';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var isCurrent = state.mode === "item" && state.item === it;
        var val = isCurrent ? state.optionValue : it.value;
        html += optionHtml(val, it.label, isCurrent, !!it.disabled && !isCurrent, it.hint);
      }
      html += "</optgroup>";
    }
    html +=
      '<optgroup label="Media library">' +
      optionHtml(S_DOC, "Document (PDF) from library…", sel === S_DOC, false) +
      optionHtml(S_IMG, "Image from library…", sel === S_IMG, false) +
      "</optgroup>" +
      '<optgroup label="Other">' +
      optionHtml(S_CUSTOM, "Custom URL…", sel === S_CUSTOM, false) +
      optionHtml(S_TEL, "Phone number…", sel === S_TEL, false) +
      optionHtml(S_MAILTO, "Email address…", sel === S_MAILTO, false) +
      "</optgroup>";
    return html;
  }

  // ── Catalog fetch + cache ────────────────────────────────────────────────

  var cache = {}; // key(currentPage) -> { at, catalog } | { pending: Promise }
  var TTL_MS = 30000;

  function cacheKey(currentPage) {
    return currentPage === undefined || currentPage === null ? "" : String(currentPage);
  }

  function getCached(currentPage) {
    var e = cache[cacheKey(currentPage)];
    return e && e.catalog ? e.catalog : null;
  }

  function fetchJson(url) {
    if (typeof fetch !== "function") return Promise.reject(new Error("fetch unavailable"));
    return fetch(url, { credentials: "include" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /** Resolves with the catalog for `currentPage` (never rejects: falls back to the built-ins only). */
  function fetchCatalog(opts) {
    var currentPage = opts && opts.currentPage;
    var force = !!(opts && opts.force);
    var key = cacheKey(currentPage);
    var e = cache[key];
    if (!force && e) {
      if (e.pending) return e.pending;
      if (e.catalog && Date.now() - e.at < TTL_MS) return Promise.resolve(e.catalog);
    }
    var url = API + (currentPage ? "?currentPage=" + encodeURIComponent(currentPage) : "");
    var p = fetchJson(url)
      .then(function (json) {
        var catalog = json && json.success && json.data && Array.isArray(json.data.groups) ? json.data : FALLBACK_CATALOG;
        cache[key] = { at: Date.now(), catalog: catalog };
        return catalog;
      })
      .catch(function () {
        // Cache the fallback briefly so a logged-out designer does not hammer the API on every re-render.
        cache[key] = { at: Date.now(), catalog: FALLBACK_CATALOG };
        return FALLBACK_CATALOG;
      });
    cache[key] = { pending: p, catalog: e && e.catalog, at: e ? e.at : 0 };
    return p;
  }

  function searchMedia(params) {
    var sp = "group=media&type=" + encodeURIComponent(params.type);
    if (params.q) sp += "&q=" + encodeURIComponent(params.q);
    if (params.page) sp += "&page=" + encodeURIComponent(params.page);
    if (params.perPage) sp += "&perPage=" + encodeURIComponent(params.perPage);
    return fetchJson(API + "?" + sp).then(function (json) {
      if (!json || !json.success || !json.data) throw new Error("bad response");
      return json.data;
    });
  }

  /** The page whose sections a picker should treat as "this page" (bare #id links). null when unknown. */
  function detectCurrentPage() {
    try {
      if (root && root.__linkCurrentPage) return root.__linkCurrentPage;
      var parent = root && root.parent && root.parent !== root ? root.parent : null;
      var p = parent ? parent.location.pathname : "";
      if (/\/admin\/content\/landing-page/.test(p)) return "/";
      var m = p.match(/\/admin\/page-editor\/([^/?#]+)/);
      if (m) return decodeURIComponent(m[1]);
    } catch (e) {
      /* cross-origin parent or no window: unknown */
    }
    return null;
  }

  // ── DOM picker (used through inline handlers from the Designer's HTML strings) ──

  var pickers = {}; // id -> { id, value, onChange, placeholder, allowNone, currentPage, media:{type,q,page} }
  var searchTimers = {};

  function currentCatalogFor(cfg) {
    return getCached(cfg.currentPage) || FALLBACK_CATALOG;
  }

  function rootEl(id) {
    if (typeof document === "undefined") return null;
    var all = document.querySelectorAll("[data-ld-id]");
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute("data-ld-id") === id) return all[i];
    return null;
  }

  function part(el, name) {
    return el ? el.querySelector("[data-ld-" + name + "]") : null;
  }

  function show(el, on) {
    if (el) el.style.display = on ? "block" : "none";
  }

  function fileLabel(url) {
    try {
      var last = String(url).split(/[?#]/)[0].split("/").pop() || url;
      return decodeURIComponent(last);
    } catch (e) {
      return String(url);
    }
  }

  /** Sync the panels/inputs under the <select> with a state (does not touch cfg.value). */
  function applyState(el, cfg, state) {
    var custom = part(el, "custom");
    var input = part(el, "input");
    var media = part(el, "media");
    var note = part(el, "note");
    var selected = part(el, "selected");
    var isText = state.mode === "custom" || state.mode === "tel" || state.mode === "mailto";
    show(custom, isText);
    if (input && isText) {
      input.value = state.text || "";
      input.setAttribute(
        "placeholder",
        state.mode === "tel" ? "tel:+27821234567" : state.mode === "mailto" ? "mailto:name@example.com" : cfg.placeholder || "https://… or /page or #anchor"
      );
    }
    show(media, state.mode === "media");
    if (selected) selected.textContent = state.mode === "media" && state.text ? "Selected: " + fileLabel(state.text) : "";
    if (note) {
      note.textContent =
        state.mode === "item" && state.item && state.item.disabled
          ? "This destination exists but is currently switched off, so the link will not open on the live site."
          : state.legacy
            ? "This link was saved in an old format and does not point anywhere. Pick a destination."
            : "";
      show(note, !!note.textContent);
    }
  }

  function refresh(id) {
    var cfg = pickers[id];
    var el = rootEl(id);
    if (!cfg || !el) return;
    var catalog = currentCatalogFor(cfg);
    var state = classify(cfg.value, catalog);
    var sel = part(el, "select");
    if (sel) sel.innerHTML = buildOptionsHtml(catalog, state, { allowNone: cfg.allowNone });
    applyState(el, cfg, state);
  }

  /** Re-populate every mounted picker (called when a catalog finishes loading). */
  function refreshAll() {
    for (var id in pickers) if (Object.prototype.hasOwnProperty.call(pickers, id)) refresh(id);
  }

  function emit(cfg, value) {
    cfg.value = value;
    try {
      cfg.onChange(value);
    } catch (e) {
      if (typeof console !== "undefined") console.error("[link-destinations] onChange failed", e);
    }
  }

  /**
   * HTML for one picker. cfg: { id (unique in the DOM), value, onChange(value), placeholder?, allowNone?, currentPage? }.
   * Renders immediately from whatever catalog is cached (built-ins only on a cold start) and re-populates itself
   * when the catalog arrives, so callers never wait on the network.
   */
  function renderPicker(cfg) {
    var config = {
      id: String(cfg.id),
      value: cfg.value === undefined || cfg.value === null ? "" : String(cfg.value),
      onChange: cfg.onChange,
      placeholder: cfg.placeholder,
      allowNone: cfg.allowNone !== false,
      currentPage: cfg.currentPage === undefined ? detectCurrentPage() : cfg.currentPage,
      media: { type: "document", q: "", page: 1 },
    };
    pickers[config.id] = config;
    var catalog = currentCatalogFor(config);
    var state = classify(config.value, catalog);
    if (!getCached(config.currentPage)) {
      fetchCatalog({ currentPage: config.currentPage }).then(refreshAll);
    }
    var idAttr = escapeHtml(config.id);
    var isText = state.mode === "custom" || state.mode === "tel" || state.mode === "mailto";
    return (
      '<div class="ld-picker" data-ld-id="' + idAttr + '">' +
      '<select class="props-select" data-ld-select style="width:100%" onchange="LinkDestinations.onSelect(this)">' +
      buildOptionsHtml(catalog, state, { allowNone: config.allowNone }) +
      "</select>" +
      '<div data-ld-custom style="display:' + (isText ? "block" : "none") + ';margin-top:6px;">' +
      '<input class="props-input" type="text" data-ld-input style="width:100%;box-sizing:border-box" value="' + escapeHtml(isText ? state.text : "") + '"' +
      ' placeholder="' + escapeHtml(config.placeholder || "https://… or /page or #anchor") + '" oninput="LinkDestinations.onInput(this)">' +
      "</div>" +
      '<div data-ld-media style="display:' + (state.mode === "media" ? "block" : "none") + ';margin-top:6px;">' +
      '<div data-ld-selected style="font-size:11px;color:#495057;margin-bottom:4px;word-break:break-all;">' + (state.mode === "media" ? escapeHtml("Selected: " + fileLabel(state.text)) : "") + "</div>" +
      '<input class="props-input" type="search" data-ld-search style="width:100%;box-sizing:border-box" placeholder="Search the media library…" oninput="LinkDestinations.onSearch(this)">' +
      '<div data-ld-results style="margin-top:4px;max-height:180px;overflow:auto;border:1px solid #dee2e6;border-radius:5px;background:#fff;display:none;"></div>' +
      "</div>" +
      '<div data-ld-note style="display:none;margin-top:6px;font-size:11px;color:#856404;"></div>' +
      "</div>"
    );
  }

  function ownerOf(el) {
    var node = el;
    while (node && !(node.getAttribute && node.getAttribute("data-ld-id") !== null)) node = node.parentNode;
    if (!node) return null;
    var cfg = pickers[node.getAttribute("data-ld-id")];
    return cfg ? { el: node, cfg: cfg } : null;
  }

  function runSearch(owner, append) {
    var results = part(owner.el, "results");
    var m = owner.cfg.media;
    if (!results) return;
    results.style.display = "block";
    if (!append) results.innerHTML = '<div style="padding:6px 8px;font-size:11px;color:#6c757d;">Searching…</div>';
    searchMedia({ type: m.type, q: m.q, page: m.page, perPage: 20 })
      .then(function (data) {
        var html = "";
        for (var i = 0; i < data.items.length; i++) {
          var it = data.items[i];
          html +=
            '<button type="button" data-ld-value="' + escapeHtml(it.value) + '" onclick="LinkDestinations.onPick(this)" ' +
            'style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f3f5;background:#fff;padding:5px 8px;font-size:12px;cursor:pointer;">' +
            escapeHtml(it.label) +
            '<span style="display:block;font-size:10px;color:#868e96;">' + escapeHtml(it.hint) + "</span></button>";
        }
        if (append) {
          var old = results.querySelector("[data-ld-more]");
          if (old) old.parentNode.removeChild(old);
          results.insertAdjacentHTML("beforeend", html);
        } else {
          results.innerHTML = html || '<div style="padding:6px 8px;font-size:11px;color:#6c757d;">No matches.</div>';
        }
        if (data.page < data.totalPages) {
          results.insertAdjacentHTML(
            "beforeend",
            '<button type="button" data-ld-more onclick="LinkDestinations.onMore(this)" style="display:block;width:100%;border:0;background:#f8f9fa;padding:5px 8px;font-size:11px;cursor:pointer;">Load more (' +
              escapeHtml(String(data.total - data.page * data.perPage > 0 ? data.total - data.page * data.perPage : 0)) + " more)</button>"
          );
        }
      })
      .catch(function () {
        results.innerHTML = '<div style="padding:6px 8px;font-size:11px;color:#dc2626;">Could not load the media library (are you logged in?).</div>';
      });
  }

  function onSelect(selectEl) {
    var owner = ownerOf(selectEl);
    if (!owner) return;
    var cfg = owner.cfg;
    var v = selectEl.value;
    var catalog = currentCatalogFor(cfg);
    if (v === S_CUSTOM || v === S_TEL || v === S_MAILTO) {
      // Never persist the sentinel: store a harmless starting value and let the admin complete it.
      var start = v === S_TEL ? "tel:" : v === S_MAILTO ? "mailto:" : "#";
      applyState(owner.el, cfg, { mode: v === S_TEL ? "tel" : v === S_MAILTO ? "mailto" : "custom", text: start });
      emit(cfg, start);
      var input = part(owner.el, "input");
      if (input && input.focus) {
        input.focus();
        if (input.setSelectionRange) input.setSelectionRange(start.length, start.length);
      }
      return;
    }
    if (v === S_DOC || v === S_IMG) {
      cfg.media = { type: v === S_IMG ? "image" : "document", q: "", page: 1 };
      var st = classify(cfg.value, catalog);
      applyState(owner.el, cfg, st.mode === "media" && st.mediaType === cfg.media.type ? st : { mode: "media", mediaType: cfg.media.type, text: "" });
      var search = part(owner.el, "search");
      if (search) search.value = "";
      runSearch(owner, false);
      return; // nothing is written until a file is picked
    }
    emit(cfg, v);
    applyState(owner.el, cfg, classify(v, catalog));
  }

  function onInput(inputEl) {
    var owner = ownerOf(inputEl);
    if (owner) emit(owner.cfg, inputEl.value);
  }

  function onSearch(inputEl) {
    var owner = ownerOf(inputEl);
    if (!owner) return;
    var id = owner.cfg.id;
    clearTimeout(searchTimers[id]);
    searchTimers[id] = setTimeout(function () {
      owner.cfg.media.q = inputEl.value;
      owner.cfg.media.page = 1;
      runSearch(owner, false);
    }, 250);
  }

  function onMore(btn) {
    var owner = ownerOf(btn);
    if (!owner) return;
    owner.cfg.media.page += 1;
    runSearch(owner, true);
  }

  function onPick(btn) {
    var owner = ownerOf(btn);
    if (!owner) return;
    var url = btn.getAttribute("data-ld-value");
    emit(owner.cfg, url);
    var selected = part(owner.el, "selected");
    if (selected) selected.textContent = "Selected: " + fileLabel(url);
  }

  return {
    // pure
    escapeHtml: escapeHtml,
    classify: classify,
    selectValueFor: selectValueFor,
    buildOptionsHtml: buildOptionsHtml,
    flatItems: flatItems,
    FALLBACK_CATALOG: FALLBACK_CATALOG,
    LEGACY_SENTINELS: LEGACY_SENTINELS,
    SENTINELS: { custom: S_CUSTOM, tel: S_TEL, mailto: S_MAILTO, doc: S_DOC, img: S_IMG },
    // network
    fetchCatalog: fetchCatalog,
    prefetch: function (opts) {
      return fetchCatalog(opts || { currentPage: detectCurrentPage() }).then(refreshAll);
    },
    searchMedia: searchMedia,
    detectCurrentPage: detectCurrentPage,
    // DOM
    renderPicker: renderPicker,
    refreshAll: refreshAll,
    onSelect: onSelect,
    onInput: onInput,
    onSearch: onSearch,
    onMore: onMore,
    onPick: onPick,
  };
});
