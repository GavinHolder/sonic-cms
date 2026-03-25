/**
 * Content Type Engine — library functions for managing custom content types.
 *
 * Content types are user-defined data schemas (blog posts, team members, FAQ items, etc.).
 * Each type has fields (text, richtext, image, date, number, select, etc.).
 * Entries are instances of a type with data stored as JSON keyed by field slugs.
 */

import prisma from '@/lib/prisma'

// ── Field Types ──────────────────────────────────────────────────────────────

export const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: 'bi-type' },
  { value: 'richtext', label: 'Rich Text', icon: 'bi-text-paragraph' },
  { value: 'image', label: 'Image', icon: 'bi-image' },
  { value: 'date', label: 'Date', icon: 'bi-calendar-date' },
  { value: 'number', label: 'Number', icon: 'bi-123' },
  { value: 'boolean', label: 'Toggle', icon: 'bi-toggle-on' },
  { value: 'select', label: 'Select', icon: 'bi-list-ul' },
  { value: 'multiselect', label: 'Multi-Select', icon: 'bi-check2-square' },
  { value: 'url', label: 'URL', icon: 'bi-link-45deg' },
  { value: 'color', label: 'Color', icon: 'bi-palette' },
  { value: 'relation', label: 'Relation', icon: 'bi-diagram-3' },
] as const

export type FieldType = typeof FIELD_TYPES[number]['value']

// ── Slug Generation ──────────────────────────────────────────────────────────

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// ── Content Type CRUD ────────────────────────────────────────────────────────

export async function getContentTypes() {
  return prisma.contentType.findMany({
    include: {
      fields: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { entries: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getContentType(slug: string) {
  return prisma.contentType.findUnique({
    where: { slug },
    include: {
      fields: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { entries: true } },
    },
  })
}

export async function createContentType(data: {
  name: string
  pluralName: string
  slug: string
  icon?: string
  description?: string
  hasPublicListing?: boolean
  hasPublicDetail?: boolean
  listingLayout?: string
  detailLayout?: string
  sortField?: string
  sortDirection?: string
  enableTags?: boolean
  fields?: Array<{
    name: string
    slug: string
    fieldType: string
    required?: boolean
    defaultValue?: string
    options?: unknown
    placeholder?: string
    helpText?: string
    sortOrder?: number
    validation?: unknown
  }>
}) {
  const { fields, ...typeData } = data
  return prisma.contentType.create({
    data: {
      ...typeData,
      fields: fields ? {
        create: fields.map((f, i) => ({
          ...f,
          sortOrder: f.sortOrder ?? i,
          options: f.options ? JSON.parse(JSON.stringify(f.options)) : undefined,
          validation: f.validation ? JSON.parse(JSON.stringify(f.validation)) : undefined,
        })),
      } : undefined,
    },
    include: {
      fields: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

export async function deleteContentType(id: string) {
  return prisma.contentType.delete({ where: { id } })
}

// ── Content Entry CRUD ───────────────────────────────────────────────────────

export async function getEntries(
  contentTypeId: string,
  options?: {
    status?: string
    search?: string
    page?: number
    limit?: number
    sortField?: string
    sortDirection?: string
  }
) {
  const { status, search, page = 1, limit = 20, sortField = 'createdAt', sortDirection = 'desc' } = options ?? {}

  const where: Record<string, unknown> = { contentTypeId }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [entries, total] = await Promise.all([
    prisma.contentEntry.findMany({
      where,
      include: { author: { select: { firstName: true, lastName: true, username: true } } },
      orderBy: { [sortField]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contentEntry.count({ where }),
  ])

  return { entries, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getEntry(contentTypeId: string, slug: string) {
  return prisma.contentEntry.findUnique({
    where: { contentTypeId_slug: { contentTypeId, slug } },
    include: {
      author: { select: { firstName: true, lastName: true, username: true } },
      contentType: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
    },
  })
}

export async function getEntryById(id: string) {
  return prisma.contentEntry.findUnique({
    where: { id },
    include: {
      author: { select: { firstName: true, lastName: true, username: true } },
      contentType: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
    },
  })
}

export async function createEntry(data: {
  contentTypeId: string
  title: string
  slug: string
  data: Record<string, unknown>
  status?: string
  publishedAt?: Date
  scheduledAt?: Date
  authorId: string
  tags?: string[]
  excerpt?: string
  coverImage?: string
}) {
  return prisma.contentEntry.create({
    data: {
      ...data,
      data: data.data as object,
    },
  })
}

export async function updateEntry(
  id: string,
  data: {
    title?: string
    slug?: string
    data?: Record<string, unknown>
    status?: string
    publishedAt?: Date | null
    scheduledAt?: Date | null
    tags?: string[]
    excerpt?: string | null
    coverImage?: string | null
  },
  userId: string
) {
  // Create version snapshot before updating
  const current = await prisma.contentEntry.findUnique({ where: { id } })
  if (current) {
    await prisma.contentEntryVersion.create({
      data: {
        entryId: id,
        data: current.data as object,
        title: current.title,
        createdById: userId,
      },
    })
  }

  return prisma.contentEntry.update({
    where: { id },
    data: {
      ...data,
      data: data.data ? (data.data as object) : undefined,
    },
  })
}

export async function deleteEntry(id: string) {
  return prisma.contentEntry.delete({ where: { id } })
}

// ── Public Queries ───────────────────────────────────────────────────────────

export async function getPublishedEntries(
  typeSlug: string,
  options?: { page?: number; limit?: number; tag?: string }
) {
  const { page = 1, limit = 12, tag } = options ?? {}

  const contentType = await prisma.contentType.findUnique({ where: { slug: typeSlug } })
  if (!contentType) return null

  const where: Record<string, unknown> = {
    contentTypeId: contentType.id,
    status: 'published',
    publishedAt: { lte: new Date() },
  }
  if (tag) where.tags = { has: tag }

  const [entries, total] = await Promise.all([
    prisma.contentEntry.findMany({
      where,
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { [contentType.sortField]: contentType.sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contentEntry.count({ where }),
  ])

  return { contentType, entries, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getPublishedEntry(typeSlug: string, entrySlug: string) {
  const contentType = await prisma.contentType.findUnique({
    where: { slug: typeSlug },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!contentType) return null

  const entry = await prisma.contentEntry.findUnique({
    where: { contentTypeId_slug: { contentTypeId: contentType.id, slug: entrySlug } },
    include: { author: { select: { firstName: true, lastName: true } } },
  })
  if (!entry || entry.status !== 'published') return null

  return { contentType, entry }
}
