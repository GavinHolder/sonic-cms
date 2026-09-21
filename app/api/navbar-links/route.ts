import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";

/** Shape returned/stored for a navbar link */
export interface NavbarLink {
  type: "section" | "page";
  id: string;
  label: string;
  href?: string; // pages only
  navOrder: number;
}

/** GET — returns the configured navbar links in order.
 *  If none are configured (showOnNavbar = false for all), returns empty array.
 *  Client falls back to legacy first-5-sections behaviour when empty. */
export async function GET() {
  try {
    const [sections, pages] = await Promise.all([
      prisma.section.findMany({
        where: { showOnNavbar: true, enabled: true },
        select: { id: true, navLabel: true, displayName: true, navOrder: true },
        orderBy: { navOrder: "asc" },
      }),
      prisma.page.findMany({
        where: { showOnNavbar: true, enabled: true },
        select: { id: true, slug: true, title: true, navLabel: true, navOrder: true },
        orderBy: { navOrder: "asc" },
      }),
    ]);

    const links: NavbarLink[] = [
      ...sections.map((s) => ({
        type: "section" as const,
        id: s.id,
        label: s.navLabel || s.displayName || "",
        navOrder: s.navOrder ?? 0,
      })),
      ...pages.map((p) => ({
        type: "page" as const,
        id: p.id,
        label: p.navLabel || p.title || "",
        href: `/${p.slug}`,
        navOrder: p.navOrder ?? 0,
      })),
    ].sort((a, b) => a.navOrder - b.navOrder);

    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error("navbar-links GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to load" }, { status: 500 });
  }
}

/** PUT — bulk update showOnNavbar + navOrder for sections and pages.
 *  Body: { links: Array<{ type, id, label, navOrder }> }
 *  All sections/pages NOT in the list get showOnNavbar = false.
 *
 *  ASSUMPTIONS:
 *  1. Identity is the httpOnly `access_token` cookie, verified by requireRole (lib/api-middleware).
 *  2. EDITOR or above may edit the navbar (mirrors PATCH /api/navbar).
 *  3. The guard is the first statement, so a 401/403 has no side effects (no body read, no DB
 *     access) and a client may safely retry after refreshing its session.
 *
 *  FAILURE MODES:
 *  - Expired 8h access token -> 401 (mitigated client-side by lib/fetch-with-refresh: refresh + one retry).
 *  - VIEWER, or a role demoted after the token was issued -> 403.
 *  - The first statement of the transaction clears showOnNavbar for EVERY section and page, so an
 *    unguarded call empties the public navbar. */
export async function PUT(request: NextRequest) {
  try {
    const auth = requireRole(request, "EDITOR");
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const links: NavbarLink[] = body.links ?? [];

    const sectionLinks = links.filter((l) => l.type === "section");
    const pageLinks    = links.filter((l) => l.type === "page");
    const sectionIds   = sectionLinks.map((l) => l.id);
    const pageIds      = pageLinks.map((l) => l.id);

    await prisma.$transaction([
      // Clear all navbar flags
      prisma.section.updateMany({ where: {}, data: { showOnNavbar: false } }),
      prisma.page.updateMany({ where: {}, data: { showOnNavbar: false } }),
      // Set enabled links
      ...sectionLinks.map((l) =>
        prisma.section.update({
          where: { id: l.id },
          data: { showOnNavbar: true, navOrder: l.navOrder, navLabel: l.label || undefined },
        })
      ),
      ...pageLinks.map((l) =>
        prisma.page.update({
          where: { id: l.id },
          data: { showOnNavbar: true, navOrder: l.navOrder, navLabel: l.label || undefined },
        })
      ),
    ]);

    void sectionIds; void pageIds; // used above
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("navbar-links PUT failed:", error);
    return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
  }
}
