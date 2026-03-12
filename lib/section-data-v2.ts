/**
 * Section Data Store V2
 *
 * Manages section data with localStorage persistence for the unified section model.
 * Each section is a container holding a background, optional hero, and content blocks.
 *
 * CRITICAL SYSTEM INVARIANT:
 * =========================
 * ALL sections MUST have fullScreen: true
 * This ensures every section fills viewport for proper scroll-snap behavior.
 *
 * TODO: Replace localStorage with backend API calls when available
 */

import type {
  SectionConfig,
  ContentBlock,
  ContentBlockType,
  LayoutTemplate,
  SectionBackground,
  PageConfig,
} from "@/types/section-v2";

const STORAGE_KEY = "cms_sections_v2";
const V1_STORAGE_KEY = "cms_sections";

// ─── V1 Background Mapping ───────────────────────────────────────────────────

/**
 * Convert V1 background string ("white" | "gray" | "blue" | "transparent")
 * to V2 SectionBackground object.
 */
function mapV1Background(bg?: string): SectionBackground {
  switch (bg) {
    case "blue":
      return { type: "solid", color: "rgba(37, 99, 235, 0.1)" };
    case "gray":
      return { type: "solid", color: "#f8f9fa" };
    case "transparent":
      return { type: "solid", color: "transparent" };
    case "white":
    default:
      return { type: "solid", color: "#ffffff" };
  }
}

// ─── V1 → V2 Migration ──────────────────────────────────────────────────────

