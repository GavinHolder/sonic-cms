/**
 * Geocoding abstraction for the coverage map.
 *
 * Primary backend: Google Maps Platform via the server-side proxy `/api/geocode`
 * (the API key lives in SiteConfig and never reaches the browser). When no key is
 * configured the proxy returns 503 and we fall back to free OpenStreetMap/Nominatim.
 *
 * The rest of the app only depends on the three functions below and the GeoSuggestion
 * / GeoPoint shapes — so the provider is fully swappable here.
 *
 * Flow: searchAddresses() returns predictions (Google gives a placeId, OSM gives
 * coords directly). resolveSuggestion() turns a chosen prediction into exact coords
 * (Google: Place Details; OSM: pass-through). reverseGeocode() turns a clicked map
 * point into the nearest real address.
 */

export type GeoPrecision = "address" | "street" | "area";

export interface GeoSuggestion {
  label: string;
  placeId?: string; // Google — resolve coords via resolveSuggestion()
  lat?: number;     // OSM — coords already present
  lng?: number;
  precision: GeoPrecision;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
  precision: GeoPrecision;
}

function precisionFromGoogleTypes(types?: string[]): GeoPrecision {
  if (types?.some((t) => t === "street_address" || t === "premise" || t === "subpremise")) return "address";
  if (types?.includes("route")) return "street";
  return "area";
}

// ── OpenStreetMap / Nominatim fallback ─────────────────────────────────────────
const OSM = "https://nominatim.openstreetmap.org";

function osmPrecision(addr?: { house_number?: string; road?: string }): GeoPrecision {
  if (addr?.house_number) return "address";
  if (addr?.road) return "street";
  return "area";
}

async function osmSearch(q: string, limit: number): Promise<GeoSuggestion[]> {
  try {
    const res = await fetch(`${OSM}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${limit}&countrycodes=za`, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string; address?: { house_number?: string; road?: string } }>;
    return data.map((d) => ({ label: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon), precision: osmPrecision(d.address) }));
  } catch { return []; }
}

async function osmReverse(lat: number, lng: number): Promise<GeoPoint | null> {
  try {
    const res = await fetch(`${OSM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const d = (await res.json()) as { display_name?: string; address?: { house_number?: string; road?: string } };
    if (!d.display_name) return null;
    return { lat, lng, label: d.display_name, precision: osmPrecision(d.address) };
  } catch { return null; }
}

// ── Public API (Google proxy first, OSM fallback) ──────────────────────────────

/** Forward search — autocomplete predictions for a typed query. */
export async function searchAddresses(query: string, limit = 6): Promise<GeoSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const r = await fetch(`/api/geocode?action=autocomplete&q=${encodeURIComponent(q)}`);
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.predictions)) {
        return d.predictions.slice(0, limit).map((p: { label: string; placeId: string; types?: string[] }) => ({
          label: p.label,
          placeId: p.placeId,
          precision: precisionFromGoogleTypes(p.types),
        }));
      }
    }
  } catch { /* fall through to OSM */ }
  return osmSearch(q, limit);
}

/** Resolve a chosen prediction to exact coordinates + precision. */
export async function resolveSuggestion(s: GeoSuggestion): Promise<GeoPoint | null> {
  if (s.lat != null && s.lng != null) {
    return { lat: s.lat, lng: s.lng, label: s.label, precision: s.precision };
  }
  if (s.placeId) {
    try {
      const r = await fetch(`/api/geocode?action=details&placeId=${encodeURIComponent(s.placeId)}`);
      if (r.ok) {
        const d = await r.json();
        if (d.lat != null) return { lat: d.lat, lng: d.lng, label: d.label || s.label, precision: d.precision ?? s.precision };
      }
    } catch { /* ignore */ }
  }
  return null;
}

/** Reverse geocode — turn a clicked map point into the nearest real address. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoPoint | null> {
  try {
    const r = await fetch(`/api/geocode?action=reverse&lat=${lat}&lng=${lng}`);
    if (r.ok) {
      const d = await r.json();
      return { lat, lng, label: d.label ?? "", precision: (d.precision as GeoPrecision) ?? "street" };
    }
  } catch { /* fall through to OSM */ }
  return osmReverse(lat, lng);
}
