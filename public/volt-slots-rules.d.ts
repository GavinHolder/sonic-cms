/**
 * Hand-written type declarations for volt-slots-rules.js (same mechanism as
 * flexible-render-rules.d.ts / volt-glass-rules.d.ts: TypeScript pairs a
 * `.d.ts` with the same-named `.js` in the same directory, so
 * `import { VOLT_SLOT_KEYS } from "@/public/volt-slots-rules.js"` type-checks
 * without checkJs). The JS is also loaded standalone as a <script> tag by
 * public/flexible-designer.html (window.VoltSlotsRules).
 */

/**
 * The 8 VoltSlots keys (types/volt.ts's `VoltSlots` interface), in
 * declaration order. Kept as plain `string[]` (not `(keyof VoltSlots)[]`)
 * since this module has zero dependency on types/volt.ts — it's also
 * loaded standalone as a <script> tag with no TypeScript types at all.
 */
export declare const VOLT_SLOT_KEYS: readonly string[];

/** slotKey ("actionHref") → its flat block-prop name ("slotActionHref"). */
export declare function slotPropKey(slotKey: string): string;