/**
 * Migrate V1 section data to V2 format.
 *
 * Conversion rules:
 * - hero-carousel → V2 section with hero.enabled=true, hero.items from V1 items
 * - text-image    → V2 section with a text-image content block
 * - stats-grid    → V2 section with a stats-grid content block
 * - card-grid     → V2 section with a card-grid content block
 * - table         → V2 section with a table content block
 * - cta-footer    → V2 section with a text-image content block (CTA content as HTML)
 * - banner        → V2 section with a banner content block
 *
 * ASSUMPTIONS:
 * 1. V1 data is a valid array of V1 SectionConfig objects
 * 2. V1 background values are "white" | "gray" | "blue" | "transparent"
 * 3. V1 hero-carousel items match the CarouselItem interface
 * 4. The user's localStorage may have customized V1 data that differs from defaults
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateV1ToV2(v1Sections: any[]): SectionConfig[] {
  const v2Sections: SectionConfig[] = [];

  for (const v1 of v1Sections) {
    const background = mapV1Background(v1.background);

    switch (v1.type) {
      case "hero-carousel": {
        v2Sections.push({
          id: v1.id || "hero-carousel",
          enabled: v1.enabled ?? true,
          order: v1.order ?? 1,
          displayName: "Hero Carousel",
          fullScreen: true,
          background: { type: "solid", color: "#000000" },
          layout: "single-column",
          hero: {
            enabled: true,
            items: v1.items || [],
            autoPlayInterval: v1.autoPlayInterval,
            showDots: v1.showDots,
            height: "full",
          },
          blocks: [],
        });
        break;
      }

      case "text-image": {
        v2Sections.push({
          id: v1.id || `text-image-${Date.now()}`,
          enabled: v1.enabled ?? true,
          order: v1.order ?? 99,
          displayName: v1.heading || "Text & Image",
          fullScreen: true,
          background,
          layout: "single-column",
          blocks: [
            {
              id: `block-${v1.id || "ti"}-1`,
              type: "text-image" as const,
              order: 1,
              heading: v1.heading || "",
              content: v1.content || "",
              imageSrc: v1.imageSrc || "/images/placeholder.jpg",
              imageAlt: v1.imageAlt || "",
              layout: v1.layout || "right",
              buttons: v1.buttons || [],
            },
          ],
        });
        break;
      }

      case "stats-grid": {
        v2Sections.push({
          id: v1.id || `stats-${Date.now()}`,
          enabled: v1.enabled ?? true,
          order: v1.order ?? 99,
          displayName: v1.heading || "Statistics",
          fullScreen: true,
          background,
          layout: "single-column",
          blocks: [
            {
              id: `block-${v1.id || "sg"}-1`,
              type: "stats-grid" as const,
              order: 1,
              heading: v1.heading,
              subheading: v1.subheading,
              stats: v1.stats || [],
              columns: v1.columns || 4,
            },
          ],
        });
        break;
      }

      case "card-grid": {
        v2Sections.push({
          id: v1.id || `cards-${Date.now()}`,
          enabled: v1.enabled ?? true,
          order: v1.order ?? 99,
          displayName: v1.heading || "Card Grid",
          fullScreen: true,
          background,
          layout: "single-column",
          blocks: [
            {
              id: `block-${v1.id || "cg"}-1`,
              type: "card-grid" as const,
              order: 1,
              heading: v1.heading,
              subheading: v1.subheading,
              cards: v1.cards || [],
              columns: v1.columns || 3,
            },
          ],
        });
        break;
      }

      case "table": {
        v2Sections.push({
          id: v1.id || `table-${Date.now()}`,
          enabled: v1.enabled ?? true,
          order: v1.order ?? 99,
          displayName: v1.heading || "Table",
          fullScreen: true,
          background,
          layout: "single-column",
          blocks: [
            {
              id: `block-${v1.id || "tb"}-1`,
              type: "table" as const,
              order: 1,
              heading: v1.heading,
              subheading: v1.subheading,
              headers: v1.headers || [],
              rows: v1.rows || [],
              striped: v1.striped,
              bordered: v1.bordered,
              hover: v1.hover,
            },
          ],
        });
        break;
      }

      case "banner": {
        v2Sections.push({
          id: v1.id || `banner-${Date.now()}`,
          enabled: v1.enabled ?? true,
          order: v1.order ?? 99,
          displayName: "Banner",
          fullScreen: false,
          background,
          layout: "single-column",
          blocks: [
            {
              id: `block-${v1.id || "bn"}-1`,
              type: "banner" as const,
              order: 1,
              content: v1.content || "",
              variant: v1.variant || "info",
              dismissible: v1.dismissible ?? false,
            },
          ],
        });
        break;
      }

      case "cta-footer": {
        // Convert CTA footer to a text-image block with CTA content
        const ctaHtml = buildCtaHtml(v1);
        v2Sections.push({
          id: v1.id || "cta-footer",
          enabled: v1.enabled ?? true,
          order: v1.order ?? 999,
          displayName: v1.heading || "Call to Action",
          fullScreen: true,
          background: { type: "solid", color: "rgba(37, 99, 235, 0.1)" },
          layout: "single-column",
          blocks: [
            {
              id: `block-${v1.id || "cta"}-1`,
              type: "text-image" as const,
              order: 1,
              heading: v1.heading || "Ready to Get Connected?",
              content: ctaHtml,
              imageSrc: "/images/placeholder-hero.jpg",
              imageAlt: "Your Company",
              layout: "right",
              buttons: v1.buttons || [],
              textAlign: "center",
            },
          ],
        });
        break;
      }

      default:
        break;
    }
  }

  return v2Sections;
}

/**
 * Build HTML content for the CTA footer section from V1 data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCtaHtml(v1: any): string {
  let html = "";

  if (v1.subheading) {
    html += `<p class="lead mb-4">${v1.subheading}</p>`;
  }

  if (v1.contactInfo) {
    html += '<div class="mt-4">';
    if (v1.contactInfo.phone) {
      html += `<p class="mb-2"><strong>Phone:</strong> ${v1.contactInfo.phone}</p>`;
    }
    if (v1.contactInfo.email) {
      html += `<p class="mb-2"><strong>Email:</strong> ${v1.contactInfo.email}</p>`;
    }
    if (v1.contactInfo.address) {
      html += `<p class="mb-2"><strong>Address:</strong> ${v1.contactInfo.address}</p>`;
    }
    html += "</div>";
  }

  if (v1.socialLinks && v1.socialLinks.length > 0) {
    html += '<div class="mt-3"><strong>Follow Us:</strong> ';
    html += v1.socialLinks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((link: any) => `<a href="${link.url}" class="me-3">${link.platform}</a>`)
      .join("");
    html += "</div>";
  }

  return html;
}

// ─── Default Data ──────────────────────────────────────────────────────────

/**
 * Default section configurations for the homepage (V2 format)
 *
 * Mirrors the original V1 default sections, converted to unified V2 model:
 * 1. Hero Carousel (hero.enabled=true)
 * 2. Why Choose Us (text-image block)
 * 3. Trusted by Thousands (stats-grid block)
 * 4. Our Services (card-grid block)
 * 5. Fibre Pricing Plans (table block)
 * 6. Local Support (text-image block)
 * 7. CTA Footer (text-image block with CTA content)
 */
