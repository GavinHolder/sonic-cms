/**
 * Pixel-level before/after comparison of the REAL public render, across several running servers.
 *
 * The regression question this answers: "did my change alter a single pixel it was not supposed to?" Point it at
 * dev servers running different commits (each with a DATABASE_URL naming a database that contains "fidelity" and the
 * fixtures seeded — `npx tsx tests/responsive-fidelity/seed.ts` — the servers can share one database) and it renders every
 * fixture at every viewport on every server, then diffs the screenshots pair by pair.
 *
 *   npx tsx tests/responsive-fidelity/pixel-compare.ts --label desktop \
 *       --servers base=http://127.0.0.1:3101,deployed=http://127.0.0.1:3102,head=http://127.0.0.1:3100 \
 *       --pairs base:head,deployed:head --viewport laptop,1920x950,1920x1080,1114x765
 *
 * flags: --servers name=url,...   --pairs a:b,...   --viewport <substr,...>   --only <fixture-substr,...>
 *        --threshold N  (max channel delta counted as different; default 0 = exact)
 *        --min-region N (ignore diff regions smaller than N pixels when listing; default 1)
 *        --kinds full,text,bg   which shots to take (default: all three)
 * Up to three shots are taken per fixture x viewport x server:
 *   "full" — the whole page as a visitor sees it;
 *   "bg"   — the same page with every content layer hidden (`[data-fx-content]`, `.section-content-wrapper`, the navbar), i.e.
 *            only the section background / stage plate is painted. Background regressions show up here without text noise;
 *   "text" — the opposite: the background layers are hidden and the section is a flat grey, so only content (text, cards,
 *            images, lower thirds, motion elements) is painted. A change that must not touch content shows up as "same" here
 *            even when it changes the background underneath (anti-aliased glyph edges blend with whatever is behind them, so a
 *            "full" diff cannot separate the two).
 * Optional env FIDELITY_LIVE_URL proxies /uploads etc. to a real site so live-derived fixtures show their real media (see run.ts).
 * Output: a table on stdout + red-overlay diff PNGs in test-artifacts/pixel/<label>/. Exit code 1 if any compared pair differs
 * (unless --report-only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { BASE_URL, FIXTURE_ASSET_ROUTE, VIEWPORTS } from "./config";
import { loadFixtures } from "./fixtures/load";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require("playwright") as typeof import("playwright");
const sharp = require("sharp") as typeof import("sharp");

const argv = process.argv.slice(2);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n: string) => argv.includes(`--${n}`);
const label = opt("label") ?? "pixels";
const servers = Object.fromEntries((opt("servers") ?? `head=${BASE_URL}`).split(",").map((p) => { const [k, ...v] = p.split("="); return [k, v.join("=").replace(/\/$/, "")]; }));
const pairs = (opt("pairs") ?? "").split(",").filter(Boolean).map((p) => p.split(":") as [string, string]);
const onlyVp = opt("viewport")?.split(",").filter(Boolean);
const only = opt("only")?.split(",").filter(Boolean);
const threshold = Number(opt("threshold") ?? 0);
const minRegion = Number(opt("min-region") ?? 1);
const LIVE = (process.env.FIDELITY_LIVE_URL ?? "").replace(/\/$/, "");
const outDir = path.join(here, "test-artifacts", "pixel", label);
fs.mkdirSync(outDir, { recursive: true });
const assetsDir = path.join(here, "fixtures", "assets");

const liveCache = new Map<string, { status: number; headers: Record<string, string>; body: Buffer }>();
const kinds = (opt("kinds") ?? "full,text,bg").split(",").filter(Boolean) as Array<"full" | "text" | "bg">;
const HIDE_BG_CSS = `section.flexible-section { background: #808080 !important; } [data-fx-bg], section.flexible-section > div[aria-hidden="true"] { visibility: hidden !important; }`;
const HIDE_CONTENT_CSS = `[data-fx-content], .section-content-wrapper, nav, header, .navbar { visibility: hidden !important; }`;

async function settle(page: import("playwright").Page) {
  await page.waitForSelector("section.flexible-section", { timeout: 60000, state: "attached" }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // <img> elements finished (CSS background images are covered by the fixed wait below; dev servers keep sockets open, so
  // "networkidle" would just burn its timeout on every page).
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete || i.loading === "lazy"), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

interface Raw { data: Buffer; w: number; h: number }
async function decode(png: Buffer): Promise<Raw> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

interface Region { x: number; y: number; w: number; h: number; px: number }
interface Diff { same: boolean; sizeMismatch: string | null; diffPx: number; total: number; regions: Region[]; overlay: Buffer | null }

/** Exact per-pixel diff; regions = connected components of 16px cells that contain a differing pixel. */
async function diff(a: Raw, b: Raw): Promise<Diff> {
  if (a.w !== b.w || a.h !== b.h) {
    return { same: false, sizeMismatch: `${a.w}x${a.h} vs ${b.w}x${b.h}`, diffPx: -1, total: Math.max(a.w * a.h, b.w * b.h), regions: [], overlay: null };
  }
  const CELL = 16;
  const cw = Math.ceil(a.w / CELL); const ch = Math.ceil(a.h / CELL);
  const cellPx = new Uint32Array(cw * ch);
  let diffPx = 0;
  const out = Buffer.from(a.data); // overlay: dimmed original + red where different
  for (let i = 0, p = 0; i < a.data.length; i += 4, p++) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]), Math.abs(a.data[i + 3] - b.data[i + 3]));
    if (d > threshold) {
      diffPx++;
      const x = p % a.w; const y = (p / a.w) | 0;
      cellPx[((y / CELL) | 0) * cw + ((x / CELL) | 0)]++;
      out[i] = 255; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 255;
    } else {
      out[i] = out[i] >> 1; out[i + 1] = out[i + 1] >> 1; out[i + 2] = out[i + 2] >> 1;
    }
  }
  const seen = new Uint8Array(cw * ch);
  const regions: Region[] = [];
  for (let c = 0; c < cw * ch; c++) {
    if (!cellPx[c] || seen[c]) continue;
    let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, px = 0;
    const stack = [c]; seen[c] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      const cx = k % cw; const cy = (k / cw) | 0;
      px += cellPx[k];
      minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = cx + dx; const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const nk = ny * cw + nx;
        if (cellPx[nk] && !seen[nk]) { seen[nk] = 1; stack.push(nk); }
      }
    }
    regions.push({ x: minX * CELL, y: minY * CELL, w: (maxX - minX + 1) * CELL, h: (maxY - minY + 1) * CELL, px });
  }
  regions.sort((p, q) => q.px - p.px);
  const overlay = diffPx ? await sharp(out, { raw: { width: a.w, height: a.h, channels: 4 } }).png().toBuffer() : null;
  return { same: diffPx === 0, sizeMismatch: null, diffPx, total: a.w * a.h, regions: regions.filter((r) => r.px >= minRegion), overlay };
}

