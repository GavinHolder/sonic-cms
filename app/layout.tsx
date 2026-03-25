export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "./sections.css";
import React from "react";
import Navbar from "@/components/layout/Navbar";
import ClientLayout from "@/components/layout/ClientLayout";
import ScrollRestoration from "@/components/ScrollRestoration";
import { headers } from "next/headers";
import { fetchSeoConfig, buildMetadata, buildStructuredData } from "@/lib/metadata-generator";
import prisma from "@/lib/prisma";
import MaintenancePage from "@/components/MaintenancePage";
import { getBrandTokens, brandTokensToCss, brandTokensToFontUrl } from "@/lib/brand-tokens";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seoConfig, siteConfig] = await Promise.all([
      fetchSeoConfig(),
      prisma.siteConfig.findUnique({ where: { id: "singleton" }, select: { faviconUrl: true } }),
    ]);
    const base = buildMetadata(null, seoConfig);
    return {
      ...base,
      ...(siteConfig?.faviconUrl ? { icons: { icon: siteConfig.faviconUrl } } : {}),
    };
  } catch {
    return {
      title: "Your Company",
      description: "Professional services for your region.",
    };
  }
}

/** Fetch navbar height server-side so sections have correct padding on first paint */
async function getNavbarHeight(): Promise<number> {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
    return config?.navbarStyle === "tall" ? 140 : 100;
  } catch {
    return 100;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAdminRoute = pathname.startsWith("/admin");
  const isIsolatedRoute = pathname.startsWith("/volt-preview") || pathname.startsWith("/maintenance-preview");

  // Maintenance mode — check DB only for public routes (skip admin, api, volt-preview)
  const isPublicRoute = !isAdminRoute && !isIsolatedRoute && !pathname.startsWith("/api");
  let maintenanceMode = false;
  let maintenanceTheme: import("@/components/MaintenancePage").MaintenanceTheme = {};
  if (isPublicRoute) {
    try {
      const [mRow, tplRow, imgRow, primRow, darkRow, lightRow, schemeRow, siteConfig] = await Promise.all([
        prisma.systemSettings.findUnique({ where: { key: "maintenance_mode" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_template" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_custom_img" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_primary_color" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_dark_color" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_light_color" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_color_scheme" } }),
        prisma.siteConfig.findUnique({ where: { id: "singleton" }, select: { logoUrl: true, companyName: true } }),
      ]);
      maintenanceMode = mRow?.value === "true";
      if (maintenanceMode) {
        maintenanceTheme = {
          logoUrl:      siteConfig?.logoUrl     || undefined,
          companyName:  siteConfig?.companyName || undefined,
          template:     (tplRow?.value as import("@/components/MaintenancePage").MaintenanceTemplate) || "plain",
          colorScheme:  (schemeRow?.value as "light" | "dark") || "light",
          customImage:  imgRow?.value   || undefined,
          primaryColor: primRow?.value  || undefined,
          darkColor:    darkRow?.value  || undefined,
          lightColor:   lightRow?.value || undefined,
        };
      }
    } catch {
      // DB unavailable during startup — don't block the site
    }
  }

  // JSON-LD structured data — only injected when admin has configured it
  // buildStructuredData() returns null when disabled or business name is empty
  // Output uses JSON.stringify with </script> escaped — safe to inline
  const [seoConfig, navbarHeight, brandTokens, customHeadScripts, customBodyScripts] = await Promise.all([
    fetchSeoConfig(),
    isAdminRoute ? Promise.resolve(100) : getNavbarHeight(),
    getBrandTokens(),
    isAdminRoute ? Promise.resolve("") : prisma.systemSettings.findUnique({ where: { key: "custom_head_scripts" } }).then(r => r?.value || "").catch(() => ""),
    isAdminRoute ? Promise.resolve("") : prisma.systemSettings.findUnique({ where: { key: "custom_body_scripts" } }).then(r => r?.value || "").catch(() => ""),
  ]);
  const jsonLd = isAdminRoute ? null : buildStructuredData(seoConfig);
  const brandCss = brandTokensToCss(brandTokens);
  const fontUrl = brandTokensToFontUrl(brandTokens);

  return (
    <html
      lang="en"
      style={{ "--navbar-height": `${navbarHeight}px`, height: "100%" } as React.CSSProperties}
    >
      <head>
        {/* Brand tokens — CSS custom properties for site-wide theming.
            Safe: brandCss is server-generated from validated hex colors + numbers only,
            never user-controlled HTML/JS. Same pattern as JSON-LD injection below. */}
        <style dangerouslySetInnerHTML={{ __html: brandCss }} />
        {/* Google Fonts — loaded dynamically based on brand token font selections */}
        {fontUrl && <link href={fontUrl} rel="stylesheet" />}
        {/* Bootstrap Icons — required for social icons in navbar and other public-facing components */}
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.min.css"
          rel="stylesheet"
        />
        {/* Custom head scripts (analytics, chat widgets, etc.) */}
        {customHeadScripts && <div dangerouslySetInnerHTML={{ __html: customHeadScripts }} />}
        {jsonLd && (
          <script
            type="application/ld+json"
            // Safe: content is server-generated JSON with </script> escaped
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: jsonLd }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, padding: 0 }}
      >
        {maintenanceMode ? <MaintenancePage theme={maintenanceTheme} /> : isIsolatedRoute ? children : (
          <>
            <ScrollRestoration />
            <ClientLayout showNavigation={!isAdminRoute}>
              {!isAdminRoute && <Navbar />}
              {isAdminRoute ? (
                children
              ) : (
                <main>
                  {children}
                </main>
              )}
            </ClientLayout>
          </>
        )}
        {/* Custom body scripts (tracking pixels, chat widgets at bottom) */}
        {customBodyScripts && <div dangerouslySetInnerHTML={{ __html: customBodyScripts }} />}
      </body>
    </html>
  );
}