export const defaultHomepageSections: SectionConfig[] = [
  // ── Section 1: Hero Carousel ──────────────────────────────────────────────
  {
    id: "hero-1",
    enabled: true,
    order: 1,
    displayName: "Hero Carousel",
    fullScreen: true,
    background: { type: "solid", color: "#000000" },
    layout: "single-column",
    hero: {
      enabled: true,
      items: [
        {
          id: "1",
          type: "image",
          src: "/images/placeholder-hero.jpg",
          alt: "Your Company Infrastructure",
          overlay: {
            heading: "Fast, Reliable Internet",
            subheading: "Across the Your Region Region",
            button: {
              text: "Check Coverage",
              href: "/coverage",
              variant: "primary",
            },
            position: "center",
            animation: "slide-up",
            animationDuration: 800,
            animationDelay: 300,
          },
        },
        {
          id: "2",
          type: "image",
          src: "/images/placeholder-support.jpg",
          alt: "Support Team",
          overlay: {
            heading: "Locally Supported",
            subheading: "Real people, real solutions",
            button: {
              text: "Contact Support",
              href: "/support",
              variant: "primary",
            },
            position: "center",
            animation: "fade-in",
          },
        },
      ],
      autoPlayInterval: 6000,
      showDots: true,
      height: "full",
    },
    blocks: [],
  },

  // ── Section 2: Why Choose Us ───────────────────────────────────────────
  {
    id: "text-image-1",
    enabled: true,
    order: 2,
    displayName: "Why Choose Us",
    fullScreen: true,
    background: { type: "solid", color: "rgba(37, 99, 235, 0.1)" },
    layout: "single-column",
    blocks: [
      {
        id: "block-ti-1",
        type: "text-image",
        order: 1,
        heading: "Why Choose Us?",
        content:
          '<p class="lead mb-4">We\'re a local ISP committed to providing fast, reliable internet across the Your Region region. No hidden fees, no throttling, just honest connectivity backed by real people who care.</p><h5 class="mt-4 mb-3">What Makes Us Different:</h5><ul class="list-unstyled mb-4"><li class="mb-3">&#10003; <strong>No Contracts:</strong> Month-to-month service with no lock-in periods</li><li class="mb-3">&#10003; <strong>Transparent Pricing:</strong> What you see is what you pay</li><li class="mb-3">&#10003; <strong>Local Support:</strong> Real people in your community</li><li class="mb-3">&#10003; <strong>99.9% Uptime:</strong> Reliable connectivity you can count on</li><li class="mb-3">&#10003; <strong>No Throttling:</strong> Use your full speed 24/7</li><li class="mb-3">&#10003; <strong>Free Installation:</strong> We cover all setup costs</li></ul>',
        imageSrc: "/images/placeholder-hero.jpg",
        imageAlt: "Your Company Infrastructure",
        layout: "right",
        buttons: [
          { text: "Our Story", href: "/about", variant: "primary" },
          { text: "Contact Us", href: "/support", variant: "outline" },
        ],
      },
    ],
  },

  // ── Section 3: Stats ──────────────────────────────────────────────────────
  {
    id: "stats-1",
    enabled: true,
    order: 3,
    displayName: "Trusted by Thousands",
    fullScreen: true,
    background: { type: "solid", color: "#ffffff" },
    layout: "single-column",
    blocks: [
      {
        id: "block-stats-1",
        type: "stats-grid",
        order: 1,
        heading: "Trusted by Thousands",
        subheading: "Numbers that speak for themselves",
        stats: [
          {
            id: "1",
            value: "10,000",
            suffix: "+",
            label: "Happy Customers",
            description: "Across the Your Region region",
          },
          {
            id: "2",
            value: "99.9",
            suffix: "%",
            label: "Uptime",
            description: "Reliable connectivity",
          },
          {
            id: "3",
            value: "24/7",
            label: "Support",
            description: "Local team always available",
          },
          {
            id: "4",
            value: "15",
            suffix: "min",
            label: "Response Time",
            description: "Average support ticket",
          },
        ],
        columns: 4,
      },
    ],
  },

  // ── Section 4: Services Card Grid ─────────────────────────────────────────
  {
    id: "card-grid-1",
    enabled: true,
    order: 4,
    displayName: "Our Services",
    fullScreen: true,
    background: { type: "solid", color: "rgba(37, 99, 235, 0.1)" },
    layout: "single-column",
    blocks: [
      {
        id: "block-cards-1",
        type: "card-grid",
        order: 1,
        heading: "Our Services",
        subheading:
          "Choose the perfect internet solution for your needs",
        cards: [
          {
            id: "1",
            title: "Fibre Internet",
            description:
              "Uncapped, unshaped, unthrottled fibre connectivity for homes and families.",
            color: "#2563eb",
            buttons: [
              { text: "View Packages", href: "/services", variant: "primary" },
            ],
            badge: "Popular",
          },
          {
            id: "2",
            title: "Wireless Internet",
            description:
              "Wide coverage area with fibre-backed wireless network for rural areas.",
            color: "#16a34a",
            buttons: [
              {
                text: "Check Coverage",
                href: "/coverage",
                variant: "primary",
              },
            ],
          },
          {
            id: "3",
            title: "Business Solutions",
            description:
              "Dedicated support and customized packages for businesses with SLA agreements.",
            color: "#9333ea",
            buttons: [
              { text: "Learn More", href: "/services", variant: "primary" },
            ],
          },
        ],
        columns: 3,
      },
    ],
  },

  // ── Section 5: Pricing Table ──────────────────────────────────────────────
  {
    id: "table-1",
    enabled: true,
    order: 5,
    displayName: "Fibre Pricing Plans",
    fullScreen: true,
    background: { type: "solid", color: "#ffffff" },
    layout: "single-column",
    blocks: [
      {
        id: "block-table-1",
        type: "table",
        order: 1,
        heading: "Fibre Pricing Plans",
        subheading:
          "Find the perfect plan for your needs - all plans include unlimited data",
        headers: ["Package", "Download", "Upload", "Monthly Price", "Best For"],
        rows: [
          {
            id: "1",
            cells: [
              "<strong>Basic 20</strong>",
              "20 Mbps",
              "10 Mbps",
              "<strong class='text-primary'>R399/mo</strong>",
              "Light browsing, email, social media",
            ],
          },
          {
            id: "2",
            cells: [
              "<strong>Standard 50</strong><span class='badge bg-success ms-2'>Popular</span>",
              "50 Mbps",
              "25 Mbps",
              "<strong class='text-primary'>R599/mo</strong>",
              "HD streaming, video calls, families",
            ],
          },
          {
            id: "3",
            cells: [
              "<strong>Premium 100</strong>",
              "100 Mbps",
              "50 Mbps",
              "<strong class='text-primary'>R899/mo</strong>",
              "4K streaming, gaming, remote work",
            ],
          },
          {
            id: "4",
            cells: [
              "<strong>Ultimate 200</strong>",
              "200 Mbps",
              "100 Mbps",
              "<strong class='text-primary'>R1,299/mo</strong>",
              "Power users, large households",
            ],
          },
          {
            id: "5",
            cells: [
              "<strong>Gigabit 1000</strong><span class='badge bg-primary ms-2'>Pro</span>",
              "1000 Mbps",
              "500 Mbps",
              "<strong class='text-primary'>R1,999/mo</strong>",
              "Businesses, content creators, tech enthusiasts",
            ],
          },
        ],
        striped: true,
        bordered: true,
        hover: true,
      },
    ],
  },

  // ── Section 6: Local Support ──────────────────────────────────────────────
  {
    id: "text-image-2",
    enabled: true,
    order: 6,
    displayName: "Local Support You Can Trust",
    fullScreen: true,
    background: { type: "solid", color: "rgba(37, 99, 235, 0.1)" },
    layout: "single-column",
    blocks: [
      {
        id: "block-ti-2",
        type: "text-image",
        order: 1,
        heading: "Local Support You Can Trust",
        content:
          '<p class="lead">Unlike big ISPs, we\'re a local company that cares about our community. Our support team is based right here in the Your Region, and they know the area inside and out.</p><h4 class="mt-4 mb-3">Why Choose Local Support?</h4><div class="row mt-4"><div class="col-md-6"><h5>No Overseas Call Centers</h5><p>Speak to real locals who understand your needs.</p></div><div class="col-md-6"><h5>Faster Response Times</h5><p>Average response time: 15 minutes.</p></div></div><h4 class="mt-5 mb-3">24/7 Support Channels:</h4><ul class="list-unstyled"><li class="mb-2"><strong>Phone:</strong> 028 123 4567</li><li class="mb-2"><strong>Email:</strong> support@yourcompany.co.za</li><li class="mb-2"><strong>WhatsApp:</strong> 082 123 4567</li><li class="mb-2"><strong>Live Chat:</strong> Available on our website</li></ul>',
        imageSrc: "/images/placeholder-support.jpg",
        imageAlt: "Support Team",
        layout: "left",
        buttons: [
          { text: "Contact Support", href: "/support", variant: "primary" },
          {
            text: "View Coverage Map",
            href: "/coverage",
            variant: "secondary",
          },
        ],
      },
    ],
  },

  // ── Section 7: CTA Footer ────────────────────────────────────────────────
  {
    id: "cta-footer-1",
    enabled: true,
    order: 999,
    displayName: "Ready to Get Connected?",
    fullScreen: true,
    background: { type: "solid", color: "rgba(37, 99, 235, 0.15)" },
    layout: "single-column",
    blocks: [
      {
        id: "block-cta-1",
        type: "text-image",
        order: 1,
        heading: "Ready to Get Connected?",
        content:
          '<p class="lead mb-4">Join thousands of happy customers across the Your Region</p><div class="mt-4"><p class="mb-2"><strong>Phone:</strong> 028 123 4567</p><p class="mb-2"><strong>Email:</strong> info@yourcompany.co.za</p><p class="mb-2"><strong>Address:</strong> 123 Main Street, Your City, 7200</p></div><div class="mt-3"><strong>Follow Us:</strong> <a href="https://facebook.com/yourcompany" class="me-3">Facebook</a><a href="https://instagram.com/yourcompany" class="me-3">Instagram</a><a href="https://linkedin.com/company/yourcompany" class="me-3">LinkedIn</a></div>',
        imageSrc: "/images/placeholder-hero.jpg",
        imageAlt: "Your Company",
        layout: "right",
        buttons: [
          { text: "Check Coverage", href: "/coverage", variant: "primary" },
          { text: "Contact Us", href: "/support", variant: "outline" },
        ],
        textAlign: "center",
      },
    ],
  },
];

