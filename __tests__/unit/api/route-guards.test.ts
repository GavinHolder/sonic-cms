import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanRoutes, BASELINE_ALLOWLIST } from '../../../scripts/check-route-guards.mjs'

// Default-deny regression test: every exported POST/PUT/PATCH/DELETE handler under app/
// must start with a recognized auth guard, or be a reviewed entry in BASELINE_ALLOWLIST.
// The recognizer itself lives in scripts/check-route-guards.mjs (single copy of the logic,
// also runnable as `node scripts/check-route-guards.mjs`).

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const cliPath = path.join(repoRoot, 'scripts', 'check-route-guards.mjs')

// ── Real tree ────────────────────────────────────────────────────────────────

describe('route guard scan — real app/ tree', () => {
  const result = scanRoutes(repoRoot)

  it('scans a non-trivial number of handlers (guards against a vacuous pass)', () => {
    expect(result.files).toBeGreaterThan(50)
    expect(result.handlers.length).toBeGreaterThan(50)
    expect(result.guarded.length).toBeGreaterThan(50)
  })

  it('has no unguarded mutating handler outside the reviewed allowlist', () => {
    const report = result.violations.map((v: { key: string; reason?: string }) => `${v.key} — ${v.reason}`).join('\n')
    expect(result.violations, `Unguarded mutating handlers:\n${report}`).toEqual([])
  })

  it('reports stale allowlist entries as warnings only', () => {
    for (const s of result.stale as { key: string; why: string }[]) {
      console.warn(`[route-guards] stale allowlist entry ${s.key}: ${s.why}`)
    }
    expect(Array.isArray(result.stale)).toBe(true)
  })

  it('keeps a written reason on every allowlist entry', () => {
    for (const [key, reason] of Object.entries(BASELINE_ALLOWLIST)) {
      expect(key).toMatch(/^app\/.+\/route\.(ts|tsx|js|jsx|mts|mjs)#(POST|PUT|PATCH|DELETE)$/)
      expect(String(reason).trim().length).toBeGreaterThan(10)
    }
  })

  it.each([
    'app/api/sections/route.ts#POST',
    'app/api/sections/[id]/route.ts#PUT',
    'app/api/sections/[id]/route.ts#DELETE',
    'app/api/navbar-links/route.ts#PUT',
    'app/api/site-config/route.ts#PUT',
    'app/api/site-config/route.ts#PATCH',
  ])('%s is genuinely guarded (not merely allowlisted)', (key) => {
    const h = result.handlers.find((x: { key: string }) => x.key === key)
    expect(h?.status).toBe('guarded')
  })
})

// ── Recognizer behaviour on synthetic fixtures ───────────────────────────────

const PREAMBLE = [
  "import { NextRequest, NextResponse } from 'next/server'",
  "import { requireRole, requireAuth } from '@/lib/api-middleware'",
  "import prisma from '@/lib/prisma'",
  '',
].join('\n')

type Expectation = 'guarded' | 'violation' | 'allowlisted'

interface Fixture {
  dir: string
  file?: string // default route.ts
  source: string
  expect: Record<string, Expectation> // METHOD (or "*"/"default") -> status
  reason?: RegExp // optional check on the reason of the FIRST expectation
}

const FIXTURES: Fixture[] = [
  {
    dir: 'guarded-try',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, 'EDITOR')
    if (auth instanceof NextResponse) return auth
    const body = await request.json()
    await prisma.thing.create({ data: body })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
`,
    expect: { POST: 'guarded' },
  },
  {
    dir: 'guarded-toplevel',
    source:
      PREAMBLE +
      `export async function PUT(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth
  await prisma.thing.update({ where: { id: '1' }, data: await request.json() })
  return NextResponse.json({ ok: true })
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) { return auth }
  await prisma.thing.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
`,
    expect: { PUT: 'guarded', DELETE: 'guarded' },
  },
  {
    dir: 'guarded-volt',
    source:
      "import { NextRequest, NextResponse } from 'next/server'\n" +
      "import { resolveVolt3DUser } from '@/lib/volt-3d-auth'\n" +
      "import prisma from '@/lib/prisma'\n" +
      `export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const auth = await resolveVolt3DUser(request)
    if (auth instanceof NextResponse) return auth
    await prisma.volt3DAsset.findUnique({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({}, { status: 500 }) }
}
`,
    expect: { POST: 'guarded' },
  },
  {
    dir: 'guarded-crlf',
    source: (
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, 'EDITOR')
    if (auth instanceof NextResponse) return auth
    return NextResponse.json({ body: await request.json() })
  } catch { return NextResponse.json({}, { status: 500 }) }
}
`
    ).replace(/\n/g, '\r\n'),
    expect: { POST: 'guarded' },
  },
  {
    dir: 'unguarded',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const body = await request.json()
  await prisma.thing.create({ data: body })
  return NextResponse.json({ ok: true })
}
export async function GET() {
  return NextResponse.json({ ok: true })
}
`,
    expect: { POST: 'violation' }, // GET is out of scope and must not be listed
    reason: /no requireRole/,
  },
  {
    dir: 'get-only',
    source: PREAMBLE + `export async function GET() { return NextResponse.json({ ok: true }) }\n`,
    expect: {},
  },
  {
    dir: 'json-before-guard',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const auth = requireRole(request, 'EDITOR')
    if (auth instanceof NextResponse) return auth
    return NextResponse.json({ body })
  } catch { return NextResponse.json({}, { status: 500 }) }
}
`,
    expect: { POST: 'violation' },
    reason: /request body read/,
  },
  {
    dir: 'prisma-before-guard',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const n = await prisma.thing.count()
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ n })
}
`,
    expect: { POST: 'violation' },
    reason: /prisma/,
  },
  {
    dir: 'body-before-try',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const body = await request.json()
  try {
    const auth = requireRole(request, 'EDITOR')
    if (auth instanceof NextResponse) return auth
    return NextResponse.json({ body })
  } catch { return NextResponse.json({}, { status: 500 }) }
}
`,
    expect: { POST: 'violation' },
  },
  {
    dir: 'early-return',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  if (request.headers.get('x-internal')) return handleInternal(request)
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ ok: true })
}
declare function handleInternal(r: NextRequest): Response
`,
    expect: { POST: 'violation' },
    reason: /early return/,
  },
  {
    dir: 'inverted',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const e = await requireRole(request, 'EDITOR'); if (e) return e;
  return NextResponse.json({ ok: true, body: await request.json() })
}
`,
    expect: { POST: 'violation' },
    reason: /not followed by/,
  },
  {
    dir: 'conditional',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const isCron = request.headers.get('authorization') === 'Bearer x'
  if (!isCron) {
    const auth = requireRole(request, 'EDITOR')
    if (auth instanceof NextResponse) return auth
  }
  return NextResponse.json({ ok: true })
}
`,
    expect: { POST: 'violation' },
    reason: /nested or conditional/,
  },
  {
    dir: 'ignored-result',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  requireRole(request, 'EDITOR')
  return NextResponse.json({ ok: true, body: await request.json() })
}
`,
    expect: { POST: 'violation' },
    reason: /ignored/,
  },
  {
    dir: 'unchecked-result',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  return NextResponse.json({ ok: true, user: auth, body: await request.json() })
}
`,
    expect: { POST: 'violation' },
    reason: /not followed by/,
  },
  {
    dir: 'wrong-check',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof Error) return auth
  return NextResponse.json({ ok: true })
}
export async function PUT(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return NextResponse.json({ nope: true })
  return NextResponse.json({ ok: true })
}
export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  if (!auth) return NextResponse.json({ nope: true }, { status: 401 })
  return NextResponse.json({ ok: true })
}
`,
    expect: { POST: 'violation', PUT: 'violation', PATCH: 'violation' },
  },
  {
    dir: 'let-and-destructured',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  let auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ ok: true })
}
export async function PUT(request: NextRequest) {
  const { userId } = requireRole(request, 'EDITOR') as { userId: string }
  return NextResponse.json({ userId })
}
`,
    expect: { POST: 'violation', PUT: 'violation' },
    reason: /single `const` identifier/, // `let auth = requireRole(...)` must say "const", not "nested"
  },
  {
    dir: 'params-before-guard',
    source:
      PREAMBLE +
      `export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ id })
}
export async function PATCH(request: NextRequest, { params: routeParams }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await routeParams
    const auth = requireRole(request, 'EDITOR')
    if (auth instanceof NextResponse) return auth
    return NextResponse.json({ id })
  } catch { return NextResponse.json({}, { status: 500 }) }
}
export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ id })
}
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth
  return NextResponse.json({ rawId })
}
`,
    expect: { PUT: 'guarded', PATCH: 'guarded', DELETE: 'guarded', POST: 'guarded' },
  },
  {
    dir: 'await-before-guard',
    source:
      PREAMBLE +
      `declare function getSession(): Promise<unknown>
