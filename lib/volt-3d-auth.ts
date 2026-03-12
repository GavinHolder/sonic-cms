/**
 * Volt 3D Auth Helper
 *
 * Shared user resolution for all /api/volt-3d/* routes.
 * Supports both Bearer vlt_* API keys and JWT session cookies.
 */

import { NextRequest, NextResponse } from "next/server"
import { getApiKeyUser } from "./api-keys"
import { requireRole } from "./api-middleware"
import type { JWTPayload } from "./auth"
import type { User } from "@prisma/client"

export interface ResolvedVolt3DUser {
  userId: string
  role: User["role"]
}

/**
 * Resolves API key OR JWT session auth for Volt 3D routes.
 *
 * ASSUMPTIONS:
 * 1. API key header format is "Bearer vlt_<key>"
 * 2. JWT auth falls back to session cookie (handled by requireRole)
 * 3. Minimum required role is EDITOR for all Volt 3D operations
 *
 * FAILURE MODES:
 * - Invalid API key → returns 401 Response
 * - Insufficient role → returns 403 Response (from requireRole)
 * - No auth provided → returns 401 Response
 *
 * @returns ResolvedVolt3DUser on success, or a Response (401/403) on failure
 */
export async function resolveVolt3DUser(
  req: NextRequest
): Promise<ResolvedVolt3DUser | NextResponse> {
  const auth = req.headers.get("authorization")

  if (auth?.startsWith("Bearer vlt_")) {
    const user = await getApiKeyUser(auth)
    if (!user || (user.role !== "EDITOR" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      )
    }
    return { userId: user.id, role: user.role }
  }

  // Fall back to JWT session auth
  const result = requireRole(req, "EDITOR")
  if (result instanceof NextResponse) return result
  const jwt = result as JWTPayload
  return { userId: jwt.userId, role: jwt.role }
}