// ─── Section CRUD ──────────────────────────────────────────────────────────

/**
 * Get all sections for a page
 *
 * Resolution order:
 * 1. If V2 data exists in localStorage → use it
 * 2. If V1 data exists in localStorage → migrate to V2, save, and use it
 * 3. Otherwise → use default V2 sections
 */
export function getSections(pageSlug: string = "home"): SectionConfig[] {
  if (typeof window === "undefined") {
    return defaultHomepageSections;
  }

  try {
    // 1. Check for existing V2 data
    const storedV2 = localStorage.getItem(`${STORAGE_KEY}_${pageSlug}`);
    if (storedV2) {
      const sections = JSON.parse(storedV2) as SectionConfig[];

      // ENFORCE INVARIANT: fullScreen=true for all sections
      return sections.map((section) => ({
        ...section,
        fullScreen: true,
      }));
    }

    // 2. Check for V1 data and migrate
    const storedV1 = localStorage.getItem(`${V1_STORAGE_KEY}_${pageSlug}`);
    if (storedV1) {
      try {
        const v1Sections = JSON.parse(storedV1);
        if (Array.isArray(v1Sections) && v1Sections.length > 0) {
          const migrated = migrateV1ToV2(v1Sections);
          if (migrated.length > 0) {
            // Save migrated data as V2
            saveSections(migrated, pageSlug);
            return migrated;
          }
        }
      } catch (migrationError) {
        console.error("Error migrating V1 sections to V2:", migrationError);
      }
    }
  } catch (error) {
    console.error("Error reading sections from localStorage:", error);
  }

  // 3. Return defaults
  return defaultHomepageSections;
}

