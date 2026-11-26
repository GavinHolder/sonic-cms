import type { AnimBgConfig } from "@/lib/anim-bg/types";

/**
 * The animated-background config a hero slide should mount RIGHT NOW, or null.
 *
 * Null (= render nothing extra, the slide's markup is exactly what it was before
 * this feature existed) unless ALL of:
 *   - the slide is the active one (only one slide animates at a time),
 *   - it carries an `animBg` that is enabled,
 *   - at least one of its layers is enabled.
 * The returned object is the slide's own config, by reference — the shared
 * AnimBgRenderer re-mounts on config identity, so no copy is made here.
 */
export function resolveSlideAnimBg(
  slide: { animBg?: AnimBgConfig | null } | null | undefined,
  isActive: boolean
): AnimBgConfig | null {
  if (!isActive) return null;
  const cfg = slide?.animBg;
  if (!cfg || cfg.enabled !== true) return null;
  if (!Array.isArray(cfg.layers) || !cfg.layers.some((l) => l?.enabled)) return null;
  return cfg;
}
