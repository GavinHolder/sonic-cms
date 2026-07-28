/**
 * Shared display formatting for coverage-plugin Packages.
 *
 * These helpers turn a Package's nullable, structured fields into the strings
 * shown on cards / Volt slots. They mirror the display logic already used by
 * PackagesBlock and lib/packages/tokens.ts so a data-bound Volt card reads the
 * same as the live Packages grid.
 *
 * All helpers are null-safe: missing fields collapse to empty strings, never
 * "null"/"undefined", so injecting a sparse product never prints junk.
 */
import type { PackageLike } from "./tokens";

export type { PackageLike };

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function featuresToArray(f: unknown): string[] {
  if (Array.isArray(f)) return f.map((x) => str(x)).filter(Boolean);
  if (typeof f === "string") {
    try {
      const a = JSON.parse(f);
      return Array.isArray(a) ? a.map((x) => str(x)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** "100 / 100 Mbps"-style down/up label. Empty when neither speed is set. */
export function formatSpeed(pkg: PackageLike): string {
  return [str(pkg.speedDown), str(pkg.speedUp)].filter(Boolean).join(" / ");
}

/**
 * Price + period as one display string, e.g. "R699/month".
 * Period joins directly when it starts with "/" (e.g. "/month"), otherwise with
 * a space. Empty when no price is set.
 */
export function formatPrice(pkg: PackageLike): string {
  const price = str(pkg.price);
  if (!price) return "";
  const period = str(pkg.period);
  if (!period) return price;
  return period.startsWith("/") ? `${price}${period}` : `${price} ${period}`;
}

/** Package options (features) joined for a single slot. */
export function formatOptions(pkg: PackageLike, separator = ", "): string {
  return featuresToArray(pkg.features).join(separator);
}

/**
 * Build the slot-value map for a data-bound Volt card. Keys are exposed both
 * bare (`name`, `price`, `speed`…) and `pkg.`-prefixed (`pkg.name`…) so a slot's
 * contentFieldHint matches whichever convention the author used. None of these
 * keys collide with the base slots (title/body/imageUrl/actionLabel/badge/icon),
 * so manual slot text keeps working when a field isn't bound to the product.
 */
export function packageSlotValues(pkg: PackageLike): Record<string, string> {
  const base: Record<string, string> = {
    name: str(pkg.name),
    price: formatPrice(pkg),
    priceRaw: str(pkg.price),
    period: str(pkg.period),
    speed: formatSpeed(pkg),
    speedDown: str(pkg.speedDown),
    speedUp: str(pkg.speedUp),
    options: formatOptions(pkg),
    features: formatOptions(pkg),
    network: str(pkg.networkName),
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = v;
    out[`pkg.${k}`] = v;
  }
  return out;
}
