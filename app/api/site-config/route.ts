import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/api-middleware';

const SINGLETON_ID = 'singleton';

// Google OAuth / Maps credential columns. Their only legitimate writer is
// PUT /api/settings/google (SUPER_ADMIN, encrypts the secret). Settings > Site Config
// PUTs the whole config it GET-ed, so these are stripped silently rather than 403'd.
const GOOGLE_CREDENTIAL_KEYS = ['googleClientId', 'googleClientSecret', 'googleRedirectUri', 'googleMapsApiKey'];

/**
 * Build the SiteConfig write payload from a request body WITHOUT mutating it.
 * Always drops `id` (`create: { id, ...body }` would otherwise let the body override the
 * singleton id). Callers other than SUPER_ADMIN also lose the Google credential keys.
 * Every other key (incl. homePage) passes through exactly as before; a non-object body is
 * returned untouched so Prisma rejects it the same way it always did.
 * Typed `any` to mirror request.json() — Prisma's upsert input stays as loosely typed as before.
 */
function toWritePayload(body: any, role: string): any {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return body;
  const blocked = new Set<string>(['id', ...(role === 'SUPER_ADMIN' ? [] : GOOGLE_CREDENTIAL_KEYS)]);
  return Object.fromEntries(Object.entries(body).filter(([key]) => !blocked.has(key)));
}

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
    const auth = requireRole(request, 'EDITOR');
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const payload = toWritePayload(body, auth.role);
    const config = await prisma.siteConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...payload },
      update: payload,
    });
    if ('homePage' in body) revalidateTag('homepage-config', 'max');
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Failed to update site config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}

/** PATCH — partial update, used for single-field changes like homePage */
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireRole(request, 'EDITOR');
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const payload = toWritePayload(body, auth.role);
    const config = await prisma.siteConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...payload },
      update: payload,
    });
    if ('homePage' in body) revalidateTag('homepage-config', 'max');
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Failed to patch site config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}
