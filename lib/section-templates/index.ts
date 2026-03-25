/**
 * Section Template Library
 *
 * Pre-built section designs that users can select when adding a new section.
 * Templates are JSON blobs matching the designerData schema used by FLEXIBLE sections.
 * All templates use CSS variables (var(--cms-*)) so they adapt to any brand.
 */

export interface SectionTemplate {
  id: string
  name: string
  description: string
  category: 'hero' | 'about' | 'services' | 'cta' | 'portfolio' | 'testimonials' | 'contact' | 'pricing' | 'features' | 'footer'
  sectionType: 'HERO' | 'NORMAL' | 'CTA' | 'FOOTER' | 'FLEXIBLE'
  thumbnail: string  // emoji or icon for now, can be image URL later
  /** The designerData/content JSON to populate the section with */
  data: Record<string, unknown>
}

export const TEMPLATE_CATEGORIES = [
  { id: 'hero', label: 'Hero', icon: 'bi-stars' },
  { id: 'about', label: 'About', icon: 'bi-info-circle' },
  { id: 'services', label: 'Services', icon: 'bi-grid-3x3-gap' },
  { id: 'features', label: 'Features', icon: 'bi-lightning-charge' },
  { id: 'portfolio', label: 'Portfolio', icon: 'bi-images' },
  { id: 'testimonials', label: 'Testimonials', icon: 'bi-chat-quote' },
  { id: 'pricing', label: 'Pricing', icon: 'bi-tag' },
  { id: 'cta', label: 'Call to Action', icon: 'bi-megaphone' },
  { id: 'contact', label: 'Contact', icon: 'bi-envelope' },
  { id: 'footer', label: 'Footer', icon: 'bi-layout-text-sidebar-reverse' },
] as const

