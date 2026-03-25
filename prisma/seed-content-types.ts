/**
 * Seed default content types: Blog Posts + Team Members
 * Run: npx tsx prisma/seed-content-types.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding content types...')

  // ── Blog Posts ─────────────────────────────────────────────────────────────
  const blog = await prisma.contentType.upsert({
    where: { slug: 'blog' },
    update: {},
    create: {
      slug: 'blog',
      name: 'Blog Post',
      pluralName: 'Blog',
      icon: 'bi-journal-text',
      description: 'News, updates, and articles',
      hasPublicListing: true,
      hasPublicDetail: true,
      listingLayout: 'grid',
      detailLayout: 'standard',
      sortField: 'publishedAt',
      sortDirection: 'desc',
      enableTags: true,
      fields: {
        create: [
          { name: 'Body', slug: 'body', fieldType: 'richtext', required: true, placeholder: 'Write your article...', helpText: 'The main content of the blog post', sortOrder: 0 },
          { name: 'Cover Image', slug: 'coverImage', fieldType: 'image', required: false, placeholder: '/uploads/blog-cover.jpg', helpText: 'Hero image shown at the top of the post and in listings', sortOrder: 1 },
          { name: 'Category', slug: 'category', fieldType: 'select', required: false, options: [
            { value: 'news', label: 'News' },
            { value: 'tutorial', label: 'Tutorial' },
            { value: 'update', label: 'Update' },
            { value: 'case-study', label: 'Case Study' },
          ], sortOrder: 2 },
          { name: 'Featured', slug: 'featured', fieldType: 'boolean', required: false, helpText: 'Show this post prominently on the homepage', sortOrder: 3 },
        ],
      },
    },
  })
  console.log(`  ✅ Blog Posts (${blog.id})`)

  // ── Team Members ───────────────────────────────────────────────────────────
  const team = await prisma.contentType.upsert({
    where: { slug: 'team' },
    update: {},
    create: {
      slug: 'team',
      name: 'Team Member',
      pluralName: 'Team',
      icon: 'bi-people',
      description: 'Your team members and their roles',
      hasPublicListing: true,
      hasPublicDetail: true,
      listingLayout: 'grid',
      detailLayout: 'standard',
      sortField: 'createdAt',
      sortDirection: 'asc',
      enableTags: false,
      fields: {
        create: [
          { name: 'Role', slug: 'role', fieldType: 'text', required: true, placeholder: 'CEO, Designer, Developer...', sortOrder: 0 },
          { name: 'Photo', slug: 'photo', fieldType: 'image', required: false, placeholder: '/uploads/team-photo.jpg', sortOrder: 1 },
          { name: 'Bio', slug: 'bio', fieldType: 'richtext', required: false, placeholder: 'A short biography...', sortOrder: 2 },
          { name: 'Email', slug: 'email', fieldType: 'url', required: false, placeholder: 'name@company.com', sortOrder: 3 },
          { name: 'LinkedIn', slug: 'linkedin', fieldType: 'url', required: false, placeholder: 'https://linkedin.com/in/...', sortOrder: 4 },
          { name: 'Display Order', slug: 'displayOrder', fieldType: 'number', required: false, helpText: 'Lower numbers appear first', sortOrder: 5 },
        ],
      },
    },
  })
  console.log(`  ✅ Team Members (${team.id})`)

  console.log('🎉 Content types seeded!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
