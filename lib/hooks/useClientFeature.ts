"use client";

import { useState, useEffect } from "react";

interface ClientFeatureResult {
  enabled: boolean;
  config: Record<string, unknown>;
  loading: boolean;
}

/**
 * useClientFeature
 *
 * Fetches a client feature flag from /api/features/[slug].
 * Returns { enabled: false, config: {}, loading: false } if not found.
 *
 * ASSUMPTIONS:
 * 1. User is authenticated as SUPER_ADMIN (for admin pages)
 * 2. slug matches a registered ClientFeature record
 *
 * FAILURE MODES:
 * - Network failure → returns { enabled: false } (safe default)
 * - Feature not found → returns { enabled: false }
 */
export function useClientFeature(slug: string): ClientFeatureResult {
  const [result, setResult] = useState<ClientFeatureResult>({
    enabled: false,
    config: {},
    loading: true,
  });

  useEffect(() => {
    fetch(`/api/features/${slug}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.success && data.data) {
          setResult({
            enabled: data.data.enabled,
            config: data.data.config ?? {},
            loading: false,
          });
        } else {
          setResult({ enabled: false, config: {}, loading: false });
        }
      })
      .catch(() => {
        setResult({ enabled: false, config: {}, loading: false });
      });
  }, [slug]);

  return result;
}
