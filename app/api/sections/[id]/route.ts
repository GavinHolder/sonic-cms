import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

// Safely convert a JSON body value to a Prisma-safe Json value.
// null → Prisma.DbNull (SQL NULL); anything else passes through.
function toJsonField(v: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue);
}

/**
 * GET /api/sections/[id]
 * Get a single section by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        elements: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Failed to fetch section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch section' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sections/[id]
 * Update a section
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id },
    });

    if (!existingSection) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }

    // Update section - include all schema fields
    const section = await prisma.section.update({
      where: { id },
      data: {
        ...(body.type && { type: body.type }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.navLabel !== undefined && { navLabel: body.navLabel }),
        ...(body.paddingTop !== undefined && { paddingTop: body.paddingTop }),
        ...(body.paddingBottom !== undefined && { paddingBottom: body.paddingBottom }),
        ...(body.background !== undefined && { background: body.background }),
        ...(body.banner !== undefined && { banner: body.banner }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.contentDraft !== undefined && { contentDraft: body.contentDraft }),
        // Triangle overlay configuration
        ...(body.triangleEnabled !== undefined && { triangleEnabled: body.triangleEnabled }),
        ...(body.triangleSide !== undefined && { triangleSide: body.triangleSide }),
        ...(body.triangleShape !== undefined && { triangleShape: body.triangleShape }),
        ...(body.triangleHeight !== undefined && { triangleHeight: body.triangleHeight }),
        ...(body.triangleTargetId !== undefined && { triangleTargetId: body.triangleTargetId }),
        // Triangle styling
        ...(body.triangleGradientType !== undefined && { triangleGradientType: body.triangleGradientType }),
        ...(body.triangleColor1 !== undefined && { triangleColor1: body.triangleColor1 }),
        ...(body.triangleColor2 !== undefined && { triangleColor2: body.triangleColor2 }),
        ...(body.triangleAlpha1 !== undefined && { triangleAlpha1: body.triangleAlpha1 }),
        ...(body.triangleAlpha2 !== undefined && { triangleAlpha2: body.triangleAlpha2 }),
        ...(body.triangleAngle !== undefined && { triangleAngle: body.triangleAngle }),
        // Triangle image
        ...(body.triangleImageUrl !== undefined && { triangleImageUrl: body.triangleImageUrl }),
        ...(body.triangleImageSize !== undefined && { triangleImageSize: body.triangleImageSize }),
        ...(body.triangleImagePos !== undefined && { triangleImagePos: body.triangleImagePos }),
        ...(body.triangleImageOpacity !== undefined && { triangleImageOpacity: body.triangleImageOpacity }),
        // Hover text configuration
        ...(body.hoverTextEnabled !== undefined && { hoverTextEnabled: body.hoverTextEnabled }),
        ...(body.hoverText !== undefined && { hoverText: body.hoverText }),
        ...(body.hoverTextStyle !== undefined && { hoverTextStyle: body.hoverTextStyle }),
        ...(body.hoverFontSize !== undefined && { hoverFontSize: body.hoverFontSize }),
        ...(body.hoverFontFamily !== undefined && { hoverFontFamily: body.hoverFontFamily }),
        ...(body.hoverAnimationType !== undefined && { hoverAnimationType: body.hoverAnimationType }),
        ...(body.hoverAnimateBehind !== undefined && { hoverAnimateBehind: body.hoverAnimateBehind }),
        ...(body.hoverAlwaysShow !== undefined && { hoverAlwaysShow: body.hoverAlwaysShow }),
        ...(body.hoverOffsetX !== undefined && { hoverOffsetX: body.hoverOffsetX }),
        // Background image configuration
        ...(body.bgImageUrl !== undefined && { bgImageUrl: body.bgImageUrl }),
        ...(body.bgImageSize !== undefined && { bgImageSize: body.bgImageSize }),
        ...(body.bgImagePosition !== undefined && { bgImagePosition: body.bgImagePosition }),
        ...(body.bgImageRepeat !== undefined && { bgImageRepeat: body.bgImageRepeat }),
        ...(body.bgImageOpacity !== undefined && { bgImageOpacity: body.bgImageOpacity }),
        ...(body.bgParallax !== undefined && { bgParallax: body.bgParallax }),
        // Lower third and motion elements — use toJsonField() so empty arrays
        // and explicit nulls are stored correctly (raw JS null breaks Prisma Json?)
        ...(body.lowerThird !== undefined && { lowerThird: toJsonField(body.lowerThird) }),
        ...(body.motionElements !== undefined && { motionElements: toJsonField(body.motionElements) }),
      },
    });

    return NextResponse.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Failed to update section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sections/[id]
 * Delete a section
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if section exists
    const section = await prisma.section.findUnique({
      where: { id },
    });

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }

    // Delete section (elements will cascade delete)
    await prisma.section.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully',
      data: { id },
    });
  } catch (error) {
    console.error('Failed to delete section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
