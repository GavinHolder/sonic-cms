/**
 * Section Data Store
 *
 * Manages section data with localStorage persistence for the CMS.
 * This module provides a centralized way to read/write section configurations
 * that can be used by both the admin dashboard and the public-facing pages.
 *
 * CRITICAL SYSTEM INVARIANT:
 * =========================
 * ALL sections (except hero-carousel and banner) MUST have fullScreen: true
 * This is NON-NEGOTIABLE and enforced automatically:
 * - Ensures every section fills viewport (min-height: 100vh)
 * - Enables proper scroll-snap behavior (sections never skipped)
 * - Prevents content from being overlooked during scrolling
 * - Guarantees consistent user experience across all sections
 *
 * This invariant is enforced in:
 * - getSections() - Reads and auto-corrects stored data
 * - saveSections() - Validates and corrects before saving
 * - updateSection() - Prevents fullScreen from being disabled
 * - addSection() - Sets fullScreen=true for new sections
 *
 * TODO: Replace localStorage with backend API calls when available
 * API Endpoints to implement:
 * - GET /api/pages/:slug - Fetch page with all sections
 * - PUT /api/pages/:slug - Update entire page
 * - PATCH /api/sections/:id - Update single section
 * - DELETE /api/sections/:id - Delete section
 */

import type { SectionConfig, PageConfig, SectionType } from "@/types/section";

// Legacy section data uses old kebab-case types and flat properties.
// Cast through any to avoid strict type errors while preserving runtime behavior.
type LegacySectionConfig = any;

const STORAGE_KEY = "cms_sections";
const PAGES_STORAGE_KEY = "cms_pages";

/**
 * Default section configurations for the homepage
 * This serves as the initial data and fallback
 */
