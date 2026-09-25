/**
 * Server-side routing for public form submissions (/api/forms/submit).
 *
 * The client used to choose the recipient (`emailTo`) and the outbound `webhookUrl` itself, which
 * made the endpoint an open mail relay and an SSRF primitive. Now a client-supplied value is only
 * honoured when it EXACTLY matches a value an admin configured somewhere in the database:
 *
 *   emailTo    <- Page.formConfig.submitConfig.emailTo (Form pages), any `emailTo` key inside
 *                 Section.content/contentDraft (per-breakpoint designerData included), and
 *                 `data-email-to="..."` attributes in Page.customHtml / section HTML (cms-forms.js embeds)
 *   webhookUrl <- any `webhookUrl` key in the same places (Form pages: submitConfig.webhookUrl)
 *
 * Anything else is IGNORED (never a 4xx, so a legitimate submission is never broken) and the safe
 * default is used: the site admin email / no webhook. A warning is logged for every ignored value.
 * Existing clients keep working unchanged — they already send the exact configured values.
 *
 * INVARIANTS:
 *   1. The recipient of a submission email is either cfg.admin_email or an admin-configured address.
 *   2. The URL passed to the webhook sender is an admin-configured string, byte for byte.
 *
 * KNOWN LIMIT: a `data-email-to` set dynamically by page JavaScript (not present in stored HTML)
 * is not discoverable, so such a form falls back to admin_email (logged, nothing is lost).
 */

import { prisma } from '@/lib/prisma'

export interface ConfiguredRoutes {
  /** lower-cased address -> address exactly as configured */
  emails: Map<string, string>
  /** URL exactly as configured -> itself */
  webhooks: Map<string, string>
}

const DATA_EMAIL_RE = /data-email-to\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi
const MAX_DEPTH = 40

/** Collect every configured recipient/webhook from arbitrary JSON / HTML strings. Pure. */
export function extractConfiguredRoutes(sources: unknown[]): ConfiguredRoutes {
  const emails = new Map<string, string>()
  const webhooks = new Map<string, string>()
  const addEmail = (v: unknown) => {
    if (typeof v !== 'string') return
    const t = v.trim()
    if (t) emails.set(t.toLowerCase(), t)
  }
  const addHook = (v: unknown) => {
    if (typeof v !== 'string') return
    const t = v.trim()
    if (t) webhooks.set(t, t)
  }
  const walk = (v: unknown, depth: number) => {
    if (depth > MAX_DEPTH) return
    if (typeof v === 'string') {
      for (const m of v.matchAll(DATA_EMAIL_RE)) addEmail(m[1] ?? m[2] ?? m[3])
      return
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1)
      return
    }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (k === 'emailTo') addEmail(val)
        else if (k === 'webhookUrl') addHook(val)
        walk(val, depth + 1)
      }
    }
  }
  for (const s of sources) walk(s, 0)
  return { emails, webhooks }
}

/** Load the configured values from the database (Pages + Sections, drafts included). */
export async function loadConfiguredRoutes(): Promise<ConfiguredRoutes> {
  const [pages, sections] = await Promise.all([
    prisma.page.findMany({ select: { formConfig: true, customHtml: true } }),
    prisma.section.findMany({ select: { content: true, contentDraft: true } }),
  ])
  return extractConfiguredRoutes([
    ...pages.map((p) => [p.formConfig, p.customHtml]),
    ...sections.map((s) => [s.content, s.contentDraft]),
  ])
}

export interface SubmissionRouteInput {
  emailTo?: unknown
  webhookUrl?: unknown
  submitAction?: unknown
}

export type SubmissionRoute =
  | { action: 'email'; emailTo?: string; ignored: string[] }
  | { action: 'webhook'; webhookUrl: string; ignored: string[] }
  | { action: 'webhook-missing' }

const hasText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/** Decide what the server will actually do with a submission. Pure. */
export function decideSubmissionRoute(input: SubmissionRouteInput, configured: ConfiguredRoutes): SubmissionRoute {
  const ignored: string[] = []

  if (input.submitAction === 'webhook') {
    if (input.webhookUrl === undefined || input.webhookUrl === null || input.webhookUrl === '') {
      return { action: 'webhook-missing' } // unchanged behaviour: a webhook form with no URL is a 400
    }
    if (hasText(input.webhookUrl)) {
      const hook = configured.webhooks.get(input.webhookUrl.trim())
      if (hook) return { action: 'webhook', webhookUrl: hook, ignored }
    }
    ignored.push('webhookUrl') // supplied but not configured -> safe default (email to the admin)
  }

  let emailTo: string | undefined
  if (input.emailTo !== undefined && input.emailTo !== null && input.emailTo !== '') {
    const known = hasText(input.emailTo) ? configured.emails.get(input.emailTo.trim().toLowerCase()) : undefined
    if (known) emailTo = known
    else ignored.push('emailTo')
  }
  return { action: 'email', emailTo, ignored }
}

/**
 * Resolve the route for a request. The database is only consulted when the client actually
 * supplied a recipient or webhook (the common CTA/contact submission sends neither).
 */
export async function resolveSubmissionRoute(
  input: SubmissionRouteInput,
  load: () => Promise<ConfiguredRoutes> = loadConfiguredRoutes
): Promise<SubmissionRoute> {
  const supplied = (v: unknown) => v !== undefined && v !== null && v !== ''
  const configured = supplied(input.emailTo) || supplied(input.webhookUrl) ? await load() : extractConfiguredRoutes([])
  const route = decideSubmissionRoute(input, configured)
  if (route.action !== 'webhook-missing') {
    for (const key of route.ignored) {
      const raw = String((input as Record<string, unknown>)[key]).replace(/[\r\n]+/g, ' ').slice(0, 80)
      console.warn(`[Form submit] ignored client-supplied ${key} (not configured server-side): ${raw}`)
    }
  }
  return route
}