export const SECTION_TEMPLATES: SectionTemplate[] = [
  // ── Hero Templates ─────────────────────────────────────────────────────────
  {
    id: 'hero-centered',
    name: 'Centered Hero',
    description: 'Large heading, subtext, and CTA button centered on page',
    category: 'hero',
    sectionType: 'HERO',
    thumbnail: '🎯',
    data: {
      headline: 'Welcome to Our Company',
      subheadline: 'We deliver exceptional results for businesses like yours',
      ctaText: 'Get Started',
      ctaLink: '#contact',
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(135deg, var(--cms-primary), var(--cms-secondary))',
      textColor: '#ffffff',
      alignment: 'center',
    },
  },
  {
    id: 'hero-split',
    name: 'Split Hero',
    description: 'Text on left, image on right — classic business layout',
    category: 'hero',
    sectionType: 'HERO',
    thumbnail: '📐',
    data: {
      headline: 'Build Something Amazing',
      subheadline: 'Professional tools for modern businesses. Start your journey today.',
      ctaText: 'Learn More',
      ctaLink: '#about',
      backgroundType: 'color',
      backgroundColor: 'var(--cms-background)',
      textColor: 'var(--cms-text)',
      alignment: 'left',
      layout: 'split',
    },
  },
  {
    id: 'hero-video',
    name: 'Video Hero',
    description: 'Full-screen video background with overlay text',
    category: 'hero',
    sectionType: 'HERO',
    thumbnail: '🎬',
    data: {
      headline: 'Experience the Difference',
      subheadline: 'Watch what we can do for you',
      ctaText: 'Contact Us',
      ctaLink: '#contact',
      backgroundType: 'video',
      backgroundVideo: '',
      textColor: '#ffffff',
      alignment: 'center',
      overlayOpacity: 0.5,
    },
  },

  // ── About Templates ────────────────────────────────────────────────────────
  {
    id: 'about-story',
    name: 'Our Story',
    description: 'Company story with image and text side by side',
    category: 'about',
    sectionType: 'NORMAL',
    thumbnail: '📖',
    data: {
      heading: 'Our Story',
      body: 'Founded with a passion for excellence, we have been delivering quality solutions since day one. Our team of experts brings decades of combined experience to every project.',
      layout: 'text-image',
      imagePosition: 'right',
    },
  },
  {
    id: 'about-stats',
    name: 'Stats & Numbers',
    description: 'Key metrics displayed in a clean grid',
    category: 'about',
    sectionType: 'NORMAL',
    thumbnail: '📊',
    data: {
      heading: 'By the Numbers',
      stats: [
        { value: '500+', label: 'Projects Completed' },
        { value: '98%', label: 'Client Satisfaction' },
        { value: '15+', label: 'Years Experience' },
        { value: '24/7', label: 'Support Available' },
      ],
    },
  },

  // ── Services Templates ─────────────────────────────────────────────────────
  {
    id: 'services-grid',
    name: 'Services Grid',
    description: '3-column grid of service cards with icons',
    category: 'services',
    sectionType: 'NORMAL',
    thumbnail: '🔧',
    data: {
      heading: 'Our Services',
      subheading: 'What we offer',
      services: [
        { icon: 'bi-gear', title: 'Consulting', description: 'Expert guidance for your business challenges' },
        { icon: 'bi-code-slash', title: 'Development', description: 'Custom solutions built to your specifications' },
        { icon: 'bi-graph-up', title: 'Growth', description: 'Strategies to scale your business effectively' },
      ],
      columns: 3,
    },
  },

  // ── Features Templates ─────────────────────────────────────────────────────
  {
    id: 'features-alternating',
    name: 'Alternating Features',
    description: 'Feature blocks alternating image left/right',
    category: 'features',
    sectionType: 'NORMAL',
    thumbnail: '✨',
    data: {
      heading: 'Why Choose Us',
      features: [
        { title: 'Easy to Use', description: 'Intuitive interface designed for everyone', imagePosition: 'left' },
        { title: 'Powerful Tools', description: 'Everything you need in one platform', imagePosition: 'right' },
        { title: 'Reliable Support', description: '24/7 assistance when you need it', imagePosition: 'left' },
      ],
    },
  },

  // ── CTA Templates ──────────────────────────────────────────────────────────
  {
    id: 'cta-simple',
    name: 'Simple CTA',
    description: 'Bold heading with action button on a coloured background',
    category: 'cta',
    sectionType: 'CTA',
    thumbnail: '📢',
    data: {
      heading: 'Ready to Get Started?',
      subheading: 'Join hundreds of satisfied customers today',
      ctaText: 'Contact Us Now',
      ctaLink: '#contact',
      backgroundColor: 'var(--cms-primary)',
      textColor: '#ffffff',
    },
  },
  {
    id: 'cta-split',
    name: 'Split CTA',
    description: 'Text on one side, form on the other',
    category: 'cta',
    sectionType: 'CTA',
    thumbnail: '📋',
    data: {
      heading: 'Let\'s Talk',
      subheading: 'Fill out the form and we\'ll get back to you within 24 hours',
      layout: 'split-form',
      backgroundColor: 'var(--cms-surface)',
    },
  },

  // ── Testimonials ───────────────────────────────────────────────────────────
  {
    id: 'testimonials-cards',
    name: 'Testimonial Cards',
    description: 'Client quotes in a card layout',
    category: 'testimonials',
    sectionType: 'NORMAL',
    thumbnail: '💬',
    data: {
      heading: 'What Our Clients Say',
      testimonials: [
        { quote: 'Exceptional service and results. Highly recommended!', author: 'Client Name', role: 'CEO, Company' },
        { quote: 'They transformed our business with their expertise.', author: 'Client Name', role: 'Director, Company' },
        { quote: 'Professional, reliable, and always delivers on time.', author: 'Client Name', role: 'Manager, Company' },
      ],
    },
  },

  // ── Contact ────────────────────────────────────────────────────────────────
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Contact form with map placeholder',
    category: 'contact',
    sectionType: 'NORMAL',
    thumbnail: '✉️',
    data: {
      heading: 'Get in Touch',
      subheading: 'We\'d love to hear from you',
      fields: ['name', 'email', 'phone', 'message'],
      showMap: true,
    },
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  {
    id: 'footer-columns',
    name: 'Column Footer',
    description: 'Multi-column footer with links and contact info',
    category: 'footer',
    sectionType: 'FOOTER',
    thumbnail: '📎',
    data: {
      columns: [
        { title: 'Company', links: [{ text: 'About Us', href: '#about' }, { text: 'Services', href: '#services' }, { text: 'Contact', href: '#contact' }] },
        { title: 'Legal', links: [{ text: 'Privacy Policy', href: '/privacy' }, { text: 'Terms of Service', href: '/terms' }] },
        { title: 'Connect', links: [{ text: 'Facebook', href: '#' }, { text: 'Twitter', href: '#' }, { text: 'LinkedIn', href: '#' }] },
      ],
      copyrightText: '© {year} Your Company. All rights reserved.',
    },
  },
]

/** Get templates by category */
export function getTemplatesByCategory(category: string): SectionTemplate[] {
  return SECTION_TEMPLATES.filter(t => t.category === category)
}

/** Get a single template by ID */
export function getTemplateById(id: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find(t => t.id === id)
}
