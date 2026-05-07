import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/** Auto-create the landing page if it has been wiped (e.g. after a clean-slate reset) */
async function ensureLandingPage(slug: string) {
  if (slug !== '/') return null;
  const existing = await prisma.page.findUnique({ where: { slug: '/' } });
  if (existing) return existing;
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) return null;
  return prisma.page.create({
    data: {
      slug: '/',
      title: 'Home',
      type: 'LANDING',
      status: 'PUBLISHED',
      createdBy: admin.id,
      publishedAt: new Date(),
    },
  });
}

/**
 * GET /api/sections?pageSlug=home
 * List all sections for a page
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageSlug = searchParams.get('pageSlug') || '/';

    // Find the page — auto-create landing page if missing
    let page = await prisma.page.findUnique({
      where: { slug: pageSlug },
    });

    if (!page) {
      page = await ensureLandingPage(pageSlug);
    }

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Get all sections for this page
    const sections = await prisma.section.findMany({
      where: { pageId: page.id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Failed to fetch sections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sections
 * Create a new section
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageSlug = '/', type, displayName, content, ...rest } = body;

    // Find the page — auto-create landing page if missing
    let page = await prisma.page.findUnique({
      where: { slug: pageSlug },
    });

    if (!page) {
      page = await ensureLandingPage(pageSlug);
    }

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Determine order for the new section.
    // HERO → always 0.
    // FOOTER → always after everything else.
    // Movable (NORMAL/CTA/FLEXIBLE/etc.) → insert just before the footer by
    // bumping the footer's order up first, so the new section lands in its place.
    let newOrder: number;

    if (type === 'HERO') {
      newOrder = 0;
    } else if (type === 'FOOTER') {
      // Footer goes after everything
      const lastSection = await prisma.section.findFirst({
        where: { pageId: page.id },
        orderBy: { order: 'desc' },
      });
      newOrder = lastSection ? lastSection.order + 1 : 0;
    } else {
      // Movable section: always insert just before the footer
      const footerSection = await prisma.section.findFirst({
        where: { pageId: page.id, type: 'FOOTER' },
      });

      if (footerSection) {
        // Bump the footer's order up by 1, then take its old slot
        await prisma.section.update({
          where: { id: footerSection.id },
          data: { order: footerSection.order + 1 },
        });
        newOrder = footerSection.order;
      } else {
        // No footer yet — just go after the last section
        const lastSection = await prisma.section.findFirst({
          where: { pageId: page.id },
          orderBy: { order: 'desc' },
        });
        newOrder = lastSection ? lastSection.order + 1 : 0;
      }
    }

    // Create the section
    const section = await prisma.section.create({
      data: {
        pageId: page.id,
        type,
        displayName,
        content: content || {},
        order: newOrder,
        enabled: true,
        paddingTop: rest.paddingTop ?? 80,
        paddingBottom: rest.paddingBottom ?? 80,
        paddingTopMobile: rest.paddingTopMobile ?? undefined,
        paddingBottomMobile: rest.paddingBottomMobile ?? undefined,
        background: rest.background ?? 'white',
        banner: rest.banner ?? undefined,
        // Background image fields
        bgImageUrl: rest.bgImageUrl ?? undefined,
        bgImageSize: rest.bgImageSize ?? undefined,
        bgImagePosition: rest.bgImagePosition ?? undefined,
        bgImageRepeat: rest.bgImageRepeat ?? undefined,
        bgImageOpacity: rest.bgImageOpacity ?? undefined,
        bgParallax: rest.bgParallax ?? undefined,
        // Triangle / section-intro fields
        triangleEnabled: rest.triangleEnabled ?? undefined,
        triangleShape: rest.triangleShape ?? undefined,
        triangleHeight: rest.triangleHeight ?? undefined,
        triangleColor1: rest.triangleColor1 ?? undefined,
        triangleColor2: rest.triangleColor2 ?? undefined,
        // Hover text fields
        hoverTextEnabled: rest.hoverTextEnabled ?? undefined,
        hoverText: rest.hoverText ?? undefined,
        // Lower third & motion elements
        lowerThird: rest.lowerThird ?? undefined,
        motionElements: rest.motionElements ?? undefined,
        createdBy: page.createdBy,
      },
    });

    return NextResponse.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Failed to create section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