/**
 * Save all sections for a page
 */
export function saveSections(
  sections: SectionConfig[],
  pageSlug: string = "home"
): void {
  if (typeof window === "undefined") {
    console.warn("Cannot save sections on server-side");
    return;
  }

  try {
    // ENFORCE INVARIANT: fullScreen=true for all sections
    const correctedSections = sections.map((section) => ({
      ...section,
      fullScreen: true,
    }));

    localStorage.setItem(
      `${STORAGE_KEY}_${pageSlug}`,
      JSON.stringify(correctedSections)
    );
  } catch (error) {
    console.error("Error saving sections to localStorage:", error);
  }
}

/**
 * Update a single section
 */
export function updateSection(
  sectionId: string,
  updates: Partial<SectionConfig>,
  pageSlug: string = "home"
): SectionConfig | null {
  const sections = getSections(pageSlug);
  const index = sections.findIndex((s) => s.id === sectionId);

  if (index === -1) {
    console.warn(`Section not found: ${sectionId}`);
    return null;
  }

  const updatedSection: SectionConfig = {
    ...sections[index],
    ...updates,
    fullScreen: true, // ENFORCE INVARIANT
  };

  const updatedSections = [
    ...sections.slice(0, index),
    updatedSection,
    ...sections.slice(index + 1),
  ];

  saveSections(updatedSections, pageSlug);
  return updatedSection;
}

