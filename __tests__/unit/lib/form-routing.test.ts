import { describe, it, expect, vi } from 'vitest'

// form-routing.ts imports the prisma singleton at module scope (for loadConfiguredRoutes); none of
// these tests exercise the real DB (resolveSubmissionRoute takes an injected `load` everywhere
// here), so a minimal mock is enough to satisfy the import.
vi.mock('@/lib/prisma', () => {
  const prisma = { page: { findMany: vi.fn(async () => []) }, section: { findMany: vi.fn(async () => []) } }
  return { prisma, default: prisma }
})

import {
  extractConfiguredRoutes,
  decideSubmissionRoute,
  resolveSubmissionRoute,
  type ConfiguredRoutes,
} from '@/lib/form-routing'

describe('extractConfiguredRoutes', () => {
  it('finds emailTo/webhookUrl nested anywhere in arbitrary JSON (Page.formConfig shape)', () => {
    const formConfig = {
      fields: [{ label: 'Name', name: 'name' }],
      submitAction: 'email',
      submitConfig: { emailTo: 'Admin@Example.com', successMessage: 'Thanks!' },
    }
    const routes = extractConfiguredRoutes([formConfig])
    expect(routes.emails.get('admin@example.com')).toBe('Admin@Example.com')
  })

  it('finds a webhookUrl nested in submitConfig', () => {
    const formConfig = { submitAction: 'webhook', submitConfig: { webhookUrl: 'https://hooks.example.com/x' } }
    const routes = extractConfiguredRoutes([formConfig])
    expect(routes.webhooks.get('https://hooks.example.com/x')).toBe('https://hooks.example.com/x')
  })

  it('finds emailTo/webhookUrl inside per-breakpoint designerData (Section.content shape)', () => {
    const content = {
      breakpoints: {
        desktop: { blocks: [{ type: 'card', props: { emailTo: 'sales@example.com' } }] },
        mobile: { blocks: [{ type: 'card', props: { webhookUrl: 'https://hooks.example.com/mobile' } }] },
      },
    }
    const routes = extractConfiguredRoutes([content])
    expect(routes.emails.get('sales@example.com')).toBe('sales@example.com')
    expect(routes.webhooks.get('https://hooks.example.com/mobile')).toBe('https://hooks.example.com/mobile')
  })

  it('extracts data-email-to="..." from raw HTML strings (customHtml / cms-forms.js embeds)', () => {
    const html = `<form data-cms-form data-source="Contact Us" data-email-to="contact@example.com"></form>`
    const routes = extractConfiguredRoutes([html])
    expect(routes.emails.get('contact@example.com')).toBe('contact@example.com')
  })

  it("extracts data-email-to with single quotes and unquoted values", () => {
    const html1 = `<form data-email-to='single@example.com'></form>`
    const html2 = `<form data-email-to=unquoted@example.com></form>`
    expect(extractConfiguredRoutes([html1]).emails.get('single@example.com')).toBe('single@example.com')
    expect(extractConfiguredRoutes([html2]).emails.get('unquoted@example.com')).toBe('unquoted@example.com')
  })

  it('ignores null/undefined/non-string values without throwing', () => {
    expect(() => extractConfiguredRoutes([null, undefined, 42, true, { emailTo: null }, { webhookUrl: 5 }])).not.toThrow()
    const routes = extractConfiguredRoutes([null, undefined])
    expect(routes.emails.size).toBe(0)
    expect(routes.webhooks.size).toBe(0)
  })

  it('does not blow the stack on deeply nested or self-referential-looking structures', () => {
    let deep: unknown = { emailTo: 'deep@example.com' }
    for (let i = 0; i < 100; i++) deep = { child: deep }
    expect(() => extractConfiguredRoutes([deep])).not.toThrow()
  })

  it('trims whitespace and treats blank strings as absent', () => {
    const routes = extractConfiguredRoutes([{ emailTo: '   ', webhookUrl: '  ' }, { emailTo: '  spaced@example.com  ' }])
    expect(routes.emails.has('')).toBe(false)
    expect(routes.emails.get('spaced@example.com')).toBe('spaced@example.com')
  })
})

