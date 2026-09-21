/**
 * Plugin template variables for coverage-plugin Packages.
 *
 * A card (or Volt slot) can be bound to a Package; its text fields may contain
 * tokens like {{pkg.name}} {{pkg.price}} {{pkg.speed}} which are replaced with the
 * package's live values at render. Keep this list in sync with the designer's
 * "available tokens" hint.
 */
import { parsePackageFeatures, featureEntryText } from "./features";

export interface PackageLike {
  id: string;
  name: string;
  speedDown?: string | null;
  speedUp?: string | null;
  price: string;
  period?: string | null;
  features?: unknown;
  popular?: boolean;
  networkName?: string | null;
}

/** The tokens shown to authors (without the surrounding {{ }}). */
export const PACKAGE_TOKENS = [
  "pkg.name",
  "pkg.price",
  "pkg.period",
  "pkg.speedDown",
  "pkg.speedUp",
  "pkg.speed",      // "100 / 100 Mbps" style (down / up)
  "pkg.features",   // comma-joined
  "pkg.network",
] as const;

// A feature entry may be a legacy plain string or an admin-managed {badge, value}
// object (see FeatureBadgeType, lib/packages/features.ts) — flatten to display text
// so a badge entry never prints as "[object Object]" in this text-only token.
function featuresToArray(f: unknown): string[] {
  return parsePackageFeatures(f).map(featureEntryText);
}

/** Build the {token: value} map for a package. */
export function packageTokenValues(pkg: PackageLike): Record<string, string> {
  const down = pkg.speedDown ?? "";
  const up = pkg.speedUp ?? "";
  const speed = [down, up].filter(Boolean).join(" / ");
  return {
    "pkg.name": pkg.name ?? "",
    "pkg.price": pkg.price ?? "",
    "pkg.period": pkg.period ?? "",
    "pkg.speedDown": down,
    "pkg.speedUp": up,
    "pkg.speed": speed,
    "pkg.features": featuresToArray(pkg.features).join(", "),
    "pkg.network": pkg.networkName ?? "",
  };
}

/**
 * Replace {{pkg.*}} tokens in a string with the bound package's values.
 * Returns the input unchanged when there's no package or no tokens.
 */
export function resolvePackageTokens(text: string, pkg: PackageLike | null | undefined): string {
  if (!text || typeof text !== "string" || text.indexOf("{{") === -1) return text;
  if (!pkg) return text;
  const values = packageTokenValues(pkg);
  return text.replace(/\{\{\s*(pkg\.[a-zA-Z]+)\s*\}\}/g, (_m, key: string) =>
    key in values ? values[key] : _m
  );
}