/**
 * Delete a section
 */
export function deleteSection(
  sectionId: string,
  pageSlug: string = "home"
): boolean {
  const sections = getSections(pageSlug);
  const index = sections.findIndex((s) => s.id === sectionId);

  if (index === -1) {
    console.warn(`Section not found: ${sectionId}`);
    return false;
  }

  const remaining = sections.filter((s) => s.id !== sectionId);

  // Re-order remaining sections
  const reordered = remaining.map((section, i) => ({
    ...section,
    order: i + 1,
  }));

  saveSections(reordered, pageSlug);
  return true;
}

/**
 * Add a new section
 */
export function addSection(
  section: SectionConfig,
  pageSlug: string = "home"
): SectionConfig {
  const sections = getSections(pageSlug);

  const newSection: SectionConfig = {
    ...section,
    id: section.id || `section-${Date.now()}`,
    order: section.order || sections.length + 1,
    fullScreen: true, // ENFORCE INVARIANT
  };

  saveSections([...sections, newSection], pageSlug);
  return newSection;
}

/**
 * Toggle section enabled state
 */
export function toggleSectionEnabled(
  sectionId: string,
  pageSlug: string = "home"
): boolean | null {
  const sections = getSections(pageSlug);
  const section = sections.find((s) => s.id === sectionId);

  if (!section) {
    console.warn(`Section not found: ${sectionId}`);
    return null;
  }

  const updatedSections = sections.map((s) =>
    s.id === sectionId ? { ...s, enabled: !s.enabled } : s
  );

  saveSections(updatedSections, pageSlug);
  return !section.enabled;
}

/**
 * Reorder sections
 */
export function reorderSections(
  sectionIds: string[],
  pageSlug: string = "home"
): void {
  const sections = getSections(pageSlug);
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  const reordered = sectionIds
    .map((id) => sectionMap.get(id))
    .filter((s): s is SectionConfig => s !== undefined)
    .map((section, index) => ({
      ...section,
      order: index + 1,
    }));

  saveSections(reordered, pageSlug);
}

/**
 * Reset sections to default
 */