export const defaultHomepageSections: LegacySectionConfig[] = [
  // SECTION 1: Hero Carousel
  {
    id: "hero-1",
    type: "hero",
    enabled: true,
    order: 1,
    background: "transparent",
    paddingTop: 0,
    paddingBottom: 0,
    content: {
      slides: [
        {
          id: "1",
          type: "image",
          src: "/images/placeholder-hero.jpg",
          overlay: {
            heading: {
              text: "Fast, Reliable Internet",
              fontSize: 56,
              fontWeight: 700,
              fontFamily: "inherit",
              color: "#ffffff",
              animation: "slideUp",
              animationDuration: 800,
              animationDelay: 200,
            },
            subheading: {
              text: "Across the Your Region Region",
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "inherit",
              color: "#ffffff",
              animation: "slideUp",
              animationDuration: 800,
              animationDelay: 400,
            },
            buttons: [
              {
                text: "Check Coverage",
                href: "/coverage",
                backgroundColor: "#2563eb",
                textColor: "#ffffff",
                variant: "filled",
                animation: "slideUp",
                animationDuration: 800,
                animationDelay: 600,
              },
            ],
            position: "center",
            spacing: {
              betweenHeadingSubheading: 16,
              betweenSubheadingButtons: 32,
              betweenButtons: 16,
            },
            overlayOffset: {
              top: 100,
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
          gradient: {
            enabled: true,
            type: "preset",
            preset: {
              direction: "bottom",
              startOpacity: 70,
              endOpacity: 0,
              color: "#000000",
            },
          },
        },
        {
          id: "2",
          type: "image",
          src: "/images/placeholder-support.jpg",
          overlay: {
            heading: {
              text: "Locally Supported",
              fontSize: 56,
              fontWeight: 700,
              fontFamily: "inherit",
              color: "#ffffff",
              animation: "fadeIn",
              animationDuration: 800,
              animationDelay: 200,
            },
            subheading: {
              text: "Real people, real solutions",
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "inherit",
              color: "#ffffff",
              animation: "fadeIn",
              animationDuration: 800,
              animationDelay: 400,
            },
            buttons: [
              {
                text: "Contact Support",
                href: "/support",
                backgroundColor: "#2563eb",
                textColor: "#ffffff",
                variant: "filled",
                animation: "fadeIn",
                animationDuration: 800,
                animationDelay: 600,
              },
            ],
            position: "center",
            spacing: {
              betweenHeadingSubheading: 16,
              betweenSubheadingButtons: 32,
              betweenButtons: 16,
            },
            overlayOffset: {
              top: 100,
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
          gradient: {
            enabled: true,
            type: "preset",
            preset: {
              direction: "bottom",
              startOpacity: 70,
              endOpacity: 0,
              color: "#000000",
            },
          },
        },
      ],
      autoPlay: true,
      autoPlayInterval: 5000,
      showDots: true,
      showArrows: true,
      transitionDuration: 800,
    },
  },

  // SECTION 2: Text + Image with VERY LONG CONTENT FOR TESTING INTERNAL SCROLLING
  {
    id: "text-image-1",
    type: "text-image",
    enabled: true,
    order: 2,
    fullScreen: true, // Enable full-screen snap mode with internal scrolling
    heading: "Why Choose Us? - LONG TEST SECTION",
    content: `
      <p class="lead mb-4">We're a local ISP committed to providing fast, reliable internet across the Your Region region. No hidden fees, no throttling, just honest connectivity backed by real people who care.</p>

      <h4 class="mt-5 mb-3">Our Commitment to You</h4>
      <p class="mb-4">We believe that reliable internet connectivity is no longer a luxury—it's a necessity. Whether you're working from home, streaming your favorite shows, or running a business, we've got you covered.</p>

      <h5 class="mt-5 mb-3">What Makes Us Different:</h5>
      <ul class="list-unstyled mb-4">
        <li class="mb-3">&#10003; <strong>No Contracts:</strong> Month-to-month service with no lock-in periods</li>
        <li class="mb-3">&#10003; <strong>Transparent Pricing:</strong> What you see is what you pay</li>
        <li class="mb-3">&#10003; <strong>Local Support:</strong> Real people in your community</li>
        <li class="mb-3">&#10003; <strong>99.9% Uptime:</strong> Reliable connectivity you can count on</li>
        <li class="mb-3">&#10003; <strong>No Throttling:</strong> Use your full speed 24/7</li>
        <li class="mb-3">&#10003; <strong>Free Installation:</strong> We cover all setup costs</li>
      </ul>

      <h5 class="mt-5 mb-3">Serving the Your Region Since 2010:</h5>
      <p class="mb-4">With over 10,000 satisfied customers across the region, we've built our reputation on reliability, transparency, and exceptional customer service. Our local team understands the unique connectivity challenges of the Your Region, and we've invested millions in building infrastructure that serves our community.</p>

      <p class="mb-4">From Your City to Swellendam, from Betty's Bay to Napier, we're here to connect you to what matters most.</p>

      <h4 class="mt-5 mb-3">SECTION 1 LONG CONTENT - Our Network Infrastructure</h4>
      <p class="mb-4">Our state-of-the-art network infrastructure ensures that you get the fastest, most reliable connection possible. We've invested heavily in fiber optic technology and wireless towers across the Your Region region.</p>

      <h5 class="mt-4 mb-3">Coverage Areas:</h5>
      <ul class="mb-4">
        <li class="mb-2">Your City - Full fiber coverage in CBD and most suburbs</li>
        <li class="mb-2">City 3 - Wireless and fiber options available</li>
        <li class="mb-2">Betty's Bay - Wireless coverage with plans for fiber expansion</li>
        <li class="mb-2">City 2 - Complete wireless coverage</li>
        <li class="mb-2">City 4 - Growing fiber network</li>
        <li class="mb-2">Swellendam - Wireless and select fiber areas</li>
      </ul>

      <h4 class="mt-5 mb-3">MORE SCROLL CONTENT - Customer Testimonials</h4>
      <p class="mb-3"><em>"This company has been a game-changer for our business. The reliable connection and local support make all the difference."</em> - Sarah M., Your City</p>
      <p class="mb-3"><em>"After years of struggling with other providers, our honest pricing and no-contract policy won us over. Best decision we made!"</em> - John D., City 3</p>
      <p class="mb-4"><em>"The customer service is incredible. Real people who actually care about solving your problems."</em> - Lisa K., City 2</p>

      <h4 class="mt-5 mb-3">ADDITIONAL CONTENT - Technical Specifications</h4>
      <p class="mb-4">Our network utilizes cutting-edge technology to deliver consistent performance. Whether you're on fiber or wireless, we guarantee speeds that match your package.</p>

      <ul class="mb-4">
        <li class="mb-2"><strong>Fiber Network:</strong> GPON technology with 1:32 split ratio maximum</li>
        <li class="mb-2"><strong>Wireless Network:</strong> 5GHz frequency with MIMO antennas</li>
        <li class="mb-2"><strong>Backhaul:</strong> Multiple fiber backhaul links for redundancy</li>
        <li class="mb-2"><strong>Uptime:</strong> 99.9% guaranteed with SLA</li>
      </ul>

      <h4 class="mt-5 mb-3">KEEP SCROLLING - Support Services</h4>
      <p class="mb-4">Our support team is available 24/7 to assist with any connectivity issues. We pride ourselves on fast response times and effective solutions.</p>

      <ul class="mb-4">
        <li class="mb-2"><strong>Phone Support:</strong> 15-minute average response time</li>
        <li class="mb-2"><strong>Email Support:</strong> Response within 2 hours</li>
        <li class="mb-2"><strong>Live Chat:</strong> Instant assistance during business hours</li>
        <li class="mb-2"><strong>WhatsApp:</strong> Quick support on your mobile device</li>
      </ul>

      <h4 class="mt-5 mb-3">EVEN MORE CONTENT - Our History</h4>
      <p class="mb-4">Your Company started with a simple mission: bring excellent service to the region. What began as a small operation has grown into a comprehensive service spanning the entire area.</p>

      <p class="mb-4">Our founder, a local entrepreneur frustrated with poor service from national ISPs, saw an opportunity to do things differently. Today, we're proud to serve over 10,000 households and businesses, always staying true to our roots as a local, community-focused provider.</p>

      <h4 class="mt-5 mb-3">CONTENT SECTION 7 - Our Values</h4>
      <p class="mb-4">We operate on five core values that guide everything we do:</p>

      <ul class="mb-4">
        <li class="mb-3"><strong>Transparency:</strong> No hidden fees, no surprises, no fine print. What you see is what you pay.</li>
        <li class="mb-3"><strong>Reliability:</strong> 99.9% uptime guarantee backed by our SLA. When issues arise, we fix them fast.</li>
        <li class="mb-3"><strong>Community:</strong> We're your neighbors. We sponsor local teams, support local schools, and invest in the region.</li>
        <li class="mb-3"><strong>Innovation:</strong> Continuous network upgrades to bring you the latest technology.</li>
        <li class="mb-3"><strong>Accessibility:</strong> Affordable pricing with flexible payment options. Internet for everyone.</li>
      </ul>

      <h4 class="mt-5 mb-3">CONTENT SECTION 8 - Environmental Responsibility</h4>
      <p class="mb-4">We're committed to reducing our environmental impact. Our data centers run on renewable energy, and we've partnered with local conservation efforts to minimize the footprint of our wireless infrastructure.</p>

      <p class="mb-4">Every year, we plant 100 trees for every 100 new customers, contributing to the reforestation of the Your Region region. It's our way of giving back to the land that supports our business and our community.</p>

      <h4 class="mt-5 mb-3">FINAL SECTION - Ready to Switch?</h4>
      <p class="mb-4">Join our satisfied customers. We have a solution that fits your needs.</p>

      <p class="mb-4"><strong>This section is now approximately 4-5x viewport height and thoroughly tests internal scrolling before transitioning to the next section.</strong></p>

      <div class="alert alert-success mt-4 mb-5">
        <h5 class="alert-heading">Test This Scrolling Behavior:</h5>
        <ul class="mb-0">
          <li>Scroll DOWN through this long content - should scroll internally first</li>
          <li>When you reach the bottom, continue scrolling - should transition to next section</li>
          <li>Scroll UP from next section - should snap back to this section</li>
          <li>Continue scrolling UP - should scroll internal content back to top</li>
          <li>When at top of this section, scroll UP again - should transition to hero</li>
        </ul>
      </div>
    `,
    imageSrc: "/images/placeholder-hero.jpg",
    imageAlt: "Your Company Infrastructure",
    layout: "right",
    buttons: [
      { text: "Our Story", href: "/about", variant: "primary" },
      { text: "Contact Us", href: "/support", variant: "outline" },
    ],
    background: "blue",
  },

  // SECTION 3: Stats Grid
  {
    id: "stats-1",
    type: "stats-grid",
    enabled: true,
    order: 3,
    fullScreen: true, // Enable full-screen snap mode
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
    background: "white",
  },

  // SECTION 4: Card Grid with Services - EXTENDED FOR INTERNAL SCROLL TESTING
  {
    id: "card-grid-1",
    type: "card-grid",
    enabled: true,
    order: 4,
    fullScreen: true, // Enable full-screen snap mode with internal scrolling
    heading: "Our Services - Extended Test Section",
    subheading: "Choose the perfect internet solution for your needs - Scroll down to see all 12 service options",
    cards: [
      {
        id: "1",
        title: "Fibre Internet - Home",
        description: `
          Uncapped, unshaped, unthrottled fibre connectivity for homes and families.
          Experience lightning-fast speeds with our state-of-the-art fibre network infrastructure.

          Perfect for:
          - Streaming in 4K on multiple TVs
          - Online gaming with ultra-low latency
          - Working from home with video calls
          - Large file uploads/downloads
          - Multiple device connections (10+ devices)
          - Smart home integration

          Speeds from 20Mbps to 1000Mbps

          Installation:
          - Free professional installation
          - Same-day setup in most areas
          - Includes high-speed router
          - 6-month warranty on equipment
        `,
        color: "#2563eb",
        buttons: [
          { text: "View Packages", href: "/services", variant: "primary" },
          { text: "Learn More", href: "/services", variant: "outline" },
        ],
        badge: "Popular",
      },
      {
        id: "2",
        title: "Wireless Internet - Rural",
        description: `
          Wide coverage area with fibre-backed wireless network. Perfect for rural areas where fibre isn't available yet.

          Features:
          - Quick installation (1-2 days)
          - Wide coverage area (up to 15km from tower)
          - Fibre-backed reliability
          - Weather-resistant outdoor equipment
          - Professional installation included
          - 24/7 monitoring

          Speeds up to 50Mbps

          Coverage Areas:
          - Your City outskirts
          - City 3 rural areas
          - Betty's Bay
          - City 2 farms
          - City 4 surrounds
        `,
        color: "#16a34a",
        buttons: [{ text: "Check Coverage", href: "/coverage", variant: "primary" }],
      },
      {
        id: "3",
        title: "Business Solutions - SME",
        description: `
          Dedicated support and customized packages for small-medium businesses. SLA agreements, priority support, and scalable bandwidth.

          Business Benefits:
          - Dedicated account manager
          - Priority technical support (15-min response)
          - Custom SLA agreements (99.9% uptime)
          - Scalable bandwidth (grow as you grow)
          - Static IP addresses included
          - DDoS protection
          - Free equipment upgrades

          Industries We Serve:
          - Retail & hospitality
          - Professional services
          - Healthcare providers
          - Educational institutions
          - Manufacturing & logistics

          Contact us for custom quotes
        `,
        color: "#9333ea",
        buttons: [{ text: "Learn More", href: "/services", variant: "primary" }],
      },
      {
        id: "4",
        title: "VoIP Services - Home & Office",
        description: `
          Crystal clear voice calls over internet. Includes local and international calling plans with competitive rates.

          VoIP Features:
          - HD voice quality (crystal clear)
          - Local & international calls
          - Mobile app included (iOS/Android)
          - Call forwarding to any number
          - Voicemail to email transcription
          - Number portability (keep your number)
          - Call recording (business plans)
          - Conference calling (up to 25 participants)

          Pricing:
          - Home plans from R99/month
          - Business plans from R299/month
          - Save up to 60% vs traditional landlines

          No contracts, cancel anytime
        `,
        color: "#dc2626",
        buttons: [{ text: "Explore VoIP", href: "/services", variant: "primary" }],
        badge: "New",
      },
      {
        id: "5",
        title: "Fibre Internet - Business",
        description: `
          Enterprise-grade fibre with guaranteed speeds and priority support for demanding businesses.

          Enterprise Features:
          - Symmetrical speeds (equal upload/download)
          - Guaranteed bandwidth (no contention)
          - 99.95% uptime SLA
          - Dedicated fiber line option
          - Managed router with advanced security
          - IPv6 support
          - VLAN configuration
          - Port forwarding & firewall management

          Speeds: 100Mbps to 10Gbps

          Best For:
          - Tech companies
          - Data centers
          - Video production
          - High-frequency trading
          - Cloud service providers
        `,
        color: "#0891b2",
        buttons: [{ text: "Enterprise Quote", href: "/services", variant: "primary" }],
        badge: "Enterprise",
      },
      {
        id: "6",
        title: "Wireless Internet - Business",
        description: `
          Reliable wireless connectivity for businesses without fiber access. Fiber-backed towers ensure consistent performance.

          Business Wireless Features:
          - Dedicated bandwidth allocation
          - Priority support (24/7)
          - Static IP included
          - Equipment insurance covered
          - Backup connection failover
          - Network monitoring dashboard
          - Traffic shaping & QoS

          Speeds: 20Mbps to 100Mbps

          Perfect For:
          - Branch offices
          - Retail locations
          - Construction sites
          - Temporary locations
          - Backup connectivity
        `,
        color: "#059669",
        buttons: [{ text: "Business Wireless", href: "/services", variant: "primary" }],
      },
      {
        id: "7",
        title: "Managed WiFi Solutions",
        description: `
          Professional WiFi network design, installation, and management for businesses and public spaces.

          Managed WiFi Includes:
          - Site survey & network design
          - Enterprise-grade access points
          - Centralized management dashboard
          - Guest WiFi with captive portal
          - Usage analytics & reporting
          - Automatic updates & patches
          - 24/7 monitoring & support

          Ideal For:
          - Hotels & guesthouses
          - Restaurants & cafes
          - Office buildings
          - Shopping centers
          - Conference venues
          - Educational campuses

          Pricing: From R999/month
        `,
        color: "#7c3aed",
        buttons: [{ text: "WiFi Solutions", href: "/services", variant: "primary" }],
        badge: "Pro",
      },
      {
        id: "8",
        title: "Cloud Hosting & Storage",
        description: `
          Secure, locally-hosted cloud solutions with fiber-fast access. Your data stays in South Africa.

          Cloud Services:
          - Virtual private servers (VPS)
          - Cloud storage (1TB to unlimited)
          - Automated daily backups
          - 99.9% uptime guarantee
          - POPIA compliant
          - Disaster recovery options
          - CDN integration
          - API access

          Benefits:
          - Data sovereignty (SA-hosted)
          - Ultra-low latency
          - Direct fiber connection
          - No international fees
          - Local support

          From R299/month
        `,
        color: "#ea580c",
        buttons: [{ text: "Cloud Services", href: "/services", variant: "primary" }],
      },
      {
        id: "9",
        title: "Email Hosting - Business",
        description: `
          Professional email hosting with your own domain. Spam filtering, archiving, and collaboration tools included.

          Email Features:
          - Custom domain (@yourcompany.co.za)
          - 50GB mailbox per user
          - Advanced spam filtering (99.9% accuracy)
          - Email archiving & e-discovery
          - Mobile sync (ActiveSync)
          - Webmail access
          - Shared calendars & contacts
          - Team collaboration tools

          Security:
          - Antivirus scanning
          - Encryption in transit & at rest
          - Two-factor authentication
          - Admin controls & policies

          From R89/user/month
        `,
        color: "#db2777",
        buttons: [{ text: "Email Hosting", href: "/services", variant: "primary" }],
      },
      {
        id: "10",
        title: "Network Security Services",
        description: `
          Comprehensive network security solutions to protect your business from cyber threats.

          Security Services:
          - Next-gen firewall management
          - Intrusion detection & prevention
          - DDoS protection (up to 10Gbps)
          - VPN setup & management
          - Security audits & penetration testing
          - Compliance reporting (POPIA, GDPR)
          - 24/7 security monitoring
          - Incident response & remediation

          Protection Against:
          - Malware & ransomware
          - Phishing attacks
          - Data breaches
          - Insider threats
          - Zero-day exploits

          From R1,499/month
        `,
        color: "#dc2626",
        buttons: [{ text: "Security Services", href: "/services", variant: "primary" }],
        badge: "Essential",
      },
      {
        id: "11",
        title: "Backup & Disaster Recovery",
        description: `
          Automated backup solutions with rapid disaster recovery. Protect your business data from any disaster.

          Backup Services:
          - Automated daily backups
          - Incremental & full backups
          - Local + cloud redundancy
          - Point-in-time recovery
          - 30-day retention (configurable)
          - Encrypted backups (AES-256)
          - Automated testing & verification
          - Disaster recovery plan

          What We Back Up:
          - Servers & databases
          - Email & documents
          - Virtual machines
          - Cloud applications
          - Mobile devices

          Recovery Time: <4 hours
          From R499/month
        `,
        color: "#0284c7",
        buttons: [{ text: "Backup Solutions", href: "/services", variant: "primary" }],
      },
      {
        id: "12",
        title: "IT Support & Maintenance",
        description: `
          Comprehensive IT support for businesses. Remote & on-site support, proactive monitoring, and maintenance.

          Support Services:
          - 24/7 helpdesk (phone, email, chat)
          - Remote desktop support
          - On-site technician visits
          - Network monitoring & maintenance
          - Software updates & patching
          - Hardware troubleshooting
          - User account management
          - IT consultancy & planning

          Response Times:
          - Critical: 1 hour
          - High: 4 hours
          - Medium: 24 hours
          - Low: 48 hours

          Pricing:
          - Basic: R999/month (remote only)
          - Standard: R1,999/month (2 on-site visits)
          - Premium: R3,999/month (unlimited on-site)
        `,
        color: "#65a30d",
        buttons: [{ text: "IT Support Plans", href: "/services", variant: "primary" }],
      },
    ],
    columns: 4,
    background: "blue",
  },

  // SECTION 5: Pricing Table with extensive plans
  {
    id: "table-1",
    type: "table",
    enabled: true,
    order: 5,
    fullScreen: true, // Enable full-screen snap mode
    heading: "Fibre Pricing Plans",
    subheading: "Find the perfect plan for your needs - all plans include unlimited data",
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
    background: "white",
  },

  // SECTION 6: Text + Image with Local Support info
  {
    id: "text-image-2",
    type: "text-image",
    enabled: true,
    order: 6,
    fullScreen: true, // Enable full-screen snap mode
    heading: "Local Support You Can Trust",
    content: `
      <p class="lead">Unlike big ISPs, we're a local company that cares about our community. Our support team is based right here in the Your Region, and they know the area inside and out.</p>

      <h4 class="mt-4 mb-3">Why Choose Local Support?</h4>

      <div class="row mt-4">
        <div class="col-md-6">
          <h5>No Overseas Call Centers</h5>
          <p>Speak to real locals who understand your needs. Our support team lives and works in the same community as you.</p>
        </div>
        <div class="col-md-6">
          <h5>Faster Response Times</h5>
          <p>We're in your timezone, and we understand local challenges. Average response time: 15 minutes.</p>
        </div>
      </div>

      <div class="row mt-3">
        <div class="col-md-6">
          <h5>Community-Focused Service</h5>
          <p>We sponsor local sports teams, schools, and events. Your ISP fee supports your community.</p>
        </div>
        <div class="col-md-6">
          <h5>On-Site Technicians</h5>
          <p>Our technicians are based locally and can be at your door quickly when you need assistance.</p>
        </div>
      </div>

      <h4 class="mt-5 mb-3">24/7 Support Channels:</h4>
      <ul class="list-unstyled">
        <li class="mb-2"><strong>Phone:</strong> 028 123 4567</li>
        <li class="mb-2"><strong>Email:</strong> support@yourcompany.co.za</li>
        <li class="mb-2"><strong>WhatsApp:</strong> 082 123 4567</li>
        <li class="mb-2"><strong>Live Chat:</strong> Available on our website</li>
        <li class="mb-2"><strong>Walk-in:</strong> Visit our Your City office</li>
      </ul>

      <div class="alert alert-info mt-4">
        <strong>Language Support:</strong> We offer full support in both English and Afrikaans. We're not just your ISP—we're your neighbors.
      </div>
    `,
    imageSrc: "/images/placeholder-support.jpg",
    imageAlt: "Support Team",
    layout: "left",
    buttons: [
      { text: "Contact Support", href: "/support", variant: "primary" },
      { text: "View Coverage Map", href: "/coverage", variant: "secondary" },
    ],
    background: "blue",
    banner: {
      content: "<strong>Need help?</strong> Our support team is available 24/7 to assist you! Average response time: 15 minutes.",
      variant: "info",
    },
  },

  // SECTION 7: CTA Footer (Always Last)
  {
    id: "cta-footer-1",
    type: "cta-footer",
    enabled: true,
    order: 998,
    fullScreen: true,
    heading: "Ready to Get Connected?",
    subheading: "Join thousands of happy customers across the Your Region",
    buttons: [
      { text: "Check Coverage", href: "/coverage", variant: "primary" },
      { text: "Contact Us", href: "/support", variant: "outline" },
    ],
    contactInfo: {
      phone: "028 123 4567",
      email: "info@yourcompany.co.za",
      address: "123 Main Street, Your City, 7200",
    },
    socialLinks: [
      { platform: "facebook", url: "https://facebook.com/yourcompany" },
      { platform: "instagram", url: "https://instagram.com/yourcompany" },
      { platform: "linkedin", url: "https://linkedin.com/company/yourcompany" },
    ],
    background: "blue",
  },

  // SECTION 8: Footer (Configurable - Always Last)
  {
    id: "footer-1",
    type: "footer",
    displayName: "Site Footer",
    enabled: true,
    order: 999, // Highest order - always renders last
    background: "gray",
    paddingTop: 80, // Space for navbar when scrolling into view
    paddingBottom: 40,
    content: {
      logo: "/images/logo-placeholder.svg",
      logoPosition: "top-left",
      tagline: "Fast, reliable internet for the Your Region region",
      companyInfo: {
        name: "Your Company",
        address: "123 Main Street, Your City, 7200",
        phone: "028 271 5494",
        email: "info@yourcompany.co.za",
        position: "top-center",
      },
      columns: [
        {
          id: "col-company",
          title: "Company",
          links: [
            { text: "About Us", href: "#about" },
            { text: "Coverage", href: "/coverage" },
            { text: "Contact", href: "/support" },
          ],
        },
        {
          id: "col-services",
          title: "Services",
          links: [
            { text: "Fiber Internet", href: "/services" },
            { text: "Wireless", href: "/services" },
            { text: "Equipment", href: "/equipment" },
          ],
        },
        {
          id: "col-support",
          title: "Support",
          links: [
            { text: "Help Center", href: "/support" },
            { text: "FAQs", href: "/support" },
            { text: "Client Login", href: "/client-login" },
          ],
        },
      ],
      copyright: "© 2026 Your Company. All rights reserved.",
      socialLinks: [
        { platform: "facebook", url: "https://facebook.com/yourcompany", icon: "bi-facebook" },
        { platform: "instagram", url: "https://instagram.com/yourcompany", icon: "bi-instagram" },
        { platform: "twitter", url: "https://twitter.com/yourcompany", icon: "bi-twitter-x" },
      ],
      certificationLogos: [
        {
          id: "cert-regulatory",
          image: "/images/regulatory-badge.png",
          text: "Regulatory Licensed ISP\nLicense: 123456",
          position: "bottom-right",
        },
        {
          id: "cert-iso",
          image: "/images/iso-logo.png",
          text: "ISO 9001 Certified\nQuality Management",
          position: "bottom-right",
        },
        {
          id: "cert-fiber",
          image: "/images/fiber-logo.png",
          text: "Fiber Broadband\nCertified Provider",
          position: "bottom-right",
        },
        {
          id: "cert-wireless",
          image: "/images/wireless-logo.png",
          text: "Wireless Broadband\nCertified",
          position: "bottom-right",
        },
        {
          id: "cert-support",
          image: "/images/support-logo.png",
          text: "24/7 Customer Support\nCertified Excellence",
          position: "bottom-right",
        },
      ],
      // Background options (default: no custom background)
      backgroundImage: "",
      gradient: {
        enabled: false,
        type: "preset" as const,
        preset: {
          direction: "bottom" as const,
          startOpacity: 70,
          endOpacity: 0,
          color: "#000000",
        },
      },
    },
  },
];

/**
 * Get all sections for a page
 * @param pageSlug - The page identifier (e.g., "home", "services")
 * @returns Array of section configurations
 */
export function getSections(pageSlug: string = "home"): any[] {
  if (typeof window === "undefined") {
    // Server-side: return empty (no defaults)
    return [];
  }

  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${pageSlug}`);
    if (stored) {
      const sections = JSON.parse(stored) as any[];

      // CRITICAL INVARIANT: Auto-enforce fullScreen on ALL sections except hero-carousel and banner
      // This is a NON-NEGOTIABLE requirement for scroll-snap functionality
      // Full-screen snapping ensures every section fills viewport and snaps correctly
      sections.forEach((section) => {
        if (section.type !== "hero-carousel" && section.type !== "banner") {
          // FORCE fullScreen=true regardless of stored value
          section.fullScreen = true;
        }
        // Set default snapThreshold if not present (100% = one viewport height)
        if (section.snapThreshold === undefined || section.snapThreshold === null) {
          section.snapThreshold = 100;
        }
      });

      return sections;
    }
  } catch (error) {
    console.error("Error reading sections from localStorage:", error);
  }

  // No sections in storage, return defaults and save them
  console.log("No sections in localStorage, returning and saving defaults");
  saveSections(defaultHomepageSections, pageSlug);
  return defaultHomepageSections;
}

/**
 * Save all sections for a page
 * @param sections - Array of section configurations
 * @param pageSlug - The page identifier
 */
export function saveSections(sections: any[], pageSlug: string = "home"): void {
  if (typeof window === "undefined") {
    console.warn("Cannot save sections on server-side");
    return;
  }

  try {
    // ENFORCE INVARIANT: fullScreen=true for all sections except hero-carousel and banner
    const correctedSections = sections.map((section) => {
      if (section.type !== "hero-carousel" && section.type !== "banner") {
        return { ...section, fullScreen: true };
      }
      return section;
    });

    localStorage.setItem(`${STORAGE_KEY}_${pageSlug}`, JSON.stringify(correctedSections));
  } catch (error) {
    console.error("Error saving sections to localStorage:", error);
  }
}

/**
 * Update a single section
 * @param sectionId - The section ID to update
 * @param updates - Partial section configuration to merge
 * @param pageSlug - The page identifier
 * @returns Updated section or null if not found
 */
export function updateSection(
  sectionId: string,
  updates: Partial<any>,
  pageSlug: string = "home"
): any | null {
  const sections = getSections(pageSlug);
  const index = sections.findIndex((s) => s.id === sectionId);

  if (index === -1) {
    console.warn(`Section not found: ${sectionId}`);
    return null;
  }

  const updatedSection = { ...sections[index], ...updates } as any;

  // ENFORCE INVARIANT: Prevent fullScreen from being disabled on non-hero/non-banner sections
  if (updatedSection.type !== "hero-carousel" && updatedSection.type !== "banner") {
    updatedSection.fullScreen = true;
  }

  sections[index] = updatedSection;
  saveSections(sections, pageSlug);

  return updatedSection;
}

/**
 * Delete a section
 * @param sectionId - The section ID to delete
 * @param pageSlug - The page identifier
 * @returns True if deleted, false if not found
 */
export function deleteSection(sectionId: string, pageSlug: string = "home"): boolean {
  const sections = getSections(pageSlug);
  const index = sections.findIndex((s) => s.id === sectionId);

  if (index === -1) {
    console.warn(`Section not found: ${sectionId}`);
    return false;
  }

  sections.splice(index, 1);

  // Re-order remaining sections
  sections.forEach((section, i) => {
    section.order = i + 1;
  });

  saveSections(sections, pageSlug);
  return true;
}

/**
 * Add a new section
 * @param section - The new section configuration
 * @param pageSlug - The page identifier
 * @returns The added section with generated ID if needed
 */
export function addSection(section: any, pageSlug: string = "home"): any {
  const sections = getSections(pageSlug);

  // Generate ID if not provided
  if (!section.id) {
    section.id = `${section.type}-${Date.now()}`;
  }

  // Set order to end of list if not provided
  if (!section.order) {
    section.order = sections.length + 1;
  }

  // ENFORCE INVARIANT: New sections MUST have fullScreen=true (except hero-carousel and banner)
  if (section.type !== "hero-carousel" && section.type !== "banner") {
    section.fullScreen = true;
  }

  sections.push(section);
  saveSections(sections, pageSlug);

  return section;
}

/**
 * Reorder sections
 * @param sectionIds - Array of section IDs in new order
 * @param pageSlug - The page identifier
 */
export function reorderSections(sectionIds: string[], pageSlug: string = "home"): void {
  const sections = getSections(pageSlug);

  // Create a map for quick lookup
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  // Reorder based on provided IDs
  const reorderedSections = sectionIds
    .map((id) => sectionMap.get(id))
    .filter((s): s is any => s !== undefined);

  // Update order values
  reorderedSections.forEach((section, index) => {
    section.order = index + 1;
  });

  saveSections(reorderedSections, pageSlug);
}

/**
 * Toggle section enabled state
 * @param sectionId - The section ID to toggle
 * @param pageSlug - The page identifier
 * @returns The new enabled state or null if not found
 */
export function toggleSectionEnabled(sectionId: string, pageSlug: string = "home"): boolean | null {
  const sections = getSections(pageSlug);
  const section = sections.find((s) => s.id === sectionId);

  if (!section) {
    console.warn(`Section not found: ${sectionId}`);
    return null;
  }

  section.enabled = !section.enabled;
  saveSections(sections, pageSlug);

  return section.enabled;
}

/**
 * Reset sections to default
 * @param pageSlug - The page identifier
 */
export function resetSectionsToDefault(pageSlug: string = "home"): void {
  saveSections(defaultHomepageSections, pageSlug);
}

/**
 * Get section type display info
 */
export const sectionTypeInfo: Record<string, { name: string; description: string; icon: string; itemLabel?: string }> = {
  "hero-carousel": {
    name: "Hero Carousel",
    description: "Full-screen image/video carousel with overlays",
    icon: "bi-collection-play",
    itemLabel: "slides",
  },
  "text-image": {
    name: "Text & Image Section",
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
    description: "Full-width alert/notification banner",
    icon: "bi-megaphone-fill",
  },
  table: {
    name: "Table",
    description: "Tabular data for pricing and comparisons",
    icon: "bi-table",
    itemLabel: "rows",
  },
"cta-footer": {
    name: "CTA Footer",
    description: "Call-to-action footer section (always last)",
    icon: "bi-layout-text-window",
  },
};

/**
 * Slugify a string for use in IDs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

/**
 * Generate a human-readable section ID
 * @param type - The section type
 * @param displayName - Optional display name to use as base
 * @param pageSlug - The page to check for existing IDs
 * @returns A unique, human-readable ID
 */
export function generateSectionId(
  type: SectionType,
  displayName?: string,
  pageSlug: string = "home"
): string {
  const existingSections = getSections(pageSlug);
  const existingIds = new Set(existingSections.map((s) => s.id));

  // Generate base slug from display name or type
  const baseSlug = displayName ? slugify(displayName) : type;

  // Find a unique ID
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
 * @param id - The ID to validate
 * @param pageSlug - The page to check for existing IDs
 * @returns null if valid, error message if invalid
 */
export function validateSectionId(id: string, pageSlug: string = "home"): string | null {
  if (!id) {
    return "ID is required";
  }

  // Check format (lowercase, alphanumeric, hyphens)
  if (!/^[a-z0-9-]+$/.test(id)) {
    return "ID can only contain lowercase letters, numbers, and hyphens";
  }

  // Check length
  if (id.length > 50) {
    return "ID must be 50 characters or less";
  }

  // Check uniqueness
  const existingSections = getSections(pageSlug);
  if (existingSections.some((s) => s.id === id)) {
    return "This ID is already in use";
  }

  return null;
}

/**
 * Get item count for a section (for display purposes)
 */
export function getSectionItemCount(section: any): number | null {
  switch (section.type) {
    case "hero-carousel":
      return section.items?.length || 0;
    case "stats-grid":
      return section.stats?.length || 0;
    case "card-grid":
      return section.cards?.length || 0;
    case "table":
      return section.rows?.length || 0;
    default:
      return null;
  }
}
