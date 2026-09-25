import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { syntheticFixtures, type Fixture } from "./synthetic";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BP = require(path.join(repoRoot, "public", "flexible-breakpoint-rules.js"));

function parseDD(raw: unknown): any {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw ?? null;
}

/**
 * The live sites this project is used on rarely have a fully-authored Mobile canvas yet, so a
 * per-breakpoint live fixture whose Mobile variant has <= 1 block also yields a DERIVED fixture
 * whose Mobile is the Tablet layout re-laid out to 375 wide (positions + sizes + font sizes scaled).
 * Test data only — it is never written back to any site, and never used by the Designer.
 */
function deriveMobileAuthored(base: Fixture): Fixture | null {
  const dd = parseDD(base.section.content.designerData);
  if (!dd || dd.variant !== "per-breakpoint" || !dd.tablet?.blocks?.length) return null;
  const mobileBlocks = dd.mobile?.blocks?.length ?? 0;
  if (mobileBlocks > 1) return null;
  const tw = Number(dd.tablet.designerCanvasW) || 768;
  const th = Number(dd.tablet.designerCanvasH) || 900;
  const mw = 375;
  const r = mw / tw;
  const scaled = (dd.tablet.blocks as any[]).map((b) => {
    const nb = BP.scaleBlockToCanvas(b, { w: tw }, { w: mw, h: Math.round(th * r) + 400 });
    for (const se of nb.subElements ?? []) {
      delete se._measuredH;
      delete se._measuredW;
      if (se.props && Number(se.props.fontSize) > 0) se.props.fontSize = Math.max(11, Math.round(Number(se.props.fontSize) * r));
    }
    return nb;
  });
  const derivedDD = JSON.parse(JSON.stringify(dd));
  derivedDD.mobile = { ...dd.tablet, designerCanvasW: mw, designerCanvasH: 900, blocks: scaled };
  const content = { ...base.section.content, designerData: derivedDD };
  const bgByBp = (content as any).backgroundByBreakpoint;
  if (bgByBp && !bgByBp.mobile && bgByBp.tablet) (content as any).backgroundByBreakpoint = { ...bgByBp, mobile: bgByBp.tablet };
  return {
    name: `${base.name}-mobile-authored`,
    description: `${base.description} — Mobile replaced by the Tablet layout re-laid out to 375 wide (test-only).`,
    derived: true,
    section: { ...base.section, content },
  };
}

export function loadFixtures(opts: { only?: string[] } = {}): Fixture[] {
  const all: Fixture[] = [...syntheticFixtures()];
  const liveDir = path.join(here, "live");
  if (fs.existsSync(liveDir)) {
    for (const f of fs.readdirSync(liveDir).filter((x) => x.endsWith(".json")).sort()) {
      const fx = JSON.parse(fs.readFileSync(path.join(liveDir, f), "utf8")) as Fixture;
      all.push(fx);
      const derived = deriveMobileAuthored(fx);
      if (derived) all.push(derived);
    }
  }
  if (opts.only?.length) return all.filter((f) => opts.only!.some((o) => f.name.includes(o)));
  return all;
}
