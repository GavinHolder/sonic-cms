/**
 * POST /api/admin/portainer/verify — test Portainer connection.
 * Authenticates with Portainer, then verifies the stack exists.
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

interface VerifyBody {
  url: string;
  username: string;
  password: string;
  stackId: string;
  endpointId: string;
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as VerifyBody;
  const { url, username, password, stackId, endpointId } = body;

  if (!url || !username || !password) {
    return NextResponse.json(
      { success: false, error: "URL, username, and password are required." },
      { status: 400 }
    );
  }

  // Strip trailing slash from URL
  const baseUrl = url.replace(/\/+$/, "");

  // Step 1: Authenticate with Portainer
  let jwt: string;
  try {
    const authRes = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!authRes.ok) {
      const detail =
        authRes.status === 422
          ? "Invalid credentials."
          : `Portainer returned ${authRes.status}.`;
      return NextResponse.json({ success: false, error: detail });
    }

    const authData = (await authRes.json()) as { jwt?: string };
    if (!authData.jwt) {
      return NextResponse.json({
        success: false,
        error: "Auth succeeded but no JWT returned.",
      });
    }
    jwt = authData.jwt;
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: `Connection failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Step 2: Verify stack exists (if stackId provided)
  let stackName = "(not checked)";
  if (stackId) {
    try {
      const stackRes = await fetch(`${baseUrl}/api/stacks/${stackId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!stackRes.ok) {
        return NextResponse.json({
          success: false,
          error: `Stack ${stackId} not found (HTTP ${stackRes.status}).`,
        });
      }

      const stackData = (await stackRes.json()) as { Name?: string };
      stackName = stackData.Name ?? `Stack #${stackId}`;
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Stack lookup failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Step 3: Verify endpoint exists (if endpointId provided)
  let endpointName = "(not checked)";
  if (endpointId) {
    try {
      const epRes = await fetch(`${baseUrl}/api/endpoints/${endpointId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!epRes.ok) {
        return NextResponse.json({
          success: false,
          error: `Endpoint ${endpointId} not found (HTTP ${epRes.status}).`,
        });
      }

      const epData = (await epRes.json()) as { Name?: string };
      endpointName = epData.Name ?? `Endpoint #${endpointId}`;
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Endpoint lookup failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    stackName,
    endpointName,
  });
}
