/**
 * Section Manager - PostgreSQL API-based Section Data Store
 *
 * Manages sections with PostgreSQL persistence via API endpoints.
 * Section Types: HERO (first), FOOTER (last), CTA (movable), NORMAL (movable)
 *
 * HARD RULES:
 * - Hero sections always have order=0 (first)
 * - Footer sections always have order=999999 (last)
 * - CTA and NORMAL sections are movable between hero and footer
 * - Only ONE hero and ONE footer allowed per page
 */

import type { SectionConfig, SectionType } from "@/types/section";
import { fetchWithRefresh } from "@/lib/fetch-with-refresh";

/**
 * Get all sections for a page from database API
 */
export async function getSections(pageSlug: string = "/"): Promise<SectionConfig[]> {
  try {
    const response = await fetch(`/api/sections?pageSlug=${encodeURIComponent(pageSlug)}`);

    if (!response.ok) {
      console.error('Failed to fetch sections:', response.statusText);
      return [];
    }

    const result = await response.json();

    if (!result.success) {
      console.error('API error fetching sections:', result.error);
      return [];
    }

    return result.data || [];
  } catch (error) {
    console.error("Error loading sections from API:", error);
    return [];
  }
}

/**
 * Save/create a new section
 */
export async function createSection(
  pageSlug: string,
  type: SectionType,
  data: Partial<SectionConfig>
): Promise<SectionConfig | null> {
  try {
    const response = await fetchWithRefresh('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageSlug,
        type,
        ...data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to create section:', response.statusText);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      console.error('API error creating section:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error("Error creating section:", error);
    return null;
  }
}

/**
 * Update a section
 */
export async function updateSection(
  sectionId: string,
  updates: Partial<SectionConfig>
): Promise<boolean> {
  try {
    const response = await fetchWithRefresh(`/api/sections/${sectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      console.error('Failed to update section:', response.statusText);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error updating section:", error);
    return false;
  }
}

/**
 * Delete a section
 */
export async function deleteSection(sectionId: string): Promise<boolean> {
  try {
    const response = await fetchWithRefresh(`/api/sections/${sectionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.error('Failed to delete section:', response.statusText);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error deleting section:", error);
    return false;
  }
}

/**
 * Toggle section enabled state
 */
export async function toggleSectionEnabled(
  sectionId: string,
  currentEnabled: boolean
): Promise<boolean> {
  return await updateSection(sectionId, { enabled: !currentEnabled });
}

/**
 * Move section up (decrease order)
 */
export async function moveSectionUp(
  pageSlug: string,
  sectionId: string
): Promise<boolean> {
  try {
    const sections = await getSections(pageSlug);
    const section = sections.find((s) => s.id === sectionId);

    // Cannot move hero or footer
    if (!section || section.type === "HERO" || section.type === "FOOTER") {
      return false;
    }

    const sorted = sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const index = sorted.findIndex((s) => s.id === sectionId);

    if (index <= 0) return false;

    // Don't move past hero
    if (sorted[index - 1].type === "HERO") return false;

    // Swap orders
    const temp = sorted[index].order;
    await updateSection(sorted[index].id, { order: sorted[index - 1].order });
    await updateSection(sorted[index - 1].id, { order: temp });

    return true;
  } catch (error) {
    console.error("Error moving section up:", error);
    return false;
  }
}

/**
 * Move section down (increase order)
 */
export async function moveSectionDown(
  pageSlug: string,
  sectionId: string
): Promise<boolean> {
  try {
    const sections = await getSections(pageSlug);
    const section = sections.find((s) => s.id === sectionId);

    // Cannot move hero or footer
    if (!section || section.type === "HERO" || section.type === "FOOTER") {
      return false;
    }

    const sorted = sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const index = sorted.findIndex((s) => s.id === sectionId);

    if (index >= sorted.length - 1) return false;

    // Don't move past footer
    if (sorted[index + 1].type === "FOOTER") return false;

    // Swap orders
    const temp = sorted[index].order;
    await updateSection(sorted[index].id, { order: sorted[index + 1].order });
    await updateSection(sorted[index + 1].id, { order: temp });

    return true;
  } catch (error) {
    console.error("Error moving section down:", error);
    return false;
  }
}

/**
 * Get section type label for display
 */
export function getSectionTypeLabel(type: SectionType): string {
  const labels: Record<SectionType, string> = {
    HERO: "Hero Section",
    FOOTER: "Footer Section",
    CTA: "Call to Action",
    NORMAL: "Content Section",
    FLEXIBLE: "Flexible Section",
  };
  return labels[type];
}

/**
 * Check if section is movable
 */
export function isSectionMovable(type: SectionType): boolean {
  return type !== "HERO" && type !== "FOOTER";
}

/**
 * Delete all sections for a given page slug (except HERO and FOOTER)
 */
export async function clearAllSections(pageSlug: string): Promise<boolean> {
  try {
    const sections = await getSections(pageSlug);
    const deletable = sections.filter(
      (s) => s.type !== "HERO" && s.type !== "FOOTER"
    );
    const results = await Promise.all(
      deletable.map((s) =>
        fetchWithRefresh(`/api/sections/${s.id}`, { method: "DELETE" })
          .then((r) => r.ok)
          .catch(() => false)
      )
    );
    return results.every(Boolean);
  } catch (error) {
    console.error("Error clearing sections:", error);
    return false;
  }
}

/**
 * Reorder sections by ID array (drag-and-drop)
 */
export async function reorderSections(
  pageSlug: string,
  orderedIds: string[]
): Promise<boolean> {
  try {
    // Get current sections to find pageId
    const sections = await getSections(pageSlug);
    if (sections.length === 0) return false;

    // Assign new order values based on array position
    const sectionsWithOrder = orderedIds.map((id, index) => ({
      id,
      order: index,
    }));

    // Get pageId directly from the already-fetched sections (all share the same pageId)
    const pageId = (sections[0] as any).pageId;
    if (!pageId) {
      console.error("Could not determine pageId from sections");
      return false;
    }

    // Call reorder API
    const response = await fetchWithRefresh("/api/sections/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId,
        sections: sectionsWithOrder,
      }),
    });

    if (!response.ok) {
      console.error("Failed to reorder sections:", response.statusText);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error reordering sections:", error);
    return false;
  }
}
