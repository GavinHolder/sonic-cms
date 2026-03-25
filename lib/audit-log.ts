/**
 * Audit Log — records admin actions for accountability.
 *
 * Usage:
 *   await auditLog(request, { action: 'create', resource: 'page', resourceId: page.id })
 */

import prisma from '@/lib/prisma'
import { getClientIp } from '@/lib/rate-limit'
import type { JWTPayload } from '@/lib/auth'

interface AuditEntry {
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
}

/**
 * Record an audit log entry.
 * @param request - The incoming request (for IP extraction)
 * @param user - JWT payload of the authenticated user (or null)
 * @param entry - What happened
 */
export async function auditLog(
  request: Request,
  user: JWTPayload | null,
  entry: AuditEntry
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.userId ?? null,
        username: user?.username ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : undefined,
        ipAddress: getClientIp(request),
      },
    })
  } catch {
    // Audit logging should never block the request
    console.error('[AuditLog] Failed to write audit entry:', entry)
  }
}
