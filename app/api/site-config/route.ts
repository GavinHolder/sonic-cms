import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const SINGLETON_ID = 'singleton';

export async function GET() {
  try {
    const config = await prisma.siteConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Failed to fetch site config:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config = await prisma.siteConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...body },
      update: body,
    });
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Failed to update site config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}