describe('decideSubmissionRoute', () => {
  const configured: ConfiguredRoutes = {
    emails: new Map([['admin@example.com', 'Admin@Example.com']]),
    webhooks: new Map([['https://hooks.example.com/real', 'https://hooks.example.com/real']]),
  }

  it('honours a configured emailTo (case-insensitive match), returning the admin-typed casing', () => {
    const route = decideSubmissionRoute({ emailTo: 'admin@EXAMPLE.com' }, configured)
    expect(route).toEqual({ action: 'email', emailTo: 'Admin@Example.com', ignored: [] })
  })

  it('ignores a forged emailTo not present in the configured set, falling back to no override', () => {
    const route = decideSubmissionRoute({ emailTo: 'attacker@evil.com' }, configured)
    expect(route.action).toBe('email')
    expect((route as { emailTo?: string }).emailTo).toBeUndefined()
    expect(route.ignored).toEqual(['emailTo'])
  })

  it('treats an absent emailTo as the plain default-email route (nothing ignored)', () => {
    const route = decideSubmissionRoute({}, configured)
    expect(route).toEqual({ action: 'email', emailTo: undefined, ignored: [] })
  })

  it('honours a configured webhookUrl when submitAction is webhook', () => {
    const route = decideSubmissionRoute(
      { submitAction: 'webhook', webhookUrl: 'https://hooks.example.com/real' },
      configured
    )
    expect(route).toEqual({ action: 'webhook', webhookUrl: 'https://hooks.example.com/real', ignored: [] })
  })

  it('ignores a forged webhookUrl and falls back to the email route', () => {
    const route = decideSubmissionRoute(
      { submitAction: 'webhook', webhookUrl: 'https://attacker.example/steal', emailTo: 'attacker@evil.com' },
      configured
    )
    expect(route.action).toBe('email')
    expect(route.ignored).toEqual(expect.arrayContaining(['webhookUrl', 'emailTo']))
  })

  it('returns webhook-missing (400, unchanged behaviour) when submitAction is webhook with no URL at all', () => {
    expect(decideSubmissionRoute({ submitAction: 'webhook' }, configured)).toEqual({ action: 'webhook-missing' })
    expect(decideSubmissionRoute({ submitAction: 'webhook', webhookUrl: '' }, configured)).toEqual({
      action: 'webhook-missing',
    })
  })

  it('a webhookUrl is irrelevant when submitAction is not "webhook" (default email path ignores it)', () => {
    const route = decideSubmissionRoute({ webhookUrl: 'https://attacker.example/steal' }, configured)
    expect(route.action).toBe('email')
    expect(route.ignored).not.toContain('webhookUrl')
  })
})

describe('resolveSubmissionRoute', () => {
  it('does not touch the database when neither emailTo nor webhookUrl is supplied (the common case)', async () => {
    const load = vi.fn(async () => ({ emails: new Map(), webhooks: new Map() }))
    const route = await resolveSubmissionRoute({ fields: [] } as never, load)
    expect(load).not.toHaveBeenCalled()
    expect(route.action).toBe('email')
  })

  it('loads the database when emailTo is supplied, and honours a match', async () => {
    const load = vi.fn(async () => ({
      emails: new Map([['boss@example.com', 'boss@example.com']]),
      webhooks: new Map(),
    }))
    const route = await resolveSubmissionRoute({ emailTo: 'boss@example.com' }, load)
    expect(load).toHaveBeenCalledTimes(1)
    expect(route).toEqual({ action: 'email', emailTo: 'boss@example.com', ignored: [] })
  })

  it('loads the database when webhookUrl is supplied and ignores a forged one, logging a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const load = vi.fn(async () => ({ emails: new Map(), webhooks: new Map() }))
    const route = await resolveSubmissionRoute({ submitAction: 'webhook', webhookUrl: 'https://127.0.0.1/hook' }, load)
    expect(load).toHaveBeenCalledTimes(1)
    expect(route.action).toBe('email')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ignored client-supplied webhookUrl'))
    warn.mockRestore()
  })
})
