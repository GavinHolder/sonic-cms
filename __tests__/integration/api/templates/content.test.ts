import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  default: {
    cmsTemplate: {
      findFirst: vi.fn(),
    },
  },
}))

import { GET } from '@/app/api/templates/[id]/content/route'
import prisma from '@/lib/prisma'

const findFirst = (prisma.cmsTemplate as unknown as { findFirst: ReturnType<typeof vi.fn> }).findFirst

function call(id: string) {
  return GET(new NextRequest(`http://localhost/api/templates/${id}/content`), {
    params: Promise.resolve({ id }),
  })
}

describe('GET /api/templates/[id]/content (public)', () => {
  beforeEach(() => {
    findFirst.mockReset()
  })

  it('only looks up templates of type "block"', async () => {
    findFirst.mockResolvedValue(null)
    await call('abc')
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(findFirst.mock.calls[0][0].where).toEqual({ id: 'abc', templateType: 'block' })
  })

  it('returns 404 when the id is missing or not a block template', async () => {
    findFirst.mockResolvedValue(null)
    const res = await call('standalone-or-missing')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  it('returns renderable content with a short Cache-Control for a block template', async () => {
    findFirst.mockResolvedValue({
      data: { customHtml: '<p>hi</p>', customCss: 'p{color:red}', mediaSlots: { a: '/x.png' }, secret: 'nope' },
    })
    const res = await call('blk-1')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=30, stale-while-revalidate=60')
    expect(await res.json()).toEqual({
      customHtml: '<p>hi</p>',
      customCss: 'p{color:red}',
      mediaSlots: { a: '/x.png' },
    })
  })

  it('coerces malformed data fields to safe defaults', async () => {
    findFirst.mockResolvedValue({ data: { customHtml: 5, customCss: null, mediaSlots: 'x' } })
    const res = await call('blk-2')
    expect(await res.json()).toEqual({ customHtml: '', customCss: '', mediaSlots: {} })
  })
})
