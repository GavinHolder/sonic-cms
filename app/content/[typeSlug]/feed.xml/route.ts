/**
 * GET /content/[typeSlug]/feed.xml — RSS feed for published content entries
 */

import { NextRequest } from "next/server"
import { getPublishedEntries } from "@/lib/content-types"
import { fetchSeoConfig } from "@/lib/metadata-generator"

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ typeSlug: string }> }) {
  const { typeSlug } = await params
  const result = await getPublishedEntries(typeSlug, { page: 1, limit: 50 })
  if (!result) {
    return new Response("Content type not found", { status: 404 })
  }

  const seoConfig = await fetchSeoConfig()
  const baseUrl = seoConfig.canonicalBase || new URL(req.url).origin

  const { contentType, entries } = result

  const items = entries.map(entry => {
    const link = `${baseUrl}/content/${typeSlug}/${entry.slug}`
    const pubDate = entry.publishedAt ? new Date(entry.publishedAt).toUTCString() : new Date(entry.createdAt).toUTCString()
    return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid>${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${entry.excerpt ? `<description>${escapeXml(entry.excerpt)}</description>` : ''}
      ${entry.tags.map(t => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(contentType.pluralName)} — ${escapeXml(seoConfig.siteName)}</title>
    <link>${escapeXml(baseUrl)}/content/${typeSlug}</link>
    <description>${escapeXml(contentType.description || contentType.pluralName)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(baseUrl)}/content/${typeSlug}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
