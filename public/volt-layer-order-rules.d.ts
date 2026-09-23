/**
 * Hand-written type declarations for volt-layer-order-rules.js (same
 * mechanism as volt-glass-rules.d.ts: TypeScript pairs a `.d.ts` with the
 * same-named `.js` in the same directory, so `import { sortLayersByZ } from
 * "../../public/volt-layer-order-rules.js"` type-checks without checkJs).
 * The JS is also loaded standalone as a <script> tag by
 * public/volt-designer.html (window.VoltLayerOrderRules).
 */
import type { VoltLayer } from "../types/volt";

/** Ascending-zIndex paint order (lowest first / furthest back). Pure — returns a new array. */
export declare function sortLayersByZ(layers: VoltLayer[]): VoltLayer[];
