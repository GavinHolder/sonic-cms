/**
 * GET  /api/admin/google-setup  — return Google setup step statuses
 * PUT  /api/admin/google-setup  — save manual step completions + GA4 ID
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { fetchSeoConfig } from "@/lib/metadata-generator";

export const dynamic = "force-dynamic";

// Keys stored in SystemSettings for manual step completion
const MANUAL_STEP_KEYS = [
  "google_gsc_verified",
  "google_sitemap_submitted",
  "google_business_claimed",
  "google_indexing_requested",
] as const;

const GA4_KEY = "ga4_measurement_id";

async function getSettings(keys: string[]) {
  const rows = await prisma.systemSettings.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function upsert(key: string, value: string) {
  await prisma.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const [seoConfig, settings] = await Promise.all([
    fetchSeoConfig(),
    getSettings([...MANUAL_STEP_KEYS, GA4_KEY]),
  ]);

  const canonicalBase = seoConfig.canonicalBase?.trim() || "";
  const ga4Id = settings[GA4_KEY] || "";

  const steps = [
    {
      id: "canonical_base",
      label: "Set canonical base URL",
      description: "Your site's public URL (e.g. https://www.yourcompany.co.za). Required for sitemap and robots.txt.",
      status: canonicalBase ? "done" as const : "pending" as const,
      autoDetected: true,
      hint: canonicalBase || null,
      actionLink: "/admin/content/seo",
      actionLabel: "Go to Site Settings",
    },
    {
      id: "gsc_verified",
      label: "Verify site in Google Search Console",
      description: "Prove you own your domain so Google will index it. Add the site, then verify via DNS TXT record or HTML file upload.",
      status: settings["google_gsc_verified"] === "true" ? "done" as const : "pending" as const,
      autoDetected: false,
      instructions: [
        { text: "Go to Google Search Console", url: "https://search.google.com/search-console/about" },
        { text: "Click 'Start now' and sign in with your Google account" },
        { text: "Select 'URL prefix' and enter your site URL:", copyValue: canonicalBase || "https://www.yoursite.com" },
        { text: "Choose verification method — DNS TXT record is recommended:" },
        { text: "  • DNS: Add a TXT record to your domain's DNS settings (provided by Google)" },
        { text: "  • HTML file: Download the file and upload it to your site's public folder" },
        { text: "  • HTML tag: Add a meta tag (already supported via custom head scripts)" },
        { text: "Click 'Verify' in Search Console once the record is added" },
      ],
    },
    {
      id: "sitemap_submitted",
      label: "Submit sitemap to Google",
      description: "Tell Google where to find your pages. Your CMS generates the sitemap automatically.",
      status: settings["google_sitemap_submitted"] === "true" ? "done" as const : "pending" as const,
      autoDetected: false,
      instructions: [
        { text: "Open Google Search Console", url: "https://search.google.com/search-console" },
        { text: "Select your property (site) from the dropdown" },
        { text: "Go to 'Sitemaps' in the left sidebar" },
        { text: "Enter your sitemap URL and click 'Submit':", copyValue: canonicalBase ? `${canonicalBase}/sitemap.xml` : "https://www.yoursite.com/sitemap.xml" },
        { text: "Google will show 'Success' once it fetches the sitemap" },
        { text: "Note: It may take a few days for Google to process all pages" },
      ],
    },
    {
      id: "ga4_setup",
      label: "Connect Google Analytics (GA4)",
      description: "Track visitor behaviour on your site. Paste your GA4 Measurement ID and the CMS will inject the tracking script automatically.",
      status: ga4Id ? "done" as const : "pending" as const,
      autoDetected: true,
      ga4Id,
      instructions: [
        { text: "Go to Google Analytics", url: "https://analytics.google.com" },
        { text: "Create an account (or use an existing one)" },
        { text: "Create a new GA4 property for your website" },
        { text: "Go to Admin → Data Streams → Web → Create stream" },
        { text: "Enter your site URL and stream name" },
        { text: "Copy the Measurement ID (starts with G-)" },
        { text: "Paste it in the field below — the CMS handles the rest" },
      ],
    },
    {
      id: "business_claimed",
      label: "Claim Google Business Profile",
      description: "Appear on Google Maps and in local search results. Essential for local businesses.",
      status: settings["google_business_claimed"] === "true" ? "done" as const : "pending" as const,
      autoDetected: false,
      instructions: [
        { text: "Go to Google Business Profile", url: "https://business.google.com" },
        { text: "Sign in and search for your business name" },
        { text: "If found, click 'Claim this business' and follow verification steps" },
        { text: "If not found, click 'Add your business' and enter your details" },
        { text: "Verify ownership (Google may send a postcard, call, or email)" },
        { text: "Once verified, add photos, business hours, and services" },
        { text: "Link your website URL to the profile" },
      ],
    },
    {
      id: "indexing_requested",
      label: "Request indexing of your pages",
      description: "Ask Google to crawl and index your site. This speeds up discovery — otherwise it can take weeks.",
      status: settings["google_indexing_requested"] === "true" ? "done" as const : "pending" as const,
      autoDetected: false,
      instructions: [
        { text: "Open Google Search Console", url: "https://search.google.com/search-console" },
        { text: "Use the URL Inspection tool (search bar at the top)" },
        { text: "Enter your homepage URL:", copyValue: canonicalBase || "https://www.yoursite.com" },
        { text: "Click 'Request Indexing'" },
        { text: "Repeat for your most important pages (about, services, contact, etc.)" },
        { text: "Google typically crawls within 24-48 hours of a request" },
        { text: "Note: You can only request a few URLs per day — start with the most important ones" },
      ],
    },
  ];

  const doneCount = steps.filter(s => s.status === "done").length;

  return NextResponse.json({
    steps,
    doneCount,
    totalCount: steps.length,
    canonicalBase,
    ga4Id,
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as {
    stepId?: string;
    done?: boolean;
    ga4MeasurementId?: string;
  };

  // Toggle a manual step
  if (body.stepId && body.done !== undefined) {
    const keyMap: Record<string, string> = {
      gsc_verified: "google_gsc_verified",
      sitemap_submitted: "google_sitemap_submitted",
      business_claimed: "google_business_claimed",
      indexing_requested: "google_indexing_requested",
    };
    const settingsKey = keyMap[body.stepId];
    if (!settingsKey) {
      return NextResponse.json({ error: "Invalid step ID" }, { status: 400 });
    }
    await upsert(settingsKey, body.done ? "true" : "false");
  }

  // Save GA4 measurement ID
  if (body.ga4MeasurementId !== undefined) {
    const id = body.ga4MeasurementId.trim();
    // Validate format: empty (to clear) or G-XXXXXXXXXX
    if (id && !/^G-[A-Z0-9]{6,12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid GA4 Measurement ID format. Expected: G-XXXXXXXXXX" }, { status: 400 });
    }
    await upsert(GA4_KEY, id);
  }

  return NextResponse.json({ success: true });
}
