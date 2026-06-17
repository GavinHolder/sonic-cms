import { NextRequest, NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/lib/google-credentials";
import prisma from "@/lib/prisma";
import { isEncryptionConfigured } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * Server-side Google Maps geocoding proxy. The API key never reaches the browser.
 *   ?action=autocomplete&q=...      → Places Autocomplete (New) predictions
 *   ?action=details&placeId=...     → Place Details → { lat, lng, label, precision }
 *   ?action=reverse&lat=..&lng=..   → Geocoding reverse → { lat, lng, label, precision }
 *
 * Returns 503 when no key is configured so the client can fall back to OSM.
 */

type Precision = "address" | "street" | "area";

function precisionFromTypes(types?: string[], comps?: Array<{ types?: string[] }>): Precision {
  if (comps?.some((c) => c.types?.includes("street_number"))) return "address";
  if (types?.some((t) => t === "street_address" || t === "premise" || t === "subpremise")) return "address";
  if (types?.includes("route")) return "street";
  return "area";
}

function precisionFromGeocode(r: any): Precision {
  const lt = r?.geometry?.location_type;
  if (lt === "ROOFTOP") return "address";
  if (r?.address_components?.some((c: any) => c.types?.includes("street_number"))) return "address";
  if (lt === "RANGE_INTERPOLATED" || r?.types?.includes("route")) return "street";
  return "area";
}

export async function GET(req: NextRequest) {
  const key = await getGoogleMapsApiKey();
  if (!key) {
    // Safe diagnostic (no key value leaked — only length/booleans) so we can see
    // why a saved key isn't reaching geocoding on a given deployment.
    let dbKeyLen = 0;
    let dbErr = "";
    try {
      const cfg = await prisma.siteConfig.findUnique({
        where: { id: "singleton" },
        select: { googleMapsApiKey: true },
      });
      dbKeyLen = cfg?.googleMapsApiKey ? String(cfg.googleMapsApiKey).length : 0;
    } catch (e) {
      dbErr = (e instanceof Error ? e.message : String(e)).slice(0, 120);
    }
    return NextResponse.json(
      {
        error: "geocoding-not-configured",
        debug: {
          dbKeyLen,
          envKey: !!process.env.GOOGLE_MAPS_API_KEY,
          encryptionConfigured: isEncryptionConfigured(),
          dbErr,
        },
      },
      { status: 503 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action");

  try {
    if (action === "autocomplete") {
      const input = (sp.get("q") ?? "").trim();
      if (input.length < 3) return NextResponse.json({ predictions: [] });
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
        body: JSON.stringify({ input, includedRegionCodes: ["za"] }),
        signal: AbortSignal.timeout(8000),
      });
      // e.g. Places API (New) not enabled → 403. Signal failure so the client
      // falls back to OSM autocomplete rather than showing an empty list.
      if (!res.ok) return NextResponse.json({ error: "places-autocomplete-failed" }, { status: 502 });
      const data = await res.json();
      const predictions = (data.suggestions ?? [])
        .map((s: any) => ({
          label: s.placePrediction?.text?.text ?? "",
          placeId: s.placePrediction?.placeId ?? "",
          types: s.placePrediction?.types ?? [],
        }))
        .filter((p: any) => p.placeId);
      return NextResponse.json({ predictions });
    }

    if (action === "details") {
      const placeId = sp.get("placeId") ?? "";
      if (!placeId) return NextResponse.json({ error: "placeId required" }, { status: 400 });
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location,formattedAddress,types,addressComponents" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return NextResponse.json({ error: "place-details-failed" }, { status: 502 });
      const d = await res.json();
      if (d.location?.latitude == null) return NextResponse.json({ error: "no-location" }, { status: 404 });
      return NextResponse.json({
        lat: d.location.latitude,
        lng: d.location.longitude,
        label: d.formattedAddress ?? "",
        precision: precisionFromTypes(d.types, d.addressComponents),
      });
    }

    if (action === "reverse") {
      const lat = sp.get("lat");
      const lng = sp.get("lng");
      if (!lat || !lng) return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const d = await res.json();
      // Geocoding API returns HTTP 200 with a status field; REQUEST_DENIED etc.
      // → signal failure so the client falls back to OSM reverse geocoding.
      if (d.status && d.status !== "OK" && d.status !== "ZERO_RESULTS") {
        return NextResponse.json({ error: `geocode-${d.status}` }, { status: 502 });
      }
      const top = d.results?.[0];
      return NextResponse.json({
        lat: Number(lat),
        lng: Number(lng),
        label: top?.formatted_address ?? "",
        precision: precisionFromGeocode(top),
      });
    }

    return NextResponse.json({ error: "unknown-action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "geocode-failed" }, { status: 502 });
  }
}
