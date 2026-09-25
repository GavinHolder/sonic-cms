/**
 * Before/after regression diff of element geometry.
 *
 *   node tests/responsive-fidelity/diff-rects.mjs <before.json> <after.json> [--viewports laptop-1440x900,desktop-1920x1080] [--include live-]
 *
 * Both files are produced by `run.ts --dump-rects <file>`. For every fixture x viewport present in BOTH it compares
 * the section rect, the stage rect, the content-plate rect + scale, and every block / sub-element rect, and reports
 * the worst deviation in px. Exit code 1 if anything moved by more than --tol px (default 1).
 */
import fs from "node:fs";

const [, , beforeFile, afterFile, ...rest] = process.argv;
if (!beforeFile || !afterFile) {
  console.error("usage: diff-rects.mjs <before.json> <after.json> [--viewports a,b] [--include prefix] [--tol px]");
  process.exit(2);
}
const opt = (n, d) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d; };
const viewports = opt("viewports", "laptop-1440x900,desktop-1920x1080").split(",");
const include = opt("include", "");
const tol = Number(opt("tol", "1"));

const before = JSON.parse(fs.readFileSync(beforeFile, "utf8"));
const after = JSON.parse(fs.readFileSync(afterFile, "utf8"));

// Both absent (e.g. a background-only section has no plate/stage) means "unchanged"; one absent means moved.
const rectDev = (a, b) => (!a && !b ? 0 : !a || !b ? Infinity : Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h)));
// Position/width only: a text wrapper whose HEIGHT changed (a line no longer wraps) did not "move".
const posDev = (a, b) => (!a && !b ? 0 : !a || !b ? Infinity : Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w)));

let compared = 0;
let moved = 0;
let worstAll = 0;
for (const key of Object.keys(before).sort()) {
  const [fixture, vp] = key.split("@");
  if (!viewports.includes(vp) || (include && !fixture.startsWith(include)) || fixture.endsWith("--rt")) continue;
  const b = before[key];
  const a = after[key];
  if (!a) { console.log(`MISSING in after: ${key}`); moved++; continue; }
  let worst = 0; let worstWhat = "";
  const consider = (what, d) => { if (d > worst) { worst = d; worstWhat = what; } };
  consider("section", rectDev(b.section, a.section));
  consider("stage", rectDev(b.stage, a.stage));
  consider("content plate", rectDev(b.content?.rect, a.content?.rect));
  consider("content scale x100", Math.abs((b.content?.matrix?.a ?? 1) - (a.content?.matrix?.a ?? 1)) * 100);
  let worstPos = 0; const heightOnly = [];
  for (const [id, r] of Object.entries(b.subs)) {
    consider(`sub ${id}`, rectDev(r, a.subs[id]));
    worstPos = Math.max(worstPos, posDev(r, a.subs[id]));
    if (a.subs[id] && posDev(r, a.subs[id]) <= tol && Math.abs(r.h - a.subs[id].h) > tol) heightOnly.push(`${id} h ${r.h}->${a.subs[id].h}`);
  }
  for (const [id, r] of Object.entries(b.blocks)) {
    consider(`block ${id}`, rectDev(r, a.blocks[id]));
    worstPos = Math.max(worstPos, posDev(r, a.blocks[id]));
  }
  compared++;
  worstAll = Math.max(worstAll, worst);
  const bad = worst > tol;
  if (bad) moved++;
  console.log(`${bad ? "MOVED" : "same "}  ${fixture.padEnd(34)} ${vp.padEnd(20)} worst ${worst.toFixed(2)}px${worst > 0 ? ` (${worstWhat})` : ""}  | worst x/y/width shift ${worstPos.toFixed(2)}px${heightOnly.length ? " | height-only: " + heightOnly.join(", ") : ""}`);
}
console.log(`\n${compared} fixture x viewport comparisons, ${moved} moved by > ${tol}px, worst overall ${worstAll.toFixed(2)}px`);
process.exit(moved ? 1 : 0);
