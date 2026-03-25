/**
 * POST /api/auth/login
 *
 * Authenticate user with username/password and return JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  type JWTPayload,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit-log";

// Request body validation schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, 'login');
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: `Too many login attempts. Try again in ${rl.retryAfterSec}s.` } },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0].message,
            field: validation.error.issues[0].path[0],
          },
        },
        { status: 400 }
      );
    }

    const { username, password, rememberMe } = validation.data;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid username or password",
          },
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_INACTIVE",
            message: "Your account has been deactivated. Please contact an administrator.",
          },
        },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid username or password",
          },
        },
        { status: 401 }
      );
    }

    // Create JWT payload
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Update last login timestamp + audit log
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    auditLog(request, payload, { action: 'login', resource: 'auth', details: { username } });

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          accessToken,
        },
      },
      { status: 200 }
    );

    // Set httpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    // Remember Me: persistent cookies (30 days) vs session cookies (expire on browser close)
    const persistentMaxAge = 30 * 24 * 60 * 60; // 30 days

    response.cookies.set("access_token", accessToken, {
      ...cookieOptions,
      ...(rememberMe ? { maxAge: persistentMaxAge } : {}),
    });

    response.cookies.set("refresh_token", refreshToken, {
      ...cookieOptions,
      ...(rememberMe ? { maxAge: persistentMaxAge } : {}),
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "An error occurred during login. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
