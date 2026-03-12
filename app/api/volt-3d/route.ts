/**
 * GET  /api/volt-3d  — list authenticated user's 3D assets (last 5 versions each)
 * POST /api/volt-3d  — Blender sync: create/update asset + upload GLB/blend files
 *
 * Auth: JWT session cookie OR Bearer vlt_* API key
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware"
import { saveUploadedFile } from "@/lib/volt-3d-upload"
import { resolveVolt3DUser, type ResolvedVolt3DUser } from "@/lib/volt-3d-auth"

// ============================================
// animClips validation
// ============================================

/**
 * Parse and validate the animClips JSON field from multipart form data.
 *
 * ASSUMPTIONS:
 * 1. Input is a JSON string (or null/empty — returns [])
 * 2. Each clip must have name (string), duration (number), isDefault (boolean)
 * 3. Invalid items are silently dropped (not a hard error)
 *
 * FAILURE MODES:
 * - Malformed JSON → returns []
 * - Array items with wrong types → filtered out
 * - name strings longer than 200 chars → truncated
 */
function parseAnimClips(raw: string): Array<{ name: string; duration: number; isDefault: boolean }> {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (c) =>
          c &&
          typeof c.name === "string" &&
          typeof c.duration === "number" &&
          typeof c.isDefault === "boolean"
      )
      .map((c) => ({
        name: String(c.name).slice(0, 200),
        duration: Number(c.duration),
        isDefault: Boolean(c.isDefault),
      }))
  } catch {
    return []
  }
}

// ============================================
// GET /api/volt-3d
// ============================================

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveVolt3DUser(request)
    if (auth instanceof NextResponse) return auth

    const { userId } = auth as ResolvedVolt3DUser

    const assets = await prisma.volt3DAsset.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        thumbnail: true,
        activeVersionId: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          orderBy: { versionNum: "desc" },
          take: 5,
          select: {
            id: true,
            versionNum: true,
            glbPath: true,
            blendPath: true,
            animClips: true,
            isConfirmed: true,
            syncedAt: true,
          },
        },
      },
    })

    return successResponse({ assets })
  } catch (error) {
    return handleApiError(error)
  }
}

// ============================================
// POST /api/volt-3d  (Blender sync endpoint)
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveVolt3DUser(request)
    if (auth instanceof NextResponse) return auth

    const { userId } = auth as ResolvedVolt3DUser

    const formData = await request.formData()
    const name = (formData.get("name") as string | null)?.trim()
    const assetId = (formData.get("assetId") as string | null) ?? undefined
    const animClipsRaw = formData.get("animClips") as string | null
    const glbFile = formData.get("glb") as File | null
    const blendFile = formData.get("blend") as File | null

    // Validation
    if (!name) {
      return errorResponse("VALIDATION_ERROR", "name is required", 400, "name")
    }
    if (!glbFile) {
      return errorResponse("VALIDATION_ERROR", "glb file is required", 400, "glb")
    }

    // Parse and validate animClips — default to [] on any parse error or missing field
    const animClips = animClipsRaw ? parseAnimClips(animClipsRaw) : []

    // Find or create asset
    let asset: { id: string }

    if (assetId) {
      // Verify asset belongs to this user
      const existing = await prisma.volt3DAsset.findUnique({ where: { id: assetId } })
      if (!existing || existing.authorId !== userId) {
        return errorResponse("NOT_FOUND", "Asset not found", 404)
      }
      asset = existing
      // Update name if changed
      if (existing.name !== name) {
        await prisma.volt3DAsset.update({ where: { id: assetId }, data: { name } })
      }
    } else {
      asset = await prisma.volt3DAsset.create({
        data: { name, authorId: userId },
      })
    }

    // Determine next versionNum
    const maxVersion = await prisma.volt3DVersion.findFirst({
      where: { assetId: asset.id },
      orderBy: { versionNum: "desc" },
      select: { versionNum: true },
    })
    const versionNum = (maxVersion?.versionNum ?? 0) + 1

    // Save GLB file
    const glbBuffer = Buffer.from(await glbFile.arrayBuffer())
    const glbPath = await saveUploadedFile(glbBuffer, `${asset.id}_v${versionNum}.glb`)

    // Save blend file (optional)
    let blendPath: string | undefined
    if (blendFile) {
      const blendBuffer = Buffer.from(await blendFile.arrayBuffer())
      blendPath = await saveUploadedFile(blendBuffer, `${asset.id}_v${versionNum}.blend`)
    }

    // Create version record
    const version = await prisma.volt3DVersion.create({
      data: {
        assetId: asset.id,
        versionNum,
        glbPath,
        blendPath: blendPath ?? null,
        animClips,
        isConfirmed: false,
      },
    })

    return successResponse(
      {
        assetId: asset.id,
        versionId: version.id,
        versionNum: version.versionNum,
        glbPath: version.glbPath,
      },
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}
