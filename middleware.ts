/**
 * Next.js Middleware
 *
 * Handles:
 * - JWT authentication for admin routes
 * - Request header forwarding
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const origin = request.nextUrl.origin;
  const isPublicPath = !pathname.startsWith("/admin") && !pathname.startsWith("/api") && !pathname.startsWith("/_next");

  // ── 301 Redirect check (public routes only) ─────────────────────────────
  if (isPublicPath) {
    try {
      const redirectRes = await fetch(`${origin}/api/redirects/check?path=${encodeURIComponent(pathname)}`, { headers: { "x-internal": "1" } });
      if (redirectRes.ok) {
        const data = await redirectRes.json();
        if (data.redirect) {
          const dest = data.redirect.toPath.startsWith("http") ? data.redirect.toPath : `${origin}${data.redirect.toPath}`;
          return NextResponse.redirect(dest, data.redirect.statusCode);
        }
      }
    } catch {
      // Redirect check failure should not block the request
    }
  }

  // Set custom headers (x-pathname always reflects the ORIGINAL path so layout.tsx can detect type)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // ── Standalone page rewrite: /{slug} → /standalone/{slug} ───────────────
  // Single-segment public paths that are not already at /standalone/* are checked.
  // If the page type is STANDALONE, we rewrite internally so the browser sees /{slug}
  // but the renderer at /standalone/[slug]/page.tsx handles the HTML.
  if (isPublicPath && !pathname.startsWith("/standalone") && !pathname.startsWith("/volt-preview") && !pathname.startsWith("/maintenance-preview")) {
    const parts = pathname.slice(1).split("/");
    if (parts.length === 1 && parts[0]) {
      try {
        const typeRes = await fetch(`${origin}/api/internal/page-type?slug=${encodeURIComponent(parts[0])}`, { headers: { "x-internal": "1" } });
        if (typeRes.ok) {
          const data = await typeRes.json();
          if (data.type === "STANDALONE") {
            requestHeaders.set("x-standalone-rewrite", "1");
            return NextResponse.rewrite(new URL(`/standalone/${parts[0]}`, request.url), {
              request: { headers: requestHeaders },
            });
          }
        }
      } catch {
        // Type check failure — fall through to normal routing
      }
    }
  }

  // TODO: Currently using localStorage-based auth, so skip JWT validation
  // When implementing proper backend auth with Phase 1, uncomment the code below

  /*
  // Check if route requires authentication
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/admin/forgot-password";
  const isApiRoute = pathname.startsWith("/api") && !pathname.startsWith("/api/auth/login");

  if (isAdminRoute || isApiRoute) {
    // Get access token from cookies
    const accessToken = request.cookies.get("access_token")?.value;

    // If no token, redirect to login (for admin pages) or return 401 (for API)
    if (!accessToken) {
      if (isAdminRoute) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // Verify token
      const payload = verifyAccessToken(accessToken);

      if (!payload) {
        // Invalid or expired token
        if (isAdminRoute) {
          const loginUrl = new URL("/admin/login", request.url);
          loginUrl.searchParams.set("redirect", pathname);
          loginUrl.searchParams.set("error", "session_expired");

          // Clear invalid cookies
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete("access_token");
          response.cookies.delete("refresh_token");
          return response;
        }
      } else {
        // Valid token - add user info to headers for route handlers
        requestHeaders.set("x-user-id", payload.userId);
        requestHeaders.set("x-user-role", payload.role);
      }
    }
  }
  */

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|uploads|api/media/upload).*)",
    // Upload routes bypass middleware to preserve the multipart body stream
  ],
};
