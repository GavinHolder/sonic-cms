"use client";

import { useState, useEffect } from "react";
import DynamicSection from "@/components/sections/DynamicSection";
import SectionNavButtons from "@/components/ui/SectionNavButtons";
import type { SectionConfig } from "@/types/section";
import { getSections } from "@/lib/section-manager";
/**
 * Homepage
 *
 * Renders all enabled sections from the section system.
 * Sections are loaded from the database API and rendered
 * using the DynamicSection component.
 *
 * Scroll snapping is handled purely by CSS (scroll-snap-type: y mandatory on html).
 * This matches the prototype branch behavior exactly.
 */

export default function HomepageClient() {
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Load sections from database API
  useEffect(() => {
    async function loadSections() {
      try {
        const loadedSections = await getSections("/");
        setSections(loadedSections);
      } catch (error) {
        console.error("Failed to load sections:", error);
        setSections([]);
      } finally {
        setLoading(false);
      }
    }
    loadSections();
  }, []);

  // Filter enabled sections and sort by order
  const enabledSections = sections
    .filter((section) => section.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading page content...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no sections exist
  if (enabledSections.length === 0) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}
      >
        <div className="text-center px-4">
          <i className="bi bi-layers" style={{ fontSize: "4rem", color: "#6c757d" }}></i>
          <h2 className="mt-4 mb-3" style={{ color: "#495057" }}>
            No Content Yet
          </h2>
          <p className="text-muted mb-4">
            This page has no sections configured. Visit the{" "}
            <a href="/admin/content/landing-page" className="text-primary">
              admin panel
            </a>{" "}
            to add sections to your landing page.
          </p>
        </div>
      </div>
    );
  }

  // Find the index of the first section after the hero
  const heroIndex = enabledSections.findIndex(
    (s) => s.type === "HERO" || (s.type as string) === "hero" || (s.type as string) === "hero-carousel"
  );

  return (
    <>
      {enabledSections.map((section, index) => (
        <DynamicSection
          key={section.id}
          section={section}
          isFirstAfterHero={heroIndex >= 0 && index === heroIndex + 1}
        />
      ))}
      <SectionNavButtons />
    </>
  );
}