async function main() {
  const fixtures = loadFixtures({ only });
  const viewports = onlyVp ? VIEWPORTS.filter((v) => onlyVp.some((o) => v.name.includes(o))) : VIEWPORTS;
  const browser = await chromium.launch();
  const shots = new Map<string, string>(); // key: server|fixture|viewport|kind -> PNG path (kept on disk, not in memory)
  const key = (s: string, f: string, v: string, k: string) => `${s}|${f}|${v}|${k}`;

  for (const vp of viewports) {
    const mobileLike = /phone|tablet/.test(vp.name);
    await Promise.all(Object.entries(servers).map(async ([sname, base]) => {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: mobileLike, hasTouch: mobileLike, deviceScaleFactor: 1, reducedMotion: "reduce" });
      await ctx.route(`**${FIXTURE_ASSET_ROUTE}*`, (route) => {
        const file = path.join(assetsDir, path.basename(new URL(route.request().url()).pathname));
        return fs.existsSync(file) ? route.fulfill({ path: file, contentType: "image/svg+xml" }) : route.fulfill({ status: 404 });
      });
      if (LIVE) {
        // Live media/API data is fetched ONCE per URL and replayed to every server, so all servers see byte-identical
        // inputs (and the real site is not hit once per screenshot).
        await ctx.route(/\/(uploads|images\/uploads|api\/public\/volt|api\/packages|api\/templates)\b/, async (route) => {
          const req = route.request();
          const u = new URL(req.url());
          if (req.method() !== "GET") return route.continue();
          const target = u.origin === new URL(base).origin ? LIVE + u.pathname + u.search : req.url();
          try {
            let hit = liveCache.get(target);
            if (!hit) {
              const res = await route.fetch({ url: target });
              hit = { status: res.status(), headers: res.headers(), body: await res.body() };
              liveCache.set(target, hit);
            }
            return await route.fulfill({ status: hit.status, headers: hit.headers, body: hit.body });
          } catch { return route.continue(); }
        });
      }
      for (const fx of fixtures) {
        const page = await ctx.newPage();
        try {
          await page.goto(`${base}/fx-${fx.name}`, { waitUntil: "load", timeout: 120000 });
          await settle(page);
          const save = async (kind: string) => {
            const file = path.join(outDir, `${sname}__${fx.name}__${vp.name}__${kind}.png`);
            fs.writeFileSync(file, await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" }));
            shots.set(key(sname, fx.name, vp.name, kind), file);
          };
          if (kinds.includes("full")) await save("full");
          for (const [kind, css] of [["text", HIDE_BG_CSS], ["bg", HIDE_CONTENT_CSS]] as const) {
            if (!kinds.includes(kind)) continue;
            const style = await page.addStyleTag({ content: css });
            await page.waitForTimeout(150);
            await save(kind);
            await style.evaluate((el) => (el as Element).remove());
          }
        } catch (e) {
          console.warn(`capture failed ${sname} ${fx.name} ${vp.name}: ${String((e as Error).message).slice(0, 120)}`);
        }
        await page.close();
      }
      await ctx.close();
    }));
    console.log(`captured ${vp.name}`);
  }
  await browser.close();

  let differing = 0; let compared = 0;
  const rows: string[] = [];
  const summary: Record<string, unknown>[] = [];
  for (const [A, B] of pairs) {
    for (const vp of viewports) {
      for (const fx of fixtures) {
        for (const kind of kinds) {
          const a = shots.get(key(A, fx.name, vp.name, kind)); const b = shots.get(key(B, fx.name, vp.name, kind));
          if (!a || !b) { rows.push(`MISSING ${A}:${B} ${fx.name} ${vp.name} ${kind}`); differing++; continue; }
          const d = await diff(await decode(fs.readFileSync(a)), await decode(fs.readFileSync(b)));
          compared++;
          if (!d.same) differing++;
          const regionTxt = d.regions.slice(0, 4).map((r) => `[${r.x},${r.y} ${r.w}x${r.h} ~${r.px}px]`).join(" ");
          rows.push(`${d.same ? "same " : "DIFF "} ${`${A}:${B}`.padEnd(16)} ${fx.name.padEnd(30)} ${vp.name.padEnd(26)} ${kind.padEnd(4)} ${d.sizeMismatch ? "size " + d.sizeMismatch : d.same ? "" : `${d.diffPx}px (${((100 * d.diffPx) / d.total).toFixed(2)}%) in ${d.regions.length} region(s) ${regionTxt}`}`);
          summary.push({ pair: `${A}:${B}`, fixture: fx.name, viewport: vp.name, kind, same: d.same, diffPx: d.diffPx, sizeMismatch: d.sizeMismatch, regions: d.regions.slice(0, 12) });
          if (!d.same && d.overlay) fs.writeFileSync(path.join(outDir, `${A}-vs-${B}__${fx.name}__${vp.name}__${kind}.png`), d.overlay);
        }
      }
    }
  }
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 1));
  console.log(rows.join("\n"));
  console.log(`\n${compared} comparisons, ${differing} differing (threshold ${threshold}). Screenshots + red-overlay diffs: ${outDir}`);
  process.exit(differing && !flag("report-only") ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
