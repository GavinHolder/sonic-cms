// lib/email-settings.ts
import prisma from '@/lib/prisma'

export interface EmailSettings {
  subjectPrefix: string
  headerTagline: string
  footerText: string
  showLogo: boolean
  showCompanyName: boolean
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  subjectPrefix: 'New enquiry —',
  headerTagline: 'You have a new website enquiry',
  footerText: 'Reply directly to this email to respond to the enquirer.',
  showLogo: true,
  showCompanyName: true,
}

const SETTINGS_KEY = 'email_settings'

export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const row = await prisma.systemSettings.findUnique({ where: { key: SETTINGS_KEY } })
    if (row?.value) {
      const parsed = JSON.parse(row.value)
      return { ...DEFAULT_EMAIL_SETTINGS, ...parsed }
    }
  } catch {
    // Return defaults if key missing or parse fails
  }
  return DEFAULT_EMAIL_SETTINGS
}

export async function saveEmailSettings(settings: EmailSettings): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  })
}
