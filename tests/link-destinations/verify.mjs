/**
 * Real-browser check of the Flexible Designer "Link To" picker against a SEEDED throwaway database.
 *
 *   1. DATABASE_URL=…/link_dest_fidelity npx tsx tests/link-destinations/seed.ts [--coverage=off] [--policies=off]
 *   2. run a dev server on a free port with that DATABASE_URL (+ JWT_SECRET / JWT_REFRESH_SECRET)
 *   3. LD_BASE_URL=http://127.0.0.1:<port> node tests/link-destinations/verify.mjs [--expect-coverage=off] [--expect-policies=off] [--shots=<dir>]
 *
 * Asserts (exit code 1 on any failure):
 *   - the dropdown shows Built-in / Pages / Sections / Forms / Plugins & Features / Policies / Galleries / Content groups
 *   - Coverage Map and each policy are selectable ONLY when their real gate is on (otherwise disabled + labelled)
 *   - selecting a page / section / policy / feature stores the exact expected value
 *   - documents and images: typeahead filters, picking stores the stored MediaAsset.url exactly
 *   - Custom / Phone / Email never persist the UI sentinels ('custom' / 'tel' / 'mailto')
 *   - every OLD stored value format preselects the matching option (or Custom URL pre-filled) and re-selecting keeps it
 *   - the hero button link writes btnNavTarget (the key the live renderer reads)
 *   - no console errors
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = (process.env.LD_BASE_URL ?? "http://127.0.0.1:47213").replace(/\/$/, "");
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (n) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : undefined; };
const covOn = !has("--expect-coverage=off");
const polOn = !has("--expect-policies=off");
const shotDir = opt("shots");
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

const IDS = {
  homeHero: "11111111-1111-4111-8111-111111111111",
  aboutTeam: "44444444-4444-4444-8444-444444444444",
};

let failures = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  -- ${detail}` : ""}`);
}

async function login(context) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: { username: "ld-admin", password: "ld-test-password" } });
  if (!res.ok()) throw new Error(`login failed: ${res.status()} ${await res.text()}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const consoleErrors = [];
try {
  await login(context);
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  // ── the API itself (what every picker reads) ─────────────────────────────
  const cat = await (await context.request.get(`${BASE}/api/link-destinations?currentPage=/`)).json();
  check("catalog API returns groups", cat.success && Array.isArray(cat.data.groups), `${cat.data?.groups?.length} groups`);
  const items = cat.data.groups.flatMap((g) => g.items);
  const byValue = (v) => items.find((i) => i.value === v);
  check("Coverage Map gate", covOn ? byValue("/coverage") && !byValue("/coverage").disabled : byValue("/coverage")?.disabled === true, JSON.stringify(byValue("/coverage")));
  check("policy gate (privacy)", polOn ? byValue("/policies/privacy-policy") && !byValue("/policies/privacy-policy").disabled : byValue("/policies/privacy-policy")?.disabled === true);
  check("disabled policy flagged (terms)", byValue("/policies/terms")?.disabled === true);
  check("draft page flagged", byValue("/services-2")?.disabled === true);
  check("disabled page flagged", byValue("/old-page")?.disabled === true);
  check("tab page 'not linkable'", byValue("/tabby")?.disabled === true);
  check("form under Forms group", byValue("/contact-form")?.group === "forms");
  check("this-page sections use bare #id", !!byValue(`#${IDS.homeHero}`), "");
  check("other-page section is /about#id", !!byValue(`/about#${IDS.aboutTeam}`));
  check("gallery + inactive gallery", byValue("/gallery/projects") && byValue("/gallery/archive")?.disabled === true);
  check("content listing + published entry", byValue("/content/blog") && byValue("/content/blog/hello-world") && byValue("/content/blog/unfinished")?.disabled === true);
  const unauth = await (await browser.newContext()).request.get(`${BASE}/api/link-destinations`);
  check("anonymous request is rejected (401)", unauth.status() === 401, String(unauth.status()));
  const cc = (await context.request.get(`${BASE}/api/link-destinations`)).headers()["cache-control"];
  check("Cache-Control: no-store", cc === "no-store", String(cc));
  const media = await (await context.request.get(`${BASE}/api/link-destinations?group=media&type=document`)).json();
  check("media documents: 3 PDFs", media.data.total === 3 && media.data.items[0].value.startsWith("/uploads/"), `total=${media.data.total}`);
  const imgs = await (await context.request.get(`${BASE}/api/link-destinations?group=media&type=image&perPage=20&page=3`)).json();
  check("media images paginate beyond 50 (46 imgs, page 3 of 3 with perPage 20 has 6)", imgs.data.total === 46 && imgs.data.items.length === 6, `total=${imgs.data.total} items=${imgs.data.items.length}`);

  // ── the Designer ─────────────────────────────────────────────────────────
  // The designer detects "this page" from its PARENT window; standalone there is none, so declare it explicitly
  // (the same hook the admin modal path resolves through window.parent.location).
  await page.addInitScript(() => { window.__linkCurrentPage = "/"; });
  await page.goto(`${BASE}/flexible-designer.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => typeof window.LinkDestinations === "object" && typeof window.renderNavSection === "function");
  await page.waitForFunction(() => !!window.LinkDestinations.detectCurrentPage());

  // A banner, a hero and a text block with a button sub-element, all with old stored values.
  await page.evaluate(({ ids }) => {
    const mk = (id, type, props, subs) => ({ id, type, section: 0, gridRow: 1, gridCol: 1, colSpan: 1, rowSpan: 1, x: 20, y: 20, w: 400, h: 200, zIndex: 1, props: Object.assign({}, BLOCK_DEFAULTS[type], props), subElements: subs || [] });
    state.blocks.length = 0;
    state.blocks.push(mk("t-banner", "banner", { navTarget: "" }));
    state.blocks.push(mk("t-hero", "hero", { btnNavTarget: "", showBtn: true }));
    state.blocks.push(mk("t-text", "text", {}, [{ id: "t-btn", type: "button", props: Object.assign({}, SUB_DEFAULTS.button, { navTarget: "" }), x: 0, y: 8, w: null }]));
    state.blocks.push(mk("t-card", "card-tabs", { ctaUrl: "" }));
    renderCanvas();
    selectBlock("t-banner");
    window.__ids = ids;
  }, { ids: IDS });

  const select = () => page.locator("#props-panel .ld-picker select, .props-panel .ld-picker select, .ld-picker select").first();
  const optGroupLabels = () => page.$$eval(".ld-picker select optgroup", (gs) => gs.map((g) => g.label));
  await page.waitForSelector(".ld-picker select");
  // wait for the catalog to have replaced the built-ins-only cold render
  await page.waitForFunction(() => [...document.querySelectorAll(".ld-picker select optgroup")].some((g) => g.label === "Pages"), null, { timeout: 15000 });

  const groups = await optGroupLabels();
  console.log("groups:", groups.join(" | "));
  for (const g of ["Built-in", "Pages", "Sections - This page", "Sections - About Us", "Forms", "Plugins & Features", "Policies", "Galleries", "Content", "Media library", "Other"]) {
    check(`dropdown group "${g}"`, groups.includes(g));
  }
  const optStates = await page.$$eval(".ld-picker select option", (os) => os.map((o) => ({ v: o.value, t: o.textContent, d: o.disabled })));
  const opt = (v) => optStates.find((o) => o.v === v);
  check("dropdown: Coverage Map", covOn ? opt("/coverage") && !opt("/coverage").d : opt("/coverage")?.d === true, JSON.stringify(opt("/coverage")));
  check("dropdown: policy Privacy Policy", polOn ? opt("/policies/privacy-policy") && !opt("/policies/privacy-policy").d : opt("/policies/privacy-policy")?.d === true);
  check("dropdown: policy AUP uses navLabel", opt("/policies/acceptable-use")?.t.startsWith("AUP") === true);
  check("dropdown: Terms (disabled policy) not pickable", opt("/policies/terms")?.d === true);
  check("dropdown: /about page", opt("/about") && !opt("/about").d);
  check("dropdown: page without linkable route not pickable", opt("/tabby")?.d === true);

  if (shotDir) await page.screenshot({ path: path.join(shotDir, "01-panel.png") });

  // Open the native dropdown visually: the <select> popup is not screenshot-able, so render an expanded list too.
  await page.evaluate(() => { const s = document.querySelector(".ld-picker select"); s.size = 46; s.style.height = "auto"; s.scrollIntoView({ block: "start" }); });
  if (shotDir) await page.locator(".ld-picker select").first().screenshot({ path: path.join(shotDir, "02-dropdown-expanded.png") });
  await page.evaluate(() => { const s = document.querySelector(".ld-picker select"); s.size = 1; });

  // ── selections store exact values ────────────────────────────────────────
  const stored = (blockId, key) => page.evaluate(([b, k]) => state.blocks.find((x) => x.id === b).props[k], [blockId, key]);
  const pick = async (v) => { await select().selectOption(v); };

  if (polOn) {
    await pick("/policies/privacy-policy");
    check("select policy stores /policies/privacy-policy", (await stored("t-banner", "navTarget")) === "/policies/privacy-policy");
  }
  await pick("/about");
  check("select page stores /about", (await stored("t-banner", "navTarget")) === "/about");
  await pick(`#${IDS.homeHero}`);
  check("select this-page section stores bare #id", (await stored("t-banner", "navTarget")) === `#${IDS.homeHero}`);
  await pick(`/about#${IDS.aboutTeam}`);
  check("select other-page section stores /about#id", (await stored("t-banner", "navTarget")) === `/about#${IDS.aboutTeam}`);
  if (covOn) {
    await pick("/coverage");
    check("select Coverage Map stores /coverage", (await stored("t-banner", "navTarget")) === "/coverage");
  }
  await pick("__tel__");
  check("Phone selection never persists the sentinel", !["tel", "__tel__"].includes(await stored("t-banner", "navTarget")), JSON.stringify(await stored("t-banner", "navTarget")));
  await page.locator(".ld-picker [data-ld-input]").first().fill("tel:+27821234567");
  check("typed phone number stored", (await stored("t-banner", "navTarget")) === "tel:+27821234567");
  await pick("__mailto__");
  await page.locator(".ld-picker [data-ld-input]").first().fill("mailto:info@example.com");
  check("typed email stored", (await stored("t-banner", "navTarget")) === "mailto:info@example.com");
  await pick("__custom__");
  await page.locator(".ld-picker [data-ld-input]").first().fill("https://example.com/a?b=1");
  check("typed custom URL stored", (await stored("t-banner", "navTarget")) === "https://example.com/a?b=1");
  await pick("");
  check("No link stores ''", (await stored("t-banner", "navTarget")) === "");

  // documents typeahead
  await pick("__doc__");
  await page.waitForSelector(".ld-picker [data-ld-results] button[data-ld-value]");
  const docCount = await page.locator(".ld-picker [data-ld-results] button[data-ld-value]").count();
  check("document typeahead lists all 3 PDFs", docCount === 3, String(docCount));
  await page.locator(".ld-picker [data-ld-search]").first().fill("price");
  await page.waitForFunction(() => document.querySelectorAll(".ld-picker [data-ld-results] button[data-ld-value]").length === 1);
  check("document typeahead filters ('price' -> 1)", true);
  if (shotDir) await page.screenshot({ path: path.join(shotDir, "03-doc-typeahead.png") });
  await page.locator(".ld-picker [data-ld-results] button[data-ld-value]").first().click();
  check("picking a PDF stores its exact stored url", (await stored("t-banner", "navTarget")) === "/uploads/price-list-2026.pdf", String(await stored("t-banner", "navTarget")));

  // images typeahead + pagination
  await pick("__img__");
  await page.waitForSelector(".ld-picker [data-ld-results] button[data-ld-value]");
  const first20 = await page.locator(".ld-picker [data-ld-results] button[data-ld-value]").count();
  check("image typeahead shows a first page of 20", first20 === 20, String(first20));
  await page.locator(".ld-picker [data-ld-results] [data-ld-more]").first().click();
  await page.waitForFunction(() => document.querySelectorAll(".ld-picker [data-ld-results] button[data-ld-value]").length === 40);
  check("image typeahead 'Load more' appends the next page", true);
  await page.locator(".ld-picker [data-ld-search]").first().fill("Mast");
  await page.waitForFunction(() => document.querySelectorAll(".ld-picker [data-ld-results] button[data-ld-value]").length === 1);
  await page.locator(".ld-picker [data-ld-results] button[data-ld-value]").first().click();
  check("picking an image stores its exact url", (await stored("t-banner", "navTarget")) === "/uploads/mast-install.webp");

  // ── every OLD stored value format preselects and re-selecting keeps it ───
  const OLD = [
    ["", "No link"],
    ["/", "Home"],
    ["#top", "Back to Top"],
    ["/about", "page"],
    [`#${IDS.homeHero}`, "this-page section"],
    [`#${IDS.aboutTeam}`, "legacy bare anchor to a section on another page (alias)"],
    ["/policies/privacy-policy", "policy"],
    ["/coverage", "coverage"],
    ["/contactus", "deleted page -> custom"],
    ["/coverage?package=abc", "custom with query"],
    ["https://www.facebook.com/wifisonic/", "external url"],
    ["tel:+27821234567", "tel"],
    ["mailto:a@b.co", "mailto"],
    ["/uploads/price-list-2026.pdf", "media pdf"],
    ["/uploads/does-not-exist.png", "media not in library"],
    ["custom", "legacy sentinel"],
    ["tel", "legacy sentinel"],
    ["mailto", "legacy sentinel"],
  ];
  let oldOk = 0;
  for (const [value, why] of OLD) {
    const out = await page.evaluate(([val]) => {
      const b = state.blocks.find((x) => x.id === "t-banner");
      b.props.navTarget = val;
      const html = renderNavSection("t-banner", val, "block", "");
      const host = document.createElement("div");
      host.id = "ld-probe";
      host.innerHTML = html;
      document.body.appendChild(host);
      const sel = host.querySelector("select");
      const selected = sel.options[sel.selectedIndex];
      const r = { sel: sel.value, text: selected ? selected.textContent : null, selectedCount: [...sel.options].filter((o) => o.selected).length, input: (host.querySelector("[data-ld-input]") || {}).value };
      // re-select the preselected option (the "round trip"): what would be written?
      let written = null;
      const cfgId = host.querySelector("[data-ld-id]").getAttribute("data-ld-id");
      b.props.navTarget = "__untouched__";
      if (!sel.value.startsWith("__")) { sel.dispatchEvent(new Event("change", { bubbles: true })); written = b.props.navTarget; }
      host.remove();
      return Object.assign(r, { written, cfgId });
    }, [value]);
    const isSentinelSel = out.sel.startsWith("__");
    const legacy = ["custom", "tel", "mailto"].includes(value);
    const expectSel = value === "" ? "" : legacy || isSentinelSel ? out.sel : value;
    // Non-sentinel states: re-selecting must write back exactly the stored value. Sentinel states (custom/tel/mailto/doc/img)
    // keep the value in their input/label instead: the panel is pre-filled with the stored value.
    let ok = out.selectedCount === 1;
    if (!isSentinelSel) ok = ok && out.written === value;
    else if (value.length && !legacy && (out.sel === "__custom__" || out.sel === "__tel__" || out.sel === "__mailto__")) ok = ok && out.input === value;
    else if (legacy) ok = ok && out.sel === "__custom__" && out.input === "#";
    if (ok) oldOk++;
    check(`old value ${JSON.stringify(value)} (${why}) -> ${out.text}`, ok, JSON.stringify({ sel: out.sel, written: out.written, input: out.input }));
  }
  console.log(`old-value round trip: ${oldOk}/${OLD.length}`);

  // ── the other callers ────────────────────────────────────────────────────
  await page.evaluate(() => selectBlock("t-hero"));
  await page.waitForSelector(".ld-picker select");
  await page.locator(".ld-picker select").first().selectOption("/about");
  check("hero button link writes btnNavTarget (the key the renderer reads)", (await stored("t-hero", "btnNavTarget")) === "/about" && (await stored("t-hero", "navTarget")) === undefined);

  await page.evaluate(() => selectSubElement("t-text", "t-btn"));
  await page.waitForSelector(".ld-picker select");
  await page.locator(".ld-picker select").first().selectOption("/gallery/projects");
  const subVal = await page.evaluate(() => state.blocks.find((b) => b.id === "t-text").subElements[0].props.navTarget);
  check("button sub-element link stores navTarget", subVal === "/gallery/projects", String(subVal));

  await page.evaluate(() => selectBlock("t-card"));
  await page.waitForSelector(".ld-picker select");
  const ctaSel = await page.locator(".ld-picker select").first().inputValue();
  check("card-tabs empty ctaUrl shows the default /coverage target", ctaSel === "/coverage", ctaSel);
  check("card-tabs has no 'No link' option", (await page.locator(".ld-picker select option[value='']").count()) === 0);
  await page.locator(".ld-picker select").first().selectOption("/about");
  check("card-tabs link stores ctaUrl", (await stored("t-card", "ctaUrl")) === "/about");
  if (shotDir) await page.screenshot({ path: path.join(shotDir, "04-card-tabs.png") });

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" || "));
} catch (e) {
  failures++;
  console.error("FATAL", e);
} finally {
  await browser.close();
}

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