export function resetSectionsToDefault(pageSlug: string = "home"): void {
  saveSections(defaultHomepageSections, pageSlug);
}

// ─── Block CRUD (within a section) ─────────────────────────────────────────

/**
 * Add a content block to a section
 */
export function addBlock(
  sectionId: string,
  block: ContentBlock,
  pageSlug: string = "home"
): ContentBlock | null {
  const sections = getSections(pageSlug);
  const section = sections.find((s) => s.id === sectionId);

  if (!section) {
    console.warn(`Section not found: ${sectionId}`);
    return null;
  }

  const newBlock: ContentBlock = {
    ...block,
    id: block.id || `block-${Date.now()}`,
    order: block.order || section.blocks.length + 1,
  };

  const updatedSection: SectionConfig = {
    ...section,
    blocks: [...section.blocks, newBlock],
  };

  const updatedSections = sections.map((s) =>
    s.id === sectionId ? updatedSection : s
  );

  saveSections(updatedSections, pageSlug);
  return newBlock;
}

/**
 * Update a content block within a section
 */
export function updateBlock(
  sectionId: string,
  blockId: string,
  updates: Partial<ContentBlock>,
  pageSlug: string = "home"
): ContentBlock | null {
  const sections = getSections(pageSlug);
  const section = sections.find((s) => s.id === sectionId);

  if (!section) {
    console.warn(`Section not found: ${sectionId}`);
    return null;
  }

  const blockIndex = section.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    console.warn(`Block not found: ${blockId} in section ${sectionId}`);
    return null;
  }

  const updatedBlock = {
    ...section.blocks[blockIndex],
    ...updates,
  } as ContentBlock;

  const updatedBlocks = [
    ...section.blocks.slice(0, blockIndex),
    updatedBlock,
    ...section.blocks.slice(blockIndex + 1),
  ];

  const updatedSection: SectionConfig = {
    ...section,
    blocks: updatedBlocks,
  };

  const updatedSections = sections.map((s) =>
    s.id === sectionId ? updatedSection : s
  );

  saveSections(updatedSections, pageSlug);
  return updatedBlock;
}

/**
 * Delete a content block from a section
 */
export function deleteBlock(
  sectionId: string,
  blockId: string,
  pageSlug: string = "home"
): boolean {
  const sections = getSections(pageSlug);
  const section = sections.find((s) => s.id === sectionId);

  if (!section) {
    console.warn(`Section not found: ${sectionId}`);
    return false;
  }

  const remaining = section.blocks.filter((b) => b.id !== blockId);

  if (remaining.length === section.blocks.length) {
    console.warn(`Block not found: ${blockId} in section ${sectionId}`);
    return false;
  }

  // Re-order remaining blocks
  const reordered = remaining.map((block, i) => ({
    ...block,
    order: i + 1,
  }));

  const updatedSection: SectionConfig = {
    ...section,
    blocks: reordered,
  };

  const updatedSections = sections.map((s) =>
    s.id === sectionId ? updatedSection : s
  );

  saveSections(updatedSections, pageSlug);
  return true;
}

/**
 * Reorder content blocks within a section
 */
export function reorderBlocks(
  sectionId: string,
  blockIds: string[],
  pageSlug: string = "home"
): void {
  const sections = getSections(pageSlug);
  const section = sections.find((s) => s.id === sectionId);

  if (!section) {
    console.warn(`Section not found: ${sectionId}`);
    return;
  }

  const blockMap = new Map(section.blocks.map((b) => [b.id, b]));

  const reordered = blockIds
    .map((id) => blockMap.get(id))
    .filter((b): b is ContentBlock => b !== undefined)
    .map((block, index) => ({
      ...block,
      order: index + 1,
    }));

  const updatedSection: SectionConfig = {
    ...section,
    blocks: reordered,
  };

  const updatedSections = sections.map((s) =>
    s.id === sectionId ? updatedSection : s
  );

  saveSections(updatedSections, pageSlug);
}

// ─── Metadata & Display ────────────────────────────────────────────────────

/**
 * Content block type display info
 */
