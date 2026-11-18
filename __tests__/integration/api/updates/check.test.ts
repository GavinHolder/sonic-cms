import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { generateAccessToken } from '@/lib/auth'

// The route imports public/cms-version.json statically, so each scenario swaps the
// mocked module (vi.doMock) and re-imports the route with a fresh module registry.
vi.mock('@/lib/prisma', () => ({
  default: {
    systemSettings: {
      findMany: vi.fn(),
    },
  },
}))

type LocalVersionFile = { version: string; upstreamVersion?: string }

type CheckResponse = {
  localVersion: string
  mergedVersion: string
  upstreamVersion: string | null
  updateAvailable: boolean
  versionGap?: { major: number; minor: number; patch: number }
  largeJump?: boolean
}

const UPSTREAM_URL = 'https://example.com/cms-version.json'

function makeRequest(): NextRequest {
  const token = generateAccessToken({
    userId: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    role: UserRole.SUPER_ADMIN,
  })
  return new NextRequest('http://localhost/api/admin/updates/check', {
    headers: { cookie: `access_token=${token}` },
  })
}

/** Runs the check route against a given local version file and upstream version. */
async function runCheck(local: LocalVersionFile, upstreamVersion: string): Promise<CheckResponse> {
  vi.resetModules()
  vi.doMock('@/public/cms-version.json', () => ({ default: local }))

  const prisma = (await import('@/lib/prisma')).default
  const findMany = prisma.systemSettings.findMany as unknown as ReturnType<typeof vi.fn>
  findMany.mockResolvedValue([{ key: 'cms_upstream_version_url', value: UPSTREAM_URL }])

  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          version: upstreamVersion,
          date: '2026-01-01',
          changelog: { features: [], bugfixes: [], breaking: [] },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ),
  )

  const { GET } = await import('@/app/api/admin/updates/check/route')
  const res = await GET(makeRequest())
  expect(res.status).toBe(200)
  return (await res.json()) as CheckResponse
}

describe('GET /api/admin/updates/check — merged core version vs own version', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.doUnmock('@/public/cms-version.json')
  })

  it('reports no update when upstreamVersion equals the upstream version', async () => {
    const body = await runCheck({ version: '1.75.0', upstreamVersion: '1.72.0' }, '1.72.0')
    expect(body.updateAvailable).toBe(false)
    expect(body.mergedVersion).toBe('1.72.0')
    expect(body.localVersion).toBe('1.75.0')
  })

  it('reports an update when upstream is greater than upstreamVersion', async () => {
    const body = await runCheck({ version: '1.72.0', upstreamVersion: '1.72.0' }, '1.73.0')
    expect(body.updateAvailable).toBe(true)
    expect(body.upstreamVersion).toBe('1.73.0')
    expect(body.versionGap).toMatchObject({ major: 0, minor: 1, patch: 0 })
  })

  it('reports an update when own version is ahead of upstream but upstreamVersion is behind', async () => {
    const body = await runCheck({ version: '1.75.0', upstreamVersion: '1.72.0' }, '1.73.0')
    expect(body.updateAvailable).toBe(true)
    expect(body.mergedVersion).toBe('1.72.0')
    expect(body.localVersion).toBe('1.75.0')
    // Gap is measured from the merged core version, not the own version.
    expect(body.versionGap).toMatchObject({ major: 0, minor: 1, patch: 0 })
    expect(body.largeJump).toBe(false)
  })

  it('falls back to version when upstreamVersion is absent', async () => {
    const behind = await runCheck({ version: '1.72.0' }, '1.73.0')
    expect(behind.updateAvailable).toBe(true)
    expect(behind.mergedVersion).toBe('1.72.0')

    const current = await runCheck({ version: '1.73.0' }, '1.73.0')
    expect(current.updateAvailable).toBe(false)
    expect(current.mergedVersion).toBe('1.73.0')
  })
})
