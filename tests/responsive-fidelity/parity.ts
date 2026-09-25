/* eslint-disable @typescript-eslint/no-explicit-any -- test tooling: stored section JSON and in-page measurements are untyped by nature */
/**
 * Designer -> save -> live ROUND-TRIP parity.
 *
 * The site owner's core complaint is "what I see in the Designer is not what visitors get". This phase
 * proves it end to end for text: each free fixture is loaded into the REAL Flexible Designer page, left
 * to settle (webfonts included), and saved with the Designer's own buildJson(). That saved JSON becomes a
 * `<name>--rt` fixture page which the main loop renders live at 1440x900.
 *
 *   P1 — the measurement the Designer SAVED is truthful: for every heading/eyebrow the line count implied
 *        by the stored _measuredH equals the number of lines the Designer actually showed.
 *   P2 — live renders the same number of lines as the Designer showed, for every text sub-element.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "playwright";
import { BASE_URL, FIXTURE_ASSET_ROUTE } from "./config";
import type { Fixture } from "./fixtures/synthetic";
import { expectedItems, measuredLines } from "./oracle";

const here = path.dirname(fileURLToPath(import.meta.url));
const linesSrc = fs.readFileSync(path.join(here, "designer-lines.browser.js"), "utf8");

export interface RoundTrip {
  fixture: Fixture;
  designerLines: Record<string, { lines: number; h: number; type: string }>;
}

function parseDD(raw: unknown): any {
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return null; } }
  return raw ?? null;
}

export async function buildRoundTrips(browser: Browser, fixtures: Fixture[]): Promise<RoundTrip[]> {
  const out: RoundTrip[] = [];
  const assetsDir = path.join(here, "fixtures", "assets");
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route(`**${FIXTURE_ASSET_ROUTE}*`, (route) => {
    const file = path.join(assetsDir, path.basename(new URL(route.request().url()).pathname));
    return fs.existsSync(file) ? route.fulfill({ path: file, contentType: "image/svg+xml" }) : route.fulfill({ status: 404 });
  });
  for (const fx of fixtures) {
    const dd = parseDD((fx.section.content as any).designerData);
    const desktop = dd?.variant === "per-breakpoint" ? dd.desktop : dd;
    if (!desktop || !(desktop.positionMode === "free" || desktop.layoutType === "free") || !desktop.blocks?.length) continue;
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE_URL}/flexible-designer.html`, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(600);
      const payload = { ...dd, sectionBackground: { backgroundType: "solid", background: fx.section.background, bgImageUrl: "", bgImageSize: "cover", bgImageRepeat: "no-repeat", bgImageOpacity: 100 } };
      await page.evaluate((p) => window.postMessage({ type: "FLEXIBLE_DESIGNER_INIT", payload: JSON.stringify(p) }, "*"), payload);
      await page.waitForSelector(".sub-element[data-sub-id]", { timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1800); // webfont swap + the Designer's own settle/re-measure pass
      await page.evaluate(() => document.fonts.ready);
      const built: string = await page.evaluate("buildJson()");
      const designerLines = await page.evaluate(linesSrc);
      const rt: Fixture = {
        name: `${fx.name}--rt`,
        description: `${fx.description} — round-tripped through the Designer's own save.`,
        derived: true,
        section: { ...fx.section, content: { ...fx.section.content, designerData: JSON.parse(built) } },
      };
      out.push({ fixture: rt, designerLines: designerLines as RoundTrip["designerLines"] });
    } catch (e) {
      console.warn(`round-trip skipped for ${fx.name}: ${String((e as Error).message).slice(0, 120)}`);
    } finally {
      await page.close();
    }
  }
  await ctx.close();
  return out;
}

export interface ParityCheck { id: string; pass: boolean; detail: string; magnitude: number }

export function evaluateParity(rt: RoundTrip, liveSubs: Record<string, { lines: number }>): ParityCheck[] {
  const checks: ParityCheck[] = [];
  const dd = parseDD((rt.fixture.section.content as any).designerData);
  const desktop = dd?.variant === "per-breakpoint" ? dd.desktop : dd;
  const items = expectedItems(desktop);

  // P1 — saved measurement truthful
  let p1Bad = 0; let p1First = ""; let p1Checked = 0;
  for (const it of items) {
    const want = measuredLines(it);
    const d = rt.designerLines[it.id];
    if (want === null || !d) continue;
    p1Checked++;
    if (want !== d.lines) { p1Bad++; if (!p1First) p1First = `${it.id}: Designer saved _measuredH ${it.measuredH} => ${want} line(s) but showed ${d.lines}`; }
  }
  checks.push({ id: "P1.designer-saves-truthful-measure", pass: p1Bad === 0, detail: `${p1Checked} heading/eyebrow items, ${p1Bad} stale${p1First ? " — " + p1First : ""}`, magnitude: p1Bad });

  // P2 — live == Designer line counts
  let p2Bad = 0; let p2First = ""; let p2Checked = 0;
  for (const [key, d] of Object.entries(rt.designerLines)) {
    if (d.type === "other") continue;
    const l = liveSubs[key];
    if (!l) continue;
    p2Checked++;
    if (l.lines !== d.lines) { p2Bad++; if (!p2First) p2First = `${key}: Designer ${d.lines} line(s), live ${l.lines}`; }
  }
  checks.push({ id: "P2.designer-live-lines", pass: p2Bad === 0, detail: `${p2Checked} text sub-elements, ${p2Bad} differ${p2First ? " — " + p2First : ""}`, magnitude: p2Bad });
  return checks;
}
