/* eslint-disable @typescript-eslint/no-explicit-any -- test tooling */
/**
 * Pixel diff of two screenshot directories produced by `run.ts shots` (same file names). Exact by default: a pixel differs
 * when ANY channel differs by more than --threshold (default 0).
 *
 *   npx tsx tests/hero-mobile/diff.ts <baseDir> <headDir> [--kind overlay|full] [--match 1440x900,1920x1080] [--out <diffDir>] [--threshold N]
 *
 * Prints one line per shot: identical, or the number of differing pixels + bounding box. Writes a red-overlay PNG per differing
 * shot into --out. Exit code 1 if any compared shot differs.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp");

const argv = process.argv.slice(2);
const [baseDir, headDir] = argv;
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const kind = opt("kind") ?? "overlay";
const match = opt("match")?.split(",").filter(Boolean);
const outDir = opt("out");
const threshold = Number(opt("threshold") ?? 0);
if (!baseDir || !headDir) { console.error("usage: diff.ts <baseDir> <headDir> [--kind overlay|full] [--match a,b] [--out dir] [--threshold N]"); process.exit(2); }
if (outDir) fs.mkdirSync(outDir, { recursive: true });

async function raw(file: string) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

(async () => {
  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(`_${kind}.png`) && (!match || match.some((m) => f.startsWith(m)))).sort();
  let differing = 0;
  for (const f of files) {
    const b = path.join(baseDir, f), h = path.join(headDir, f);
    if (!fs.existsSync(h)) { console.log(`MISSING ${f}`); differing++; continue; }
    const A = await raw(b), B = await raw(h);
    if (A.w !== B.w || A.h !== B.h) { console.log(`SIZE    ${f}  ${A.w}x${A.h} vs ${B.w}x${B.h}`); differing++; continue; }
    let n = 0, minX = A.w, minY = A.h, maxX = -1, maxY = -1;
    const red = Buffer.from(B.data);
    for (let i = 0; i < A.w * A.h; i++) {
      const o = i * 3;
      if (Math.abs(A.data[o] - B.data[o]) > threshold || Math.abs(A.data[o + 1] - B.data[o + 1]) > threshold || Math.abs(A.data[o + 2] - B.data[o + 2]) > threshold) {
        n++; const x = i % A.w, y = (i / A.w) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        red[o] = 255; red[o + 1] = 0; red[o + 2] = 0;
      }
    }
    if (n === 0) console.log(`same    ${f}  (${A.w}x${A.h}, 0 px differ)`);
    else {
      differing++;
      console.log(`DIFF    ${f}  ${n} px differ, bbox x ${minX}-${maxX} y ${minY}-${maxY}`);
      if (outDir) await sharp(red, { raw: { width: A.w, height: A.h, channels: 3 } }).png().toFile(path.join(outDir, f.replace(".png", ".diff.png")));
    }
  }
  console.log(`\n${files.length - differing}/${files.length} identical (${kind}, threshold ${threshold})`);
  process.exit(differing ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
