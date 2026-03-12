/**
 * API Key Utilities
 *
 * Helpers for generating and verifying Volt API keys used by external tools
 * (e.g., the Blender addon) to authenticate against the CMS API.
 *
 * Keys are stored as bcrypt hashes — the raw key is shown once at creation
 * and never retrievable again.
 */

import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"

/**
 * Generate a new API key.
 * Returns the raw key (show once), its bcrypt hash (store), and a display prefix.
 */
export async function generateApiKey(): Promise<{ raw: string; hash: string; prefix: string }> {
  const raw = `vlt_${nanoid(32)}`
  const hash = await bcrypt.hash(raw, 10)
  return { raw, hash, prefix: raw.slice(0, 8) }
}

/**
 * Resolve the CMS User from a Bearer API key in the Authorization header.
 * Iterates all active-user keys and bcrypt-compares. Updates lastUsedAt on match.
 *
 * ASSUMPTIONS:
 * 1. authHeader follows the format "Bearer vlt_<key>"
 * 2. The number of API keys in the system is small enough for linear scan
 *    (bcrypt compare is ~100ms each — not suitable for thousands of keys)
 * 3. Keys belong to users with isActive === true
 *
 * FAILURE MODES:
 * - Large key set → slow auth per request → add a fast prefix index if needed
 * - Stale Prisma connection → import('./prisma') re-uses singleton safely
 *
 * @param authHeader The raw Authorization header value
 * @returns The User record if key is valid, null otherwise
 */
export async function getApiKeyUser(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer vlt_")) return null

  const raw = authHeader.slice(7) // strip "Bearer "

  const { prisma } = await import("./prisma")

  const keys = await prisma.apiKey.findMany({
    where: { user: { isActive: true } },
    include: { user: true },
  })

  for (const key of keys) {
    if (await bcrypt.compare(raw, key.keyHash)) {
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      })
      return key.user
    }
  }

  return null
}