declare function cookies(): { get(name: string): unknown }
declare function lookup(id: string): Promise<unknown>
export async function POST(request: NextRequest) {
  const session = await getSession()
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ session })
}
export async function PUT(request: NextRequest) {
  const token = cookies().get('access_token')
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ token })
}
export async function PATCH(request: NextRequest) {
  const url = new URL(request.url)
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ url: url.pathname })
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const extra = await lookup(id)
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ extra })
}
`,
    expect: { POST: 'violation', PUT: 'violation', PATCH: 'violation', DELETE: 'violation' },
    reason: /guard runs after an await\/call that is not a route-params read/,
  },
  {
    dir: 'foreign-params-before-guard',
    source:
      PREAMBLE +
      `declare const other: { params: Promise<{ id: string }> }
declare function compute(): string
declare function stash(p: unknown): Promise<{ id: string }>
export async function POST(request: NextRequest) {
  const { id } = await other.params
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ id })
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id = compute() } = await params
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ id })
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await stash(await params)
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ id })
}
`,
    expect: { POST: 'violation', PUT: 'violation', PATCH: 'violation' },
    reason: /guard runs after an await\/call/,
  },
  {
    dir: 'syntax-error',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  const broken =
}
`,
    // exactly ONE per-file violation (not a "guarded" POST recovered from a broken AST)
    expect: { 'SYNTAX-ERROR': 'violation' },
    reason: /syntax error/,
  },
  {
    dir: 'comment-and-string-tricks',
    source:
      PREAMBLE +
      `// const auth = requireRole(request, 'EDITOR'); if (auth instanceof NextResponse) return auth
/* requireRole(request, 'EDITOR') */
export async function POST(request: NextRequest) {
  const note = "const auth = requireRole(request, 'EDITOR'); if (auth instanceof NextResponse) return auth"
  const body = await request.json()
  return NextResponse.json({ note, body })
}
`,
    expect: { POST: 'violation' },
  },
  {
    dir: 'shadowed-guard',
    source:
      "import { NextRequest, NextResponse } from 'next/server'\n" +
      "import { requireRole } from './my-own-auth'\n" +
      `export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ ok: true })
}
function requireAuth(_r: NextRequest): NextResponse | null { return null }
export async function PUT(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ ok: true })
}
`,
    expect: { POST: 'violation', PUT: 'violation' },
  },
  {
    dir: 'two-tries',
    source:
      PREAMBLE +
      `export async function POST(request: NextRequest) {
  try { await prisma.a.count() } catch {}
  try {
    const auth = requireRole(request, 'EDITOR')
    if (auth instanceof NextResponse) return auth
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({}, { status: 500 }) }
}
`,
    expect: { POST: 'violation' },
  },
  {
    dir: 'export-const',
    source:
      PREAMBLE +
      `export const POST = async (request: NextRequest) => {
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ ok: true })
}
export const PUT = wrap(async () => NextResponse.json({ ok: true }))
declare function wrap(fn: () => Promise<Response>): (r: NextRequest) => Promise<Response>
`,
    expect: { POST: 'violation', PUT: 'violation' },
    reason: /unrecognized export form/,
  },
  {
    dir: 'export-alias',
    source:
      PREAMBLE +
      `async function handler(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ ok: true })
}
export { handler as DELETE }
export { PATCH } from './impl'
`,
    expect: { DELETE: 'violation', PATCH: 'violation' },
    reason: /unrecognized export form/,
  },
  {
    dir: 'export-star',
    source: `export * from './impl'\n`,
    expect: { '*': 'violation' },
    reason: /unrecognized export form/,
  },
  {
    dir: 'export-default',
    source: PREAMBLE + `export default async function POST(request: NextRequest) { return NextResponse.json({}) }\n`,
    expect: { default: 'violation' },
    reason: /unrecognized export form/,
  },
  {
    dir: 'plain-js',
    file: 'route.js',
    source: `export async function POST(request) {\n  return Response.json({ body: await request.json() })\n}\n`,
    expect: { POST: 'violation' },
  },
]

