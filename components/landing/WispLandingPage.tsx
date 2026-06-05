"use client";

import { useEffect, useState } from "react";
import type { CoverageMapData } from "@/components/coverage/CoverageMapViewer";
import WispHero from "./WispHero";
import WispFibreSection from "./WispFibreSection";
import WispWirelessSection from "./WispWirelessSection";
import WispBusinessSection from "./WispBusinessSection";
import WispHardwareSection from "./WispHardwareSection";
import WispWhyUsSection from "./WispWhyUsSection";
import WispCtaSection from "./WispCtaSection";

// Slug of the coverage map to use for both fibre and wireless sections.
// A single map can have both FIBRE and WIRELESS regions; the check endpoint
// differentiates by regionType. Update this slug to match your DB record.
const COVERAGE_MAP_SLUG = "main";

export default function WispLandingPage() {
  const [mapData, setMapData] = useState<CoverageMapData | null>(null);

  useEffect(() => {
    fetch("/api/coverage-maps/public")
      .then((r) => r.json())
      .then((maps: CoverageMapData[]) => {
        const found = maps.find((m) => m.slug === COVERAGE_MAP_SLUG) ?? maps[0] ?? null;
        setMapData(found);
      })
      .catch(() => setMapData(null));
  }, []);

  return (
    <div id="snap-container">
      <WispHero />
      <WispFibreSection mapData={mapData} />
      <WispWirelessSection mapData={mapData} />
      <WispBusinessSection />
      <WispHardwareSection />
      <WispWhyUsSection />
      <WispCtaSection />
    </div>
  );
}
