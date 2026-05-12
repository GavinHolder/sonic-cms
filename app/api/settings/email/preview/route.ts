import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-middleware'
import { getBrandTokens } from '@/lib/brand-tokens'
import { DEFAULT_EMAIL_SETTINGS, type EmailSettings } from '@/lib/email-settings'
import { buildSubmissionEmailHtml } from '@/lib/email'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const appearance: EmailSettings = { ...DEFAULT_EMAIL_SETTINGS, ...body }

  const [tokens, siteRow] = await Promise.all([
    getBrandTokens(),
    prisma.siteConfig.findFirst(),
  ])

  const site = {
    companyName: siteRow?.companyName ?? 'Your Company',
    logoUrl: siteRow?.logoUrl ?? '',
    copyrightText: siteRow?.copyrightText ?? '',
  }

  const sampleFields = [
    { label: 'Full Name', value: 'Jane Smith' },
    { label: 'Email', value: 'jane@example.com' },
    { label: 'Phone', value: '012 345 6789' },
    { label: 'Message', value: 'Hi, I would like to get more information about your services. Please get back to me at your earliest convenience.' },
  ]

  const html = buildSubmissionEmailHtml(
    sampleFields,
    'jane@example.com',
    'Contact Us',
    tokens,
    appearance,
    site
  )

  return NextResponse.json({ html })
}
