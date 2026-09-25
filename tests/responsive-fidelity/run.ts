/**
 * Responsive-fidelity harness — real browser, real public render path.
 *
 * WHAT IT PROVES (for every fixture x every viewport in config.ts):
 *   (i)   content plate scale/offset == the contract (oracle.ts) and is UNIFORM
 *   (ii)  every block + container sub-element wrapper rect == canvas position x scale + offset (<= 1px)
 *   (iii) no element anywhere in the section is non-uniformly scaled (the background used to be)
 *   (iv)  no heading/eyebrow renders more lines than the Designer measured for it (stored _measuredH),
 *         unless it was authored with a fixed height
 *   (v)   no two text wrappers overlap unless they overlap in the stored canvas geometry
 *   (vi)  section height == 100vh (single) / the design height (free multi) / multiLimit x 100vh (multi)
 *   (vii) a screenshot per combination -> test-artifacts/screens/<label>/
 * plus: background present + correct for the breakpoint (B), content not blank (B), the un-authored
 * Mobile reading-order reflow is legible (no horizontal overflow / no tiny text), no horizontal page scroll.
 *
 * USAGE (dev server on :3100 with DATABASE_URL pointing at a database whose name contains "fidelity"):
 *   npx tsx tests/responsive-fidelity/run.ts --label before
 *   npx tsx tests/responsive-fidelity/run.ts --label after --only per-breakpoint,live-kuluntu
 *   flags: --viewport <name,...>  --no-shots  --no-seed  --dump-rects <file>
 * Optional env: FIDELITY_BASE_URL, FIDELITY_LIVE_URL (proxy /uploads, /images/uploads, /api/public/volt to a
 * real site so live-derived fixtures show their real media), see fetch-live-fixtures.mjs.
 * Exit code 1 if any check fails.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { BASE_URL, FIXTURE_ASSET_ROUTE, TOL, VIEWPORTS, type ViewportSpec } from "./config";
import { loadFixtures } from "./fixtures/load";
import type { Fixture } from "./fixtures/synthetic";
import { seedFixtures } from "./seed";
import { expectationFor, expectedItems, expectedPlate, measuredLines, type Expectation, type ExpectedItem } from "./oracle";
import { buildRoundTrips, evaluateParity, type RoundTrip } from "./parity";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright") as typeof import("playwright");

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const label = opt("label") ?? "run";
const only = opt("only")?.split(",").filter(Boolean);
const onlyVp = opt("viewport")?.split(",").filter(Boolean);
const dumpRects = opt("dump-rects");
const shots = !flag("no-shots");
const RT_VIEWPORT = "laptop-1440x900"; // Designer round-trip fixtures are only rendered at the Designer's own 1440 canvas width

const outDir = path.join(here, "test-artifacts");
const shotDir = path.join(outDir, "screens", label);
fs.mkdirSync(shotDir, { recursive: true });

const measureSrc = fs.readFileSync(path.join(here, "measure.browser.js"), "utf8");
const LIVE = (process.env.FIDELITY_LIVE_URL ?? "").replace(/\/$/, "");

// ── result types ────────────────────────────────────────────────────────────
interface Check { id: string; pass: boolean; detail: string; magnitude: number }
interface Combo { fixture: string; viewport: string; bp: string; checks: Check[]; notes: string[]; errors: string[] }

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

function evaluate(fx: Fixture, vp: ViewportSpec, exp: Expectation, m: any): Check[] {
  const checks: Check[] = [];
  const add = (id: string, pass: boolean, detail: string, magnitude = 0) => checks.push({ id, pass, detail, magnitude });
  if (m.error) { add("page.renders", false, m.error, 1e6); return checks; }

  add("no-hscroll", m.docScrollW <= vp.w + 1 && m.sectionScrollW <= vp.w + 1,
    `doc scrollWidth ${m.docScrollW}, section scrollWidth ${m.sectionScrollW}, viewport ${vp.w}`, Math.max(0, m.docScrollW - vp.w));

  // (iii) — never any non-uniform scale anywhere in the section.
  add("iii.no-nonuniform-scale", m.nonUniform.length === 0,
    m.nonUniform.length ? m.nonUniform.slice(0, 3).map((n: any) => `${n.fx || n.tag}(${n.sx} x ${n.sy})`).join(", ") : "ok",
    m.nonUniform.reduce((mx: number, n: any) => Math.max(mx, Math.abs(n.sx - n.sy) / Math.max(n.sx, n.sy)), 0) * 100);

  // (vi) height contract
  const isFreePlate = exp.isFree && !exp.reflow && !exp.blank;
  if (exp.reflow) {
    // The un-authored-Mobile reading-order reflow is content-driven by design (CSS height:auto + min-height:100vh):
    // there is no fixed height contract to assert.
  } else if (m.contentMode === "single") {
    add("vi.height", near(m.section.h, m.vh, TOL.section), `section ${m.section.h} vs 100vh ${m.vh}`, Math.abs(m.section.h - m.vh));
  } else if (m.contentMode === "multi") {
    const want = isFreePlate ? (m.vw * exp.chTotal) / exp.cw : m.vh * exp.multiLimit;
    add("vi.height", near(m.section.h, want, TOL.section + 1), `section ${m.section.h} vs expected ${Math.round(want)}`, Math.abs(m.section.h - want));
  }

  // Background (B): image + colour for this breakpoint.
  if (exp.isFree || exp.bg.image) {
    if (exp.bg.image) {
      const base = exp.bg.image.split("?")[0].split("/").pop()!;
      const found = m.bgImages.some((b: any) => b.url.includes(base));
      add("B.bg-image-present", found, found ? "ok" : `expected ${exp.bg.kind} bg image ${base} not painted (blank background)`, found ? 0 : 1);
    }
  }
  if (exp.isFree && exp.bg.kind !== "neutral" && exp.bg.color && exp.bg.color !== "transparent" && !exp.bg.image) {
    add("B.bg-colour-present", m.sectionBgColor !== "rgba(0, 0, 0, 0)" && m.sectionBgColor !== "transparent",
      `section background-color ${m.sectionBgColor} (expected ${exp.bg.kind} ${exp.bg.color})`, 1);
  }

  // Content must not be blank when the contract says something should render.
  if (exp.isFree && !exp.blank) {
    const have = exp.reflow ? m.textRuns.length : m.blockCount;
    add("B.content-present", have > 0, `${have} rendered ${exp.reflow ? "text runs" : "blocks/sub-elements"} (bp ${exp.bp}, authored ${exp.authored})`, have > 0 ? 0 : 1);
  } else if (!exp.isFree) {
    if (exp.hasContent) add("B.content-present", m.textRuns.length > 0, `${m.textRuns.length} text runs in a non-free section`, m.textRuns.length > 0 ? 0 : 1);
  } else if (exp.blank) {
    add("B.blank-as-configured", m.blockCount === 0, `fallback "none": ${m.blockCount} blocks rendered`, m.blockCount);
  }

  // Reflow legibility (un-authored Mobile under 768).
  if (exp.reflow) {
    const tooTiny = m.textRuns.filter((t: any) => t.fs < 11);
    const overflow = m.textRuns.filter((t: any) => t.x < -1 || t.x + t.w > vp.w + 1);
    add("R.reflow-legible", tooTiny.length === 0 && overflow.length === 0,
      `${tooTiny.length} runs < 11px, ${overflow.length} runs outside the viewport`, tooTiny.length + overflow.length);
    return checks;
  }
  if (!isFreePlate) return checks;

  // (i) plate transform
  if (!m.content || !m.stage) {
    add("i.plate-present", false, "no content plate / stage in DOM", 1e6);
    return checks;
  }
  const want = expectedPlate(exp, m.stage.w, m.stage.h);
  const got = m.content.matrix;
  add("i.plate-uniform", near(got.sx, got.sy, 0.0005), `plate scale ${got.sx} x ${got.sy}`, Math.abs(got.sx - got.sy));
  add("i.plate-scale", near(got.a, want.scale, TOL.scale), `plate scale ${got.a} vs contract ${want.scale} (stage ${m.stage.w}x${m.stage.h}, canvas ${exp.cw}x${exp.ch})`, Math.abs(got.a - want.scale));
  const dx = m.content.rect.x - (m.stage.x + want.offsetX);
  const dy = m.content.rect.y - (m.stage.y + want.offsetY);
  add("i.plate-offset", Math.abs(dx) <= TOL.offset && Math.abs(dy) <= TOL.offset, `plate offset off by (${dx.toFixed(1)}, ${dy.toFixed(1)}) px`, Math.max(Math.abs(dx), Math.abs(dy)));

  // Background fills the stage (single) — uniform, no gutters (A).
  if (exp.bg.image && m.bgPlates.length) {
    const b = m.bgPlates[0].rect;
    const okBox = near(b.x, m.stage.x, TOL.rect) && near(b.y, m.stage.y, TOL.rect) && near(b.w, m.stage.w, TOL.rect) && near(b.h, m.stage.h, TOL.rect + (exp.multi ? 1 : 0));
    add("A.bg-fills-stage", okBox, `bg plate ${b.w}x${b.h}@(${b.x},${b.y}) vs stage ${m.stage.w}x${m.stage.h}@(${m.stage.x},${m.stage.y})`,
      Math.max(Math.abs(b.w - m.stage.w), Math.abs(b.h - m.stage.h)));
  }

  // (ii) every block / sub-element rect
  const items = expectedItems(exp.variant);
  const s = got.a;
  let worst = 0; let bad = 0; let missing = 0; let firstBad = "";
  for (const it of items) {
    const meas = it.kind === "sub" ? m.subs[it.id]?.rect : m.blocks[it.id]?.rect;
    if (!meas) { missing++; if (!firstBad) firstBad = `${it.id} missing`; continue; }
    const ex = m.content.rect.x + it.x * s;
    const ey = m.content.rect.y + it.y * s;
    const ew = it.w * s;
    const eh = it.h === null ? null : it.h * s;
    const devs = [Math.abs(meas.x - ex), Math.abs(meas.y - ey), Math.abs(meas.w - ew)];
    if (eh !== null) devs.push(Math.abs(meas.h - eh));
    const dev = Math.max(...devs);
    worst = Math.max(worst, dev);
    if (dev > TOL.rect) { bad++; if (!firstBad) firstBad = `${it.id} off by ${dev.toFixed(1)}px`; }
  }
  add("ii.item-rects", bad === 0 && missing === 0, `${items.length} items: ${bad} off by > ${TOL.rect}px (worst ${worst.toFixed(1)}), ${missing} missing${firstBad ? ` — ${firstBad}` : ""}`, worst + missing * 1000);

  // (iv) line counts vs the Designer's stored measurement.
  let lineBad = 0; let lineWorst = 0; let lineFirst = ""; let lineChecked = 0;
  for (const it of items) {
    const want2 = measuredLines(it);
    if (want2 === null) continue;
    const got2 = m.subs[it.id];
    if (!got2) continue;
    lineChecked++;
    if (got2.lines > want2) {
      lineBad++; lineWorst = Math.max(lineWorst, got2.lines - want2);
      if (!lineFirst) lineFirst = `${it.id} "${it.type}" renders ${got2.lines} lines, Designer measured ${want2}`;
    }
  }
  add("iv.no-extra-lines", lineBad === 0, `${lineChecked} measured text items: ${lineBad} wrap to more lines than measured${lineFirst ? ` — ${lineFirst}` : ""}`, lineWorst);

  // (v) overlap: live pairs must be a subset of canvas-data pairs.
  const textItems = items.filter((it) => it.kind === "sub" && ["heading", "eyebrow", "paragraph", "button"].includes(it.type));
  const tol = TOL.overlap;
  const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > tol && oy > tol ? Math.min(ox, oy) : 0;
  };
  let newOverlap = 0; let ovFirst = ""; let ovWorst = 0;
  for (let i = 0; i < textItems.length; i++) {
    for (let j = i + 1; j < textItems.length; j++) {
      const A = textItems[i]; const B = textItems[j];
      const sa = m.subs[A.id]; const sb = m.subs[B.id];
      if (!sa?.text || !sb?.text) continue;
      // GLYPH boxes (not wrapper boxes: the live wrapper also contains the block-level margin-bottom
      // the renderer gives every text element, which is empty space, not text).
      const glyph = (sub: any) => ({ x: sub.text.x / s, y: sub.text.y / s, w: sub.text.w / s, h: sub.text.h / s });
      const ga = glyph(sa); const gb = glyph(sb);
      const live = overlaps(ga, gb);
      if (!live) continue;
      // What the DESIGN says: identical glyph boxes, except a heading/eyebrow has only the number of lines the
      // Designer measured (a stale measurement is exactly what makes live text spill into the next element).
      const designBox = (it: ExpectedItem, g: { x: number; y: number; w: number; h: number }, lines: number) => {
        const want = measuredLines(it);
        return want !== null && lines > 0 ? { ...g, h: (g.h / lines) * want } : g;
      };
      const cv = overlaps(designBox(A, ga, sa.lines), designBox(B, gb, sb.lines));
      if (!cv) { newOverlap++; ovWorst = Math.max(ovWorst, live); if (!ovFirst) ovFirst = `${A.id} x ${B.id} text overlaps by ${live.toFixed(0)}px (canvas units) but not in the design`; }
    }
  }
  add("v.no-new-overlap", newOverlap === 0, `${textItems.length} text items: ${newOverlap} new overlapping pair(s)${ovFirst ? ` — ${ovFirst}` : ""}`, ovWorst);
  return checks;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const fixtures = loadFixtures({ only });
  const viewports = onlyVp ? VIEWPORTS.filter((v) => onlyVp.some((o) => v.name.includes(o))) : VIEWPORTS;

  const browser = await chromium.launch();
  let rts: RoundTrip[] = [];
  if (!flag("no-seed")) {
    if (!flag("no-roundtrip")) rts = await buildRoundTrips(browser, fixtures);
    console.log(`seeded ${await seedFixtures([...loadFixtures(), ...rts.map((r) => r.fixture)])} fixture pages (${rts.length} Designer round-trips)`);
  }
  const rtByName = new Map(rts.map((r) => [r.fixture.name, r]));
  const runList: Fixture[] = [...fixtures, ...rts.map((r) => r.fixture)];
  const combos: Combo[] = [];
  const rectDump: Record<string, unknown> = {};
  const assetsDir = path.join(here, "fixtures", "assets");

  for (const vp of viewports) {
    const mobileLike = /phone|tablet/.test(vp.name);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: mobileLike, hasTouch: mobileLike, deviceScaleFactor: 1 });
    await ctx.route(`**${FIXTURE_ASSET_ROUTE}*`, (route) => {
      const file = path.join(assetsDir, path.basename(new URL(route.request().url()).pathname));
      return fs.existsSync(file) ? route.fulfill({ path: file, contentType: "image/svg+xml" }) : route.fulfill({ status: 404 });
    });
    if (LIVE) {
      await ctx.route(/\/(uploads|images\/uploads|api\/public\/volt|api\/packages|api\/templates)\b/, async (route) => {
        const u = new URL(route.request().url());
        if (u.origin === LIVE || route.request().method() !== "GET" || u.origin !== new URL(BASE_URL).origin) return route.continue();
        try { return await route.fulfill({ response: await route.fetch({ url: LIVE + u.pathname + u.search }) }); } catch { return route.continue(); }
      });
    }
    for (const fx of runList) {
      if (rtByName.has(fx.name) && vp.name !== RT_VIEWPORT) continue;
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
      const exp = expectationFor(fx.section, vp.w);
      let m: any;
      try {
        await page.goto(`${BASE_URL}/fx-${fx.name}`, { waitUntil: "load", timeout: 120000 });
        await page.waitForSelector("section.flexible-section", { timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(900);
        // settle: re-measure until geometry stops moving (fonts swapping, ResizeObserver state updates)
        let prev = "";
        for (let i = 0; i < 8; i++) {
          m = await page.evaluate(measureSrc);
          const sig = JSON.stringify([m.stage, m.content?.rect, Object.values(m.subs ?? {}).map((s: any) => s.rect), m.section]);
          if (sig === prev) break;
          prev = sig;
          await page.waitForTimeout(350);
        }
      } catch (e) {
        m = { error: `load failed: ${String((e as Error).message).slice(0, 160)}` };
      }
      const checks = evaluate(fx, vp, exp, m);
      const rt = rtByName.get(fx.name);
      if (rt && !m.error) checks.push(...evaluateParity(rt, m.subs));
      combos.push({ fixture: fx.name, viewport: vp.name, bp: exp.bp, checks, notes: [], errors });
      if (dumpRects && !m.error) rectDump[`${fx.name}@${vp.name}`] = { stage: m.stage, content: m.content, subs: Object.fromEntries(Object.entries(m.subs).map(([k, v]: any) => [k, v.rect])), blocks: Object.fromEntries(Object.entries(m.blocks).map(([k, v]: any) => [k, v.rect])), section: m.section };
      if (shots) {
        try {
          await page.screenshot({ path: path.join(shotDir, `${fx.name}__${vp.name}.png`), fullPage: true });
        } catch { /* ignore */ }
      }
      await page.close();
      const failed = checks.filter((c) => !c.pass).map((c) => c.id);
      console.log(`${failed.length ? "FAIL" : "ok  "}  ${fx.name.padEnd(34)} ${vp.name.padEnd(26)} ${exp.bp.padEnd(7)}${failed.length ? "  " + failed.join(", ") : ""}`);
    }
    await ctx.close();
  }
  await browser.close();

  // ── report ────────────────────────────────────────────────────────────────
  const byCheck = new Map<string, { fail: number; total: number; worst: { combo: string; detail: string; mag: number }[] }>();
  for (const c of combos) {
    for (const k of c.checks) {
      const e = byCheck.get(k.id) ?? { fail: 0, total: 0, worst: [] };
      e.total++;
      if (!k.pass) { e.fail++; e.worst.push({ combo: `${c.fixture} @ ${c.viewport}`, detail: k.detail, mag: k.magnitude }); }
      byCheck.set(k.id, e);
    }
  }
  console.log("\n════ SUMMARY (" + label + ") ════");
  let totalFail = 0;
  for (const [id, e] of [...byCheck.entries()].sort()) {
    totalFail += e.fail;
    console.log(`${e.fail ? "✗" : "✓"} ${id.padEnd(26)} ${String(e.fail).padStart(3)} failing / ${e.total}`);
    e.worst.sort((a, b) => b.mag - a.mag).slice(0, 3).forEach((w) => console.log(`      worst: ${w.combo} — ${w.detail}`));
  }
  const comboFail = combos.filter((c) => c.checks.some((k) => !k.pass)).length;
  console.log(`\n${comboFail}/${combos.length} fixture x viewport combos failing; ${totalFail} failing checks in total.`);
  fs.writeFileSync(path.join(outDir, `results-${label}.json`), JSON.stringify({ label, when: new Date().toISOString(), combos }, null, 1));
  if (dumpRects) fs.writeFileSync(path.resolve(dumpRects), JSON.stringify(rectDump, null, 1));
  process.exit(totalFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
