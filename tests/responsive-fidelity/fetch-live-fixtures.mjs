/**
 * Copies real sections from a running site into tests/responsive-fidelity/fixtures/live/
 * (git-ignored — they contain a real site's content) so the harness can regression-test
 * against genuine authored layouts in addition to the committed synthetic fixtures.
 *
 *   FIDELITY_LIVE_URL=https://your-site.example node tests/responsive-fidelity/fetch-live-fixtures.mjs
 *
 * Uses the site's PUBLIC `GET /api/sections` (all published sections; no auth).
 * Only FLEXIBLE sections are copied. Optional: FIDELITY_LIVE_IDS=comma,separated,id-prefixes
 * restricts which ones.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const origin = (process.env.FIDELITY_LIVE_URL || "").replace(/\/$/, "");
if (!origin) {
  console.error("Set FIDELITY_LIVE_URL to the origin of the site to copy sections from.");
  process.exit(1);
}
const only = (process.env.FIDELITY_LIVE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "fixtures", "live");
fs.mkdirSync(outDir, { recursive: true });

const res = await fetch(`${origin}/api/sections`);
if (!res.ok) {
  console.error(`GET ${origin}/api/sections -> HTTP ${res.status}`);
  process.exit(1);
}
const json = await res.json();
const sections = (json.data ?? json.sections ?? json).filter((s) => s.type === "FLEXIBLE");
let n = 0;
for (const s of sections) {
  if (only.length && !only.some((p) => s.id.startsWith(p))) continue;
  const slug = String(s.displayName || s.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || s.id.slice(0, 8);
  const fixture = {
    name: `live-${slug}`,
    description: `Copied from ${origin} (section ${s.id.slice(0, 8)})`,
    section: s,
  };
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(fixture, null, 2));
  n++;
  console.log("wrote", `fixtures/live/${slug}.json`);
}
console.log(`${n} live fixture(s) written to ${outDir}`);
