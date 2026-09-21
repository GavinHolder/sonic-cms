import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { generateAccessToken } from '@/lib/auth'

// Mock prisma before importing the routes. Every method is a vi.fn() so a test can prove that a
// rejected (401/403) request never touched the database.
vi.mock('@/lib/prisma', () => ({
  default: {
    section: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    page: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    siteConfig: { upsert: vi.fn() },
    user: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// site-config calls revalidateTag when homePage is written; keep it out of Next's request context.
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { POST as sectionsPOST, GET as sectionsGET } from '@/app/api/sections/route'
import { PUT as sectionPUT, DELETE as sectionDELETE } from '@/app/api/sections/[id]/route'
import { PUT as navbarLinksPUT } from '@/app/api/navbar-links/route'
import {
  GET as siteConfigGET,
  PUT as siteConfigPUT,
  PATCH as siteConfigPATCH,
} from '@/app/api/site-config/route'
import { revalidateTag } from 'next/cache'
import prisma from '@/lib/prisma'

type Fn = ReturnType<typeof vi.fn>
type Db = {
  section: Record<string, Fn>
  page: Record<string, Fn>
  siteConfig: { upsert: Fn }
  user: { findFirst: Fn }
  $transaction: Fn
}
const db = prisma as unknown as Db

function allDbMocks(): Fn[] {
  return Object.values(db).flatMap((v) =>
    typeof v === 'function' ? [v as Fn] : Object.values(v as Record<string, Fn>)
  )
}

function expectDbUntouched() {
  for (const fn of allDbMocks()) expect(fn).not.toHaveBeenCalled()
}

// Harmless resolved values so an authorised request can run to completion without a database.
function seedHarmlessDb() {
  db.page.findUnique.mockResolvedValue({ id: 'page-1', slug: '/', createdBy: 'user-1' })
  db.page.findMany.mockResolvedValue([])
  db.page.updateMany.mockResolvedValue({ count: 0 })
  db.section.findUnique.mockResolvedValue({ id: 'sec-1', order: 1 })
  db.section.findFirst.mockResolvedValue(null)
  db.section.findMany.mockResolvedValue([])
  db.section.create.mockResolvedValue({ id: 'sec-new' })
  db.section.update.mockResolvedValue({ id: 'sec-1' })
  db.section.updateMany.mockResolvedValue({ count: 0 })
  db.section.delete.mockResolvedValue({ id: 'sec-1' })
  db.siteConfig.upsert.mockResolvedValue({ id: 'singleton' })
  db.user.findFirst.mockResolvedValue({ id: 'user-1' })
  db.$transaction.mockResolvedValue([])
}

function cookieFor(role: UserRole): string {
  const token = generateAccessToken({
    userId: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    role,
  })
  return `access_token=${token}`
}

interface WriteCase {
  name: string
  method: string
  url: string
  body?: unknown
  call: (req: NextRequest) => Promise<Response>
}

const CASES: WriteCase[] = [
  {
    name: 'POST /api/sections',
    method: 'POST',
    url: 'http://localhost/api/sections',
    body: { pageSlug: '/', type: 'NORMAL', displayName: 'Test', content: {} },
    call: (req) => sectionsPOST(req),
  },
  {
    name: 'PUT /api/sections/[id]',
    method: 'PUT',
    url: 'http://localhost/api/sections/sec-1',
    body: { displayName: 'Renamed' },
    call: (req) => sectionPUT(req, { params: Promise.resolve({ id: 'sec-1' }) }),
  },
  {
    name: 'DELETE /api/sections/[id]',
    method: 'DELETE',
    url: 'http://localhost/api/sections/sec-1',
    call: (req) => sectionDELETE(req, { params: Promise.resolve({ id: 'sec-1' }) }),
  },
  {
    name: 'PUT /api/navbar-links',
    method: 'PUT',
    url: 'http://localhost/api/navbar-links',
    body: { links: [] },
    call: (req) => navbarLinksPUT(req),
  },
  {
    name: 'PUT /api/site-config',
    method: 'PUT',
    url: 'http://localhost/api/site-config',
    body: { tagline: 'Hello' },
    call: (req) => siteConfigPUT(req),
  },
  {
    name: 'PATCH /api/site-config',
    method: 'PATCH',
    url: 'http://localhost/api/site-config',
    body: { tagline: 'Hello' },
    call: (req) => siteConfigPATCH(req),
  },
]

function makeRequest(c: WriteCase, cookie?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (c.body !== undefined) headers['content-type'] = 'application/json'
  if (cookie) headers['cookie'] = cookie
  return new NextRequest(c.url, {
    method: c.method,
    headers,
    body: c.body === undefined ? undefined : JSON.stringify(c.body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  seedHarmlessDb()
})

// ── Guard: 401 / 403 / pass-through, for each of the six handlers ─────────────

describe.each(CASES)('$name', (c) => {
  it('returns 401 with no session cookie and never touches the database', async () => {
    const res = await c.call(makeRequest(c))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
    expectDbUntouched()
  })

  it('returns 401 for a forged / invalid access token and never touches the database', async () => {
    const res = await c.call(makeRequest(c, 'access_token=not.a.jwt'))
    expect(res.status).toBe(401)
    expectDbUntouched()
  })

  it('returns 403 for a VIEWER and never touches the database', async () => {
    const res = await c.call(makeRequest(c, cookieFor(UserRole.VIEWER)))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error.code).toBe('FORBIDDEN')
    expectDbUntouched()
  })

  // Exact success status, not "not 401/403": a 500 would also slip past that weaker check.
  // With the seeded mocks all six handlers answer 200 { success: true }.
  it('lets an EDITOR through to a 200 success response', async () => {
    const res = await c.call(makeRequest(c, cookieFor(UserRole.EDITOR)))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ── Reads that the public site depends on must stay anonymous ────────────────

describe('public reads stay anonymous', () => {
  it('GET /api/sections?pageSlug=/ works without a cookie', async () => {
    const res = await sectionsGET(new NextRequest('http://localhost/api/sections?pageSlug=/'))
    expect(res.status).toBe(200)
  })

  it('GET /api/site-config works without a cookie', async () => {
    const res = await siteConfigGET()
    // TODO(phase2): assert credential fields absent once GET selects public columns
    expect(res.status).toBe(200)
  })
})

// ── site-config: what the database is actually asked to write ────────────────

describe('site-config write payload', () => {
  const HOSTILE_BODY = {
    id: 'evil-id',
    tagline: 'New tagline',
    googleClientId: 'attacker-client-id',
    googleClientSecret: 'attacker-client-secret',
    googleRedirectUri: 'https://evil.example/callback',
    googleMapsApiKey: 'attacker-maps-key',
  }
  const WRITERS = [
    ['PUT', siteConfigPUT],
    ['PATCH', siteConfigPATCH],
  ] as const

  function siteConfigRequest(method: string, body: unknown, role: UserRole): NextRequest {
    return new NextRequest('http://localhost/api/site-config', {
      method,
      headers: { 'content-type': 'application/json', cookie: cookieFor(role) },
      body: JSON.stringify(body),
    })
  }

  const upsertArgs = () => db.siteConfig.upsert.mock.calls[0][0]

  // The Google credential keys are stripped for EVERY role, SUPER_ADMIN included: PUT /api/settings/google
  // is their only writer (it encrypts); a write through site-config would store them in plaintext.
  describe.each([UserRole.EDITOR, UserRole.PUBLISHER, UserRole.SUPER_ADMIN])('as %s', (role) => {
    it.each(WRITERS)('%s drops id and every Google credential key on update AND create', async (method, handler) => {
      const res = await handler(siteConfigRequest(method, HOSTILE_BODY, role))
      expect(res.status).toBe(200)
      expect(db.siteConfig.upsert).toHaveBeenCalledTimes(1)
      expect(upsertArgs().where).toEqual({ id: 'singleton' })
      expect(upsertArgs().update).toEqual({ tagline: 'New tagline' })
      expect(upsertArgs().create).toEqual({ id: 'singleton', tagline: 'New tagline' })
    })

    it.each(WRITERS)('%s keeps homePage writable and revalidates the homepage tag', async (method, handler) => {
      const res = await handler(siteConfigRequest(method, { homePage: 'about', googleClientId: 'x' }, role))
      expect(res.status).toBe(200)
      expect(upsertArgs().update).toEqual({ homePage: 'about' })
      expect(upsertArgs().create).toEqual({ id: 'singleton', homePage: 'about' })
      expect(revalidateTag).toHaveBeenCalledWith('homepage-config', 'max')
    })
  })

  it.each(WRITERS)('%s passes unrelated keys through unchanged', async (method, handler) => {
    const body = { companyName: 'Acme', showRegulatory: true, futureColumn: 7 }
    const res = await handler(siteConfigRequest(method, body, UserRole.EDITOR))
    expect(res.status).toBe(200)
    expect(upsertArgs().update).toEqual(body)
    expect(upsertArgs().create).toEqual({ id: 'singleton', ...body })
  })
})
