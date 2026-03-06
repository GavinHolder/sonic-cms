/**
 * SEO Seed Script
 *
 * Writes /data/seo-config.json with industry-standard SEO defaults.
 * Run this once at initial deployment, then customise via the admin panel.
 *
 * Usage:
 *   npx tsx scripts/seed-seo.ts
 *   (or add to package.json: "db:seed-seo": "tsx scripts/seed-seo.ts")
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT TO CUSTOMISE PER CLIENT:
 *
 *  1.  siteName          → Client's legal trading name (e.g. "Acme Plumbing CC")
 *  2.  canonicalBase     → Full domain with https:// (e.g. "https://www.acme.co.za")
 *  3.  defaultDescription→ 150-160 char pitch sentence — unique, includes main keyword
 *  4.  social.ogImage    → Absolute URL to 1200×630px OG image (upload to /public/images/)
 *  5.  social.twitterSite→ Twitter/X handle e.g. "@acmeplumbing" (leave "" if none)
 *  6.  structuredData.*  → Fill in real business address, phone, URL
 *  7.  structuredData.type → Change to the most specific schema.org type:
 *        "Plumber", "Restaurant", "LegalService", "MedicalBusiness",
 *        "RealEstateAgent", "AutoRepair", "AccountingService", etc.
 *  8.  robots.disallowPaths → Add any client-specific paths to block
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SEO SUPERPOWER CHECKLIST (verify after customising):
 *  ✅  canonicalBase set → prevents duplicate-content penalties
 *  ✅  structuredData.enabled = true → LocalBusiness JSON-LD on every page
 *  ✅  siteName in titles → "Page Title | Company Name" pattern
 *  ✅  defaultDescription ≤ 160 chars → not truncated in SERPs
 *  ✅  ogImage absolute URL → social previews work on LinkedIn/Facebook/WhatsApp
 *  ✅  /admin and /api disallowed → keeps crawl budget on public content
 *  ✅  sitemap included in robots.txt → Googlebot finds all pages immediately
 *  ✅  Per-page metaTitle + metaDescription → set these in Admin → Content → Pages → SEO
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import type { SeoConfig } from "../lib/seo-config";

// ─── Configuration ────────────────────────────────────────────────────────────

const config: SeoConfig = {
  // ─── Site Identity ──────────────────────────────────────────────────────────
  siteName: "Your Company",           // CUSTOMISE: Client's trading name
  titleSeparator: "|",                // "Page Title | Your Company" — standard SEO practice
  defaultDescription:
    "Professional services delivered with expertise and care. " +
    "Serving the local community with quality you can trust.",
                                      // CUSTOMISE: 50-160 chars, include primary keyword
  canonicalBase: "",                  // CUSTOMISE: "https://www.yourcompany.co.za" (no trailing slash)

  // ─── Social & Open Graph ────────────────────────────────────────────────────
  social: {
    ogImage: "/images/og-default.jpg",
    // CUSTOMISE: Upload a 1200×630px branded image to /public/images/og-default.jpg
    // This image shows when pages are shared on Facebook, LinkedIn, WhatsApp, Slack
    // Once canonicalBase is set, this becomes: "https://yoursite.co.za/images/og-default.jpg"

    twitterCard: "summary_large_image",
    // "summary_large_image" = large image preview (recommended for most sites)
    // "summary" = small square thumbnail (use for news/blog sites)

    twitterSite: "",
    // CUSTOMISE: "@yourhandle" — shows as "Via @yourhandle" under Twitter cards
  },

  // ─── Robots & Crawling ──────────────────────────────────────────────────────
  robots: {
    disallowPaths: [
      "/admin",   // Keep admin panel private — critical for security
      "/api",     // API routes add no SEO value, save crawl budget
    ],
    // CUSTOMISE: Add "/staging", "/preview", "/internal" if applicable
    includeSitemap: true,
    // Tells Googlebot/Bingbot where your sitemap is — always leave true
  },

  // ─── LocalBusiness JSON-LD Structured Data ──────────────────────────────────
  // This is the #1 SEO superpower for local businesses.
  // Google uses this to populate Knowledge Panels and local search results.
  structuredData: {
    enabled: true,
    // Set to false only for national/international brands without a physical location

    type: "LocalBusiness",
    // CUSTOMISE: Use the most specific schema.org type for the client's industry.
    // Examples:
    //   Trades:      "Plumber", "Electrician", "HVACBusiness", "RoofingContractor"
    //   Food:        "Restaurant", "Bakery", "CafeOrCoffeeShop", "BarOrPub"
    //   Health:      "MedicalBusiness", "Dentist", "Optician", "Pharmacy"
    //   Finance:     "AccountingService", "FinancialService", "InsuranceAgency"
    //   Property:    "RealEstateAgent", "HousePainter"
    //   Legal:       "LegalService", "Attorney"
    //   Automotive:  "AutoRepair", "AutoDealer", "AutoWash"
    //   Education:   "EducationalOrganization", "CollegeOrUniversity"
    //   Beauty:      "HairSalon", "BeautySalon", "NailSalon", "SpaOrHealthClub"
    //   Retail:      "Store", "ClothingStore", "HomeGoodsStore", "BookStore"
    //   Tech:        "SoftwareApplication", "ITService", "ComputerRepair"
    //   Generic:     "LocalBusiness", "Organization", "Corporation"

    name: "Your Company",
    // CUSTOMISE: Exact legal/trading name as it should appear in Google

    streetAddress: "",
    // CUSTOMISE: "123 Main Road" — street number + name only (no city/province)

    addressLocality: "",
    // CUSTOMISE: City or town (e.g. "Cape Town", "Durban", "Pretoria")

    addressCountry: "ZA",
    // CUSTOMISE: ISO 3166-1 alpha-2 code ("ZA", "US", "GB", "AU", "DE", etc.)

    telephone: "",
    // CUSTOMISE: International format "+27 21 555 0100" — spaces OK, hyphens OK

    url: "",
    // CUSTOMISE: "https://www.yourcompany.co.za" — canonical website URL
  },

  updatedAt: new Date().toISOString(),
};

// ─── Write to /data/seo-config.json ──────────────────────────────────────────

const dataDir = path.join(process.cwd(), "data");
const configPath = path.join(dataDir, "seo-config.json");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log("📁 Created /data directory");
}

writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

console.log("✅ SEO config written to /data/seo-config.json");
console.log("");
console.log("📋 Next steps — customise these fields in the admin panel");
console.log("   Admin → Content → SEO  (or edit the JSON directly):");
console.log("");
console.log("   1. Site Name         → client trading name");
console.log("   2. Canonical Base    → https://www.yourclientdomain.co.za");
console.log("   3. Default Desc      → 50-160 char site pitch with primary keyword");
console.log("   4. OG Image          → upload 1200×630px to /public/images/og-default.jpg");
console.log("   5. Structured Data   → fill in address, phone, schema type");
console.log("   6. Twitter Handle    → @handle if client has Twitter/X");
console.log("");
console.log("   Then: Set per-page metaTitle + metaDescription via:");
console.log("   Admin → Content → Pages → 🔍 SEO button on each page row");
console.log("");
console.log("🚀 SEO superpowers active:");
console.log("   ✓ JSON-LD LocalBusiness schema on every page");
console.log("   ✓ Open Graph meta tags for social sharing");
console.log("   ✓ Twitter Card meta tags");
console.log("   ✓ Canonical URLs (once canonicalBase is set)");
console.log("   ✓ Dynamic sitemap.xml at /sitemap.xml");
console.log("   ✓ robots.txt at /robots.txt");
console.log("   ✓ Monthly SEO audit cron via Vercel");
