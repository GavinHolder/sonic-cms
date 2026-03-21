"use client";

import dynamic from "next/dynamic";

/**
 * Maintenance mode page router.
 *
 * Reads `theme.template` and renders the matching template component.
 * Falls back to "plain" if not set — safe default for any industry.
 *
 * Templates:
 *   plain        — generic "We'll Be Right Back" (dark, neutral)
 *   construction — animated CSS concrete mixer truck (Pantone 2290 C palette)
 *   custom       — full-screen user image with dark overlay
 */

export type MaintenanceTemplate = "plain" | "construction" | "custom";

export interface MaintenanceTheme {
  logoUrl?: string;
  companyName?: string;
  template?: MaintenanceTemplate;
  colorScheme?: "light" | "dark";
  /** Full URL to background image (custom template only) */
  customImage?: string;
  /** Pantone 2290 C default: #78BE20 — construction template */
  primaryColor?: string;
  /** Pantone Cool Gray 11 C default: #53565A — construction template */
  darkColor?: string;
  /** Pantone Cool Gray 4 C default: #BBBCBC — construction template */
  lightColor?: string;
}

const PlainPage        = dynamic(() => import("@/components/maintenance/PlainMaintenancePage"));
const ConstructionPage = dynamic(() => import("@/components/maintenance/ConstructionMaintenancePage"));
const CustomPage       = dynamic(() => import("@/components/maintenance/CustomMaintenancePage"));

export default function MaintenancePage({ theme = {} }: { theme?: MaintenanceTheme }) {
  switch (theme.template) {
    case "construction":
      return <ConstructionPage theme={theme} />;
    case "custom":
      return <CustomPage theme={theme} />;
    default:
      return <PlainPage theme={theme} />;
  }
}
