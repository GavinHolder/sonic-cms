"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * TokenRefresher Component
 *
 * Automatically refreshes the access token before it expires.
 * Runs silently in the background for all admin pages.
 *
 * How it works:
 * - Access token expires in 8 hours
 * - Checks every 5 minutes if refresh is needed
 * - Refreshes token 10 minutes before expiration
 * - Redirects to login if refresh fails
 */
export default function TokenRefresher() {
  const router = useRouter();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  // Timestamp (ms) of the last refresh attempt — used to throttle focus/visibility
  // triggered refreshes so rapid focus/blur doesn't spam /api/auth/refresh.
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    // Minimum time between focus/visibility-triggered refreshes (5 minutes).
    // Background timers get throttled/paused by the browser, so when the tab
    // becomes visible/focused again we refresh — but only if it's been a while.
    const FOCUS_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

    const refreshToken = async () => {
      // Prevent concurrent refresh requests
      if (isRefreshingRef.current) {
        console.log("[TokenRefresher] Already refreshing, skipping...");
        return;
      }

      console.log("[TokenRefresher] Starting token refresh...");
      isRefreshingRef.current = true;
      // Record attempt time so focus/visibility handlers can throttle correctly
      lastRefreshRef.current = Date.now();

      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include", // Important: include cookies
        });

        if (!response.ok) {
          console.error("[TokenRefresher] Failed:", response.status);

          // If refresh fails, redirect to login
          if (response.status === 401) {
            console.log("[TokenRefresher] Session expired, redirecting to login...");
            router.push("/admin/login?expired=true");
          }
        } else {
          const data = await response.json();
          console.log("[TokenRefresher] ✅ Success! Next refresh in 7 hours.");
        }
      } catch (error) {
        console.error("[TokenRefresher] Error:", error);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Refresh token immediately on mount (in case it's close to expiration)
    refreshToken();

    // Then refresh every 7 hours (1 hour before 8-hour expiration)
    // This ensures the token never expires during active use
    refreshIntervalRef.current = setInterval(
      refreshToken,
      7 * 60 * 60 * 1000 // 7 hours in milliseconds
    );

    // Catch throttled/paused background timers: when the tab is backgrounded or
    // asleep, browsers pause the interval and the token can silently expire past
    // 8h. On focus/visibility we re-check — throttled so we don't spam the API.
    const maybeRefreshOnFocus = () => {
      if (Date.now() - lastRefreshRef.current < FOCUS_REFRESH_THRESHOLD_MS) {
        return;
      }
      console.log("[TokenRefresher] Tab visible/focused, checking token...");
      refreshToken();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        maybeRefreshOnFocus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", maybeRefreshOnFocus);

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", maybeRefreshOnFocus);
    };
  }, [router]);

  // This component renders nothing - it just runs in the background
  return null;
}
