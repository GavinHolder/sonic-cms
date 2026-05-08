export interface SectionPreset {
  id: string;
  name: string;
  description: string;
  thumbnailId: string;
  designerData: object;
}

export const SECTION_PRESETS: SectionPreset[] = [
  // 1. About Grid
  {
    id: "about-grid",
    name: "About Grid",
    description: "Tall image left, heading + text + 4 stats right",
    thumbnailId: "thumb-about-grid",
    designerData: {
      layoutType: "grid",
      grid: { cols: 4, rows: 4, gap: 32 },
      blocks: [
        {
          id: 1, type: "image",
          position: { row: 1, col: 1, colSpan: 2, rowSpan: 4, section: 0 },
          props: { imageSrc: "/images/placeholder-tall.svg", imageFit: "cover" },
          subElements: [],
        },
        {
          id: 2, type: "text",
          position: { row: 1, col: 3, colSpan: 2, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "ABOUT US", color: "#4caf50" } },
            { type: "heading", props: { text: "Built for the Region.", fontSize: 42, fontWeight: 800, color: "#1a1a1a" } },
          ],
        },
        {
          id: 3, type: "text",
          position: { row: 2, col: 3, colSpan: 2, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "paragraph", props: { text: "We deliver quality and reliability on every project, from small residential pours to major commercial contracts.", fontSize: 15, color: "#444" } },
            { type: "paragraph", props: { text: "Our team brings decades of hands-on experience to every mix.", fontSize: 15, color: "#444" } },
          ],
        },
        {
          id: 4, type: "stats",
          position: { row: 3, col: 3, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "23", statLabel: "Years Experience", textColor: "#1a1a1a" },
          subElements: [],
        },
        {
          id: 5, type: "stats",
          position: { row: 3, col: 4, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "500+", statLabel: "Projects Completed", textColor: "#1a1a1a" },
          subElements: [],
        },
        {
          id: 6, type: "stats",
          position: { row: 4, col: 3, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "4", statLabel: "Batching Plants", textColor: "#1a1a1a" },
          subElements: [],
        },
        {
          id: 7, type: "stats",
          position: { row: 4, col: 4, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "24hr", statLabel: "Quote Turnaround", textColor: "#1a1a1a" },
          subElements: [],
        },
      ],
    },
  },

  // 2. Services Grid
  {
    id: "services-grid",
    name: "Services Grid",
    description: "Centred heading + 3 feature cards in a row",
    thumbnailId: "thumb-services-grid",
    designerData: {
      layoutType: "grid",
      grid: { cols: 3, rows: 2, gap: 24 },
      blocks: [
        {
          id: 1, type: "text",
          position: { row: 1, col: 1, colSpan: 3, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "WHAT WE OFFER", color: "#4caf50", textAlign: "center" } },
            { type: "heading", props: { text: "Our Services", fontSize: 40, fontWeight: 800, color: "#1a1a1a", textAlign: "center" } },
            { type: "paragraph", props: { text: "Everything you need, delivered with precision.", fontSize: 16, color: "#666", textAlign: "center" } },
          ],
        },
        {
          id: 2, type: "card",
          position: { row: 2, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
          props: { bgColor: "#f8f9fa" },
          subElements: [
            { type: "eyebrow", props: { text: "✦", color: "#4caf50", fontSize: 22 } },
            { type: "heading", props: { text: "Readymix Concrete", fontSize: 20, fontWeight: 700, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "All strength classes. Consistent mix, on-time delivery.", fontSize: 14, color: "#555" } },
          ],
        },
        {
          id: 3, type: "card",
          position: { row: 2, col: 2, colSpan: 1, rowSpan: 1, section: 0 },
          props: { bgColor: "#f8f9fa" },
          subElements: [
            { type: "eyebrow", props: { text: "✦", color: "#4caf50", fontSize: 22 } },
            { type: "heading", props: { text: "Pump Hire", fontSize: 20, fontWeight: 700, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "Transit and pump trucks available for any pour size.", fontSize: 14, color: "#555" } },
          ],
        },
        {
          id: 4, type: "card",
          position: { row: 2, col: 3, colSpan: 1, rowSpan: 1, section: 0 },
          props: { bgColor: "#f8f9fa" },
          subElements: [
            { type: "eyebrow", props: { text: "✦", color: "#4caf50", fontSize: 22 } },
            { type: "heading", props: { text: "Technical Support", fontSize: 20, fontWeight: 700, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "Expert mix design and on-site guidance from our team.", fontSize: 14, color: "#555" } },
          ],
        },
      ],
    },
  },

  // 3. How It Works
  {
    id: "how-it-works",
    name: "How It Works",
    description: "Centred heading + 4 numbered process steps",
    thumbnailId: "thumb-how-it-works",
    designerData: {
      layoutType: "grid",
      grid: { cols: 4, rows: 2, gap: 24 },
      blocks: [
        {
          id: 1, type: "text",
          position: { row: 1, col: 1, colSpan: 4, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "THE PROCESS", color: "#4caf50", textAlign: "center" } },
            { type: "heading", props: { text: "How It Works", fontSize: 40, fontWeight: 800, color: "#1a1a1a", textAlign: "center" } },
          ],
        },
        {
          id: 2, type: "how-steps",
          position: { row: 2, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
          props: { stepNumber: "01", title: "Request a Quote", description: "Call or fill in our online form with your mix requirements and pour date.", accentColor: "#4caf50" },
          subElements: [],
        },
        {
          id: 3, type: "how-steps",
          position: { row: 2, col: 2, colSpan: 1, rowSpan: 1, section: 0 },
          props: { stepNumber: "02", title: "Mix Design", description: "Our team selects the right mix class, additives, and slump for your conditions.", accentColor: "#4caf50" },
          subElements: [],
        },
        {
          id: 4, type: "how-steps",
          position: { row: 2, col: 3, colSpan: 1, rowSpan: 1, section: 0 },
          props: { stepNumber: "03", title: "Scheduled Delivery", description: "We dispatch your load at the agreed time — tracked from plant to site.", accentColor: "#4caf50" },
          subElements: [],
        },
        {
          id: 5, type: "how-steps",
          position: { row: 2, col: 4, colSpan: 1, rowSpan: 1, section: 0 },
          props: { stepNumber: "04", title: "Pour & Support", description: "Our driver and plant team stay available through the pour for any adjustments.", accentColor: "#4caf50", isLast: true },
          subElements: [],
        },
      ],
    },
  },

  // 4. Contact Split
  {
    id: "contact-split",
    name: "Contact Split",
    description: "Contact details left, enquiry form right",
    thumbnailId: "thumb-contact-split",
    designerData: {
      layoutType: "grid",
      grid: { cols: 2, rows: 1, gap: 48 },
      blocks: [
        {
          id: 1, type: "text",
          position: { row: 1, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "GET IN TOUCH", color: "#4caf50" } },
            { type: "heading", props: { text: "Let's Talk", fontSize: 40, fontWeight: 800, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "We respond to all enquiries within 24 hours.", fontSize: 15, color: "#555" } },
            { type: "paragraph", props: { text: "📞 +27 28 212 1234", fontSize: 15, color: "#333", fontWeight: "600" } },
            { type: "paragraph", props: { text: "✉ info@company.co.za", fontSize: 15, color: "#333", fontWeight: "600" } },
            { type: "paragraph", props: { text: "📍 123 Main Street, Overberg", fontSize: 15, color: "#333", fontWeight: "600" } },
          ],
        },
        {
          id: 2, type: "contact-form",
          position: { row: 1, col: 2, colSpan: 1, rowSpan: 1, section: 0 },
          props: {
            formTitle: "Send us a message",
            fields: { name: true, email: true, phone: true, message: true, subject: false },
            submitLabel: "Send Message",
            successMessage: "Thank you — we'll be in touch within 24 hours.",
          },
          subElements: [],
        },
      ],
    },
  },

  // 5. Stats Banner
  {
    id: "stats-banner",
    name: "Stats Banner",
    description: "4 large metrics in a full-width row",
    thumbnailId: "thumb-stats-banner",
    designerData: {
      layoutType: "grid",
      grid: { cols: 4, rows: 1, gap: 1 },
      blocks: [
        {
          id: 1, type: "stats",
          position: { row: 1, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "23", statLabel: "Years in Business", textColor: "#fff", bgColor: "#1a1a1a" },
          subElements: [],
        },
        {
          id: 2, type: "stats",
          position: { row: 1, col: 2, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "500+", statLabel: "Projects Delivered", textColor: "#fff", bgColor: "#2d2d2d" },
          subElements: [],
        },
        {
          id: 3, type: "stats",
          position: { row: 1, col: 3, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "4", statLabel: "Batching Plants", textColor: "#fff", bgColor: "#1a1a1a" },
          subElements: [],
        },
        {
          id: 4, type: "stats",
          position: { row: 1, col: 4, colSpan: 1, rowSpan: 1, section: 0 },
          props: { statNumber: "100%", statLabel: "On-Site Reliability", textColor: "#fff", bgColor: "#2d2d2d" },
          subElements: [],
        },
      ],
    },
  },

  // 6. Features Alternating
  {
    id: "features-alternating",
    name: "Features Alternating",
    description: "Section heading + 2 alternating text/image rows",
    thumbnailId: "thumb-features-alternating",
    designerData: {
      layoutType: "grid",
      grid: { cols: 2, rows: 3, gap: 48 },
      blocks: [
        {
          id: 1, type: "text",
          position: { row: 1, col: 1, colSpan: 2, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "FEATURES", color: "#4caf50", textAlign: "center" } },
            { type: "heading", props: { text: "Why Choose Us", fontSize: 40, fontWeight: 800, color: "#1a1a1a", textAlign: "center" } },
          ],
        },
        {
          id: 2, type: "text",
          position: { row: 2, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "QUALITY", color: "#4caf50" } },
            { type: "heading", props: { text: "Consistent Mix, Every Pour", fontSize: 28, fontWeight: 800, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "Every batch is tested to SANS standards. You get the strength you spec, guaranteed.", fontSize: 15, color: "#555" } },
            { type: "button", props: { text: "Learn More →", navTarget: "#contact", bgColor: "#4caf50", textColor: "#fff" } },
          ],
        },
        {
          id: 3, type: "image",
          position: { row: 2, col: 2, colSpan: 1, rowSpan: 1, section: 0 },
          props: { imageSrc: "/images/placeholder-wide.svg", imageFit: "cover" },
          subElements: [],
        },
        {
          id: 4, type: "image",
          position: { row: 3, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
          props: { imageSrc: "/images/placeholder-wide.svg", imageFit: "cover" },
          subElements: [],
        },
        {
          id: 5, type: "text",
          position: { row: 3, col: 2, colSpan: 1, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "RELIABILITY", color: "#4caf50" } },
            { type: "heading", props: { text: "On Time, Every Time", fontSize: 28, fontWeight: 800, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "We track every truck from plant to site. If your schedule changes, we adapt.", fontSize: 15, color: "#555" } },
            { type: "button", props: { text: "See Our Record →", navTarget: "#contact", bgColor: "#4caf50", textColor: "#fff" } },
          ],
        },
      ],
    },
  },

  // 7. Team Grid
  {
    id: "team-grid",
    name: "Team Grid",
    description: "Centred heading + 4 team member cards",
    thumbnailId: "thumb-team-grid",
    designerData: {
      layoutType: "grid",
      grid: { cols: 4, rows: 2, gap: 16 },
      blocks: [
        {
          id: 1, type: "text",
          position: { row: 1, col: 1, colSpan: 4, rowSpan: 1, section: 0 },
          props: {},
          subElements: [
            { type: "eyebrow", props: { text: "OUR TEAM", color: "#4caf50", textAlign: "center" } },
            { type: "heading", props: { text: "The People Behind the Mix", fontSize: 38, fontWeight: 800, color: "#1a1a1a", textAlign: "center" } },
          ],
        },
        {
          id: 2, type: "card",
          position: { row: 2, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
          props: { bgColor: "#f8f9fa" },
          subElements: [
            { type: "image", props: { src: "/images/placeholder-portrait.svg" } },
            { type: "heading", props: { text: "Jan Lourens", fontSize: 18, fontWeight: 700, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "General Manager", fontSize: 13, color: "#888" } },
          ],
        },
        {
          id: 3, type: "card",
          position: { row: 2, col: 2, colSpan: 1, rowSpan: 1, section: 0 },
          props: { bgColor: "#f8f9fa" },
          subElements: [
            { type: "image", props: { src: "/images/placeholder-portrait.svg" } },
            { type: "heading", props: { text: "Marie du Toit", fontSize: 18, fontWeight: 700, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "Technical Director", fontSize: 13, color: "#888" } },
          ],
        },
        {
          id: 4, type: "card",
          position: { row: 2, col: 3, colSpan: 1, rowSpan: 1, section: 0 },
          props: { bgColor: "#f8f9fa" },
          subElements: [
            { type: "image", props: { src: "/images/placeholder-portrait.svg" } },
            { type: "heading", props: { text: "Pieter Swart", fontSize: 18, fontWeight: 700, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "Operations Manager", fontSize: 13, color: "#888" } },
          ],
        },
        {
          id: 5, type: "card",
          position: { row: 2, col: 4, colSpan: 1, rowSpan: 1, section: 0 },
          props: { bgColor: "#f8f9fa" },
          subElements: [
            { type: "image", props: { src: "/images/placeholder-portrait.svg" } },
            { type: "heading", props: { text: "Anri Botha", fontSize: 18, fontWeight: 700, color: "#1a1a1a" } },
            { type: "paragraph", props: { text: "Plant Supervisor", fontSize: 13, color: "#888" } },
          ],
        },
      ],
    },
  },
];