describe('route guard scan — recognizer on synthetic fixtures', () => {
  let tmp: string
  let result: ReturnType<typeof scanRoutes>

  const keyFor = (f: Fixture, method: string) => `app/api/${f.dir}/${f.file ?? 'route.ts'}#${method}`
  const find = (key: string) => result.handlers.find((h: { key: string }) => h.key === key)

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'route-guards-'))
    for (const f of FIXTURES) {
      const dir = path.join(tmp, 'app', 'api', f.dir)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, f.file ?? 'route.ts'), f.source, 'utf8')
    }
    result = scanRoutes(tmp, { allowlist: {} })
  })

  afterAll(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  })

  it.each(FIXTURES.map((f) => [f.dir, f] as const))('%s', (_name, f) => {
    for (const [method, status] of Object.entries(f.expect)) {
      const h = find(keyFor(f, method))
      expect(h, `handler ${keyFor(f, method)} not found`).toBeDefined()
      expect(h?.status).toBe(status)
    }
    // no handler beyond the expected ones may be reported for this fixture
    const listed = result.handlers.filter((h: { file: string }) => h.file.startsWith(`app/api/${f.dir}/`))
    expect(listed).toHaveLength(Object.keys(f.expect).length)
    if (f.reason) {
      const first = find(keyFor(f, Object.keys(f.expect)[0]))
      expect(first?.reason).toMatch(f.reason)
    }
  })

  it('applies the allowlist, and only warns (never fails) for stale entries', () => {
    const list = {
      'app/api/unguarded/route.ts#POST': 'reviewed: public form',
      'app/api/guarded-try/route.ts#POST': 'no longer needed',
      'app/api/does-not-exist/route.ts#POST': 'handler was deleted',
    }
    const r = scanRoutes(tmp, { allowlist: list })
    const allowed = r.handlers.find((h: { key: string }) => h.key === 'app/api/unguarded/route.ts#POST')
    expect(allowed?.status).toBe('allowlisted')
    expect(allowed?.reason).toBe('reviewed: public form')
    expect(r.violations.some((v: { key: string }) => v.key === 'app/api/unguarded/route.ts#POST')).toBe(false)
    expect(r.stale.map((s: { key: string }) => s.key).sort()).toEqual([
      'app/api/does-not-exist/route.ts#POST',
      'app/api/guarded-try/route.ts#POST',
    ])
    // an allowlist entry never downgrades a guarded handler
    expect(r.handlers.find((h: { key: string }) => h.key === 'app/api/guarded-try/route.ts#POST')?.status).toBe('guarded')
  })

})