export const blockTypeInfo: Record<
  ContentBlockType,
  { name: string; description: string; icon: string; itemLabel?: string }
> = {
  "text-image": {
    name: "Text & Image",
    description: "Side-by-side text and image content",
    icon: "bi-layout-text-window-reverse",
  },
  "stats-grid": {
    name: "Statistics Grid",
    description: "Display statistics in grid format",
    icon: "bi-bar-chart-fill",
    itemLabel: "stats",
  },
  "card-grid": {
    name: "Card Grid",
    description: "Product/service cards in grid layout",
    icon: "bi-grid-3x3-gap-fill",
    itemLabel: "cards",
  },
  banner: {
    name: "Banner",
    description: "Alert/notification banner",
    icon: "bi-megaphone-fill",
  },
  table: {
    name: "Table",
    description: "Tabular data for pricing and comparisons",
    icon: "bi-table",
    itemLabel: "rows",
  },
};

/**
 * Generate a unique section ID
 */
export function generateSectionId(
  displayName?: string,
  pageSlug: string = "home"
): string {
  const existingSections = getSections(pageSlug);
  const existingIds = new Set(existingSections.map((s) => s.id));

  const baseSlug = displayName
    ? displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50)
    : "section";

  let id = baseSlug;
  let counter = 1;

  while (existingIds.has(id)) {
    id = `${baseSlug}-${counter}`;
    counter++;
  }

  return id;
}

/**
 * Validate a custom section ID
 */
export function validateSectionId(
  id: string,
  pageSlug: string = "home"
): string | null {
  if (!id) return "ID is required";
  if (!/^[a-z0-9-]+$/.test(id))
    return "ID can only contain lowercase letters, numbers, and hyphens";
  if (id.length > 50) return "ID must be 50 characters or less";

  const existingSections = getSections(pageSlug);
  if (existingSections.some((s) => s.id === id))
    return "This ID is already in use";

  return null;
}

/**
 * Get block count for a section (for display purposes)
 */
export function getSectionBlockCount(section: SectionConfig): number {
  return section.blocks.length;
}

/**
 * Create a default empty section
 */
export function createDefaultSection(
  displayName?: string,
  pageSlug?: string
): SectionConfig {
  return {
    id: generateSectionId(displayName, pageSlug),
    enabled: true,
    order: 999,
    displayName: displayName || "New Section",
    fullScreen: true,
    background: { type: "solid", color: "#ffffff" },
    layout: "single-column",
    blocks: [],
  };
}

/**
 * Create a default content block
 */
export function createDefaultBlock(
  type: ContentBlockType,
  order: number = 1
): ContentBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  switch (type) {
    case "text-image":
      return {
        id,
        type: "text-image",
        order,
        heading: "New Section",
        content: "<p>Enter your content here.</p>",
        imageSrc: "/images/placeholder.jpg",
        imageAlt: "Section image",
        layout: "right",
        buttons: [],
      };

    case "stats-grid":
      return {
        id,
        type: "stats-grid",
        order,
        heading: "Statistics",
        stats: [
          { id: "1", value: "100", suffix: "+", label: "Customers" },
          { id: "2", value: "99.9", suffix: "%", label: "Uptime" },
        ],
        columns: 2,
      };

    case "card-grid":
      return {
        id,
        type: "card-grid",
        order,
        heading: "Features",
        cards: [
          {
            id: "1",
            title: "Feature 1",
            description: "Description of feature 1",
          },
          {
            id: "2",
            title: "Feature 2",
            description: "Description of feature 2",
          },
        ],
        columns: 2,
      };

    case "banner":
      return {
        id,
        type: "banner",
        order,
        content: "<strong>Notice:</strong> Important information here.",
        variant: "info",
        dismissible: false,
      };

    case "table":
      return {
        id,
        type: "table",
        order,
        heading: "Comparison Table",
        headers: ["Feature", "Basic", "Premium"],
        rows: [
          { id: "1", cells: ["Speed", "50 Mbps", "200 Mbps"] },
          { id: "2", cells: ["Price", "R399/mo", "R899/mo"] },
        ],
        striped: true,
        bordered: true,
        hover: true,
      };
  }
}