// ── Empty / unreadable roots must fail loudly, never pass vacuously ─────────

describe('route guard scan — empty or unreadable roots', () => {
  const made: string[] = []
  const tmpRoot = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-guards-root-'))
    made.push(dir)
    return dir
  }
  const cli = (root: string) => spawnSync(process.execPath, [cliPath, root], { encoding: 'utf8' })
  const guardedRoute = `import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-middleware'
export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'EDITOR')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ ok: true })
}
`

  afterAll(() => {
    for (const dir of made) fs.rmSync(dir, { recursive: true, force: true })
  })

  it('throws, naming the path, when the app/ directory is missing', () => {
    expect(() => scanRoutes(tmpRoot(), { allowlist: {} })).toThrow(/cannot read directory .*app/)
  })

  it('throws, naming the path, when app is a file instead of a directory', () => {
    const root = tmpRoot()
    fs.writeFileSync(path.join(root, 'app'), 'not a directory', 'utf8')
    expect(() => scanRoutes(root, { allowlist: {} })).toThrow(/cannot read directory .*app/)
  })

  it('reports zero files for an app/ tree with no route files (callers must treat that as failure)', () => {
    const root = tmpRoot()
    fs.mkdirSync(path.join(root, 'app', 'api', 'empty'), { recursive: true })
    const r = scanRoutes(root, { allowlist: {} })
    expect(r.files).toBe(0)
    expect(r.handlers).toEqual([])
  })

  it('CLI exits non-zero when no route files are found', () => {
    const root = tmpRoot()
    fs.mkdirSync(path.join(root, 'app', 'api'), { recursive: true })
    const res = cli(root)
    expect(res.status).toBe(1)
    expect(res.stderr).toMatch(/no route files found/)
    expect(res.stdout).not.toMatch(/PASS/)
  })

  it('CLI exits non-zero when the app directory cannot be read', () => {
    const res = cli(tmpRoot())
    expect(res.status).toBe(1)
    expect(res.stderr).toMatch(/cannot read directory/)
    expect(res.stdout).not.toMatch(/PASS/)
  })

  it('CLI exits non-zero on an unguarded mutating handler', () => {
    const root = tmpRoot()
    const dir = path.join(root, 'app', 'api', 'open')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'route.ts'), `export async function POST(request: Request) { return Response.json(await request.json()) }\n`, 'utf8')
    const res = cli(root)
    expect(res.status).toBe(1)
    expect(res.stdout).toMatch(/1 VIOLATIONS/)
  })

  it('CLI exits zero on a fully guarded tree (so the exit code is not always 1)', () => {
    const root = tmpRoot()
    const dir = path.join(root, 'app', 'api', 'ok')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'route.ts'), guardedRoute, 'utf8')
    const res = cli(root)
    expect(res.status).toBe(0)
    expect(res.stdout).toMatch(/PASS/)
  })
})
