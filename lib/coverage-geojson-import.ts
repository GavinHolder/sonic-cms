/**
 * Client-side GeoJSON -> CoverageRegion parsing for the bulk region import feature
 * (Admin -> Features -> Coverage Maps -> "Import Regions (GeoJSON)").
 *
 * Scope is deliberately narrow: a GeoJSON `FeatureCollection` of `Polygon` /
 * `MultiPolygon` features only. KML, KMZ and Shapefile are common real-world GIS
 * export formats too, but converting them client-side needs different parsing
 * libraries entirely (KMZ is a zip wrapper, Shapefile is a binary format with
 * sidecar files) — out of scope here. They could be added later via a separate
 * "convert to GeoJSON first" step.
 *
 * This file is pure parsing logic (no DOM/Leaflet dependency) so it can run in the
 * import preview modal and be unit-tested independently of the map UI. The file
 * itself is untrusted input (admin-uploaded), so every step is defensive: a
 * malformed/non-GeoJSON file produces a thrown Error with a human-readable message
 * (shown to the admin) or a per-feature "skipped" entry — it never throws partway
 * through a batch in a way that would leave the caller unsure what was parsed.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ParsedRegion {
  name: string;
  polygon: LatLng[];
}

export interface SkippedFeature {
  index: number;
  reason: string;
}

export interface ParseResult {
  regions: ParsedRegion[];
  skipped: SkippedFeature[];
}

// Above this many features, parsing (and the resulting DOM list in the preview)
// risks hanging the browser tab. Real FNO/municipal exports run to low thousands;
// this is a generous ceiling, not a realistic expectation.
const MAX_FEATURES = 10000;

// Admin-defined GeoJSON `properties` keys tried, in order, as the region name.
// There's no universal "name" field in GeoJSON, so this is a best-effort guess —
// anything left unmatched falls back to "Region N" and the admin renames it after
// import. Deliberately not guessing harder than this (e.g. no fuzzy matching).
const NAME_PROPERTY_CANDIDATES = ["name", "Name", "NAME", "title", "label"];

// Keep imported names sane even if a malicious/malformed file supplies something
// enormous — this is attacker-controllable text (see CoverageMapViewer's popup
// escaping) and also just bad UI if left unbounded.
const MAX_NAME_LENGTH = 200;

function pickName(properties: unknown): string | null {
  if (!properties || typeof properties !== "object") return null;
  const props = properties as Record<string, unknown>;
  for (const key of NAME_PROPERTY_CANDIDATES) {
    const val = props[key];
    if (typeof val === "string" && val.trim()) return val.trim().slice(0, MAX_NAME_LENGTH);
    if (typeof val === "number" && Number.isFinite(val)) return String(val).slice(0, MAX_NAME_LENGTH);
  }
  return null;
}

/**
 * COORDINATE ORDER — the single place this conversion happens.
 *
 * GeoJSON coordinates are `[longitude, latitude]` (RFC 7946). This app's existing
 * polygon storage (`CoverageRegion.polygon`, written by the hand-drawn Leaflet.Draw
 * editor in PolygonEditorModal.tsx and read back by CoverageMapViewer.tsx) is the
 * opposite: `{ lat, lng }` objects fed straight into Leaflet's `[lat, lng]`
 * convention. Swapping these is the single most likely silent bug in this feature —
 * a flipped polygon still "renders", just mirrored across the equator/prime
 * meridian, which can look plausible at a glance on some coordinates and only be
 * obviously wrong at others. Hence: converted here, in one function, with this
 * comment, rather than inline wherever coordinates happen to be read.
 */
function coordToLatLng(coord: unknown): LatLng | null {
  if (!Array.isArray(coord) || coord.length < 2) return null;
  const [lng, lat] = coord; // GeoJSON order: index 0 = longitude, index 1 = latitude
  if (typeof lng !== "number" || typeof lat !== "number" || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function ringToLatLngs(ring: unknown): LatLng[] | null {
  if (!Array.isArray(ring) || ring.length < 4) return null; // closed ring needs >= 3 distinct points + closing point
  const pts: LatLng[] = [];
  for (const coord of ring) {
    const ll = coordToLatLng(coord);
    if (!ll) return null;
    pts.push(ll);
  }
  // GeoJSON linear rings are closed — the first coordinate repeats as the last.
  // The hand-drawn path (Leaflet.Draw -> PolygonEditorModal) never stores that
  // duplicate (Leaflet's getLatLngs() omits it), so drop it here too — otherwise
  // an imported region would have one more point than an equivalent hand-drawn one.
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (pts.length > 3 && first.lat === last.lat && first.lng === last.lng) pts.pop();
  return pts.length >= 3 ? pts : null;
}

/**
 * Parse a GeoJSON FeatureCollection into CoverageRegion-shaped {name, polygon} rows.
 *
 * @param raw        Parsed JSON (from JSON.parse on the uploaded file's text).
 * @param nameOffset The target CoverageMap's current region count — fallback names
 *                    start counting from here (e.g. map already has 5 regions ->
 *                    first unnamed import is "Region 6"), so fallback names never
 *                    collide with existing ones.
 */
export function parseGeoJsonRegions(raw: unknown, nameOffset: number): ParseResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("File is not valid JSON");
  }
  const fc = raw as Record<string, unknown>;
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error('Expected a GeoJSON FeatureCollection (top-level "type": "FeatureCollection" with a "features" array)');
  }
  if (fc.features.length === 0) {
    throw new Error("This GeoJSON file has no features");
  }
  if (fc.features.length > MAX_FEATURES) {
    throw new Error(`This file has ${fc.features.length} features — split it into smaller files (max ${MAX_FEATURES} per import)`);
  }

  const regions: ParsedRegion[] = [];
  const skipped: SkippedFeature[] = [];
  let unnamedCounter = Math.max(0, Math.floor(nameOffset) || 0);
  const nextFallbackName = () => {
    unnamedCounter += 1;
    return `Region ${unnamedCounter}`;
  };

  fc.features.forEach((feature: unknown, index: number) => {
    if (!feature || typeof feature !== "object") {
      skipped.push({ index, reason: "Not a valid GeoJSON feature object" });
      return;
    }
    const f = feature as Record<string, unknown>;
    const geometry = f.geometry as Record<string, unknown> | null | undefined;
    if (!geometry || typeof geometry !== "object") {
      skipped.push({ index, reason: "Feature has no geometry" });
      return;
    }
    const geomType = geometry.type;
    const name = pickName(f.properties);

    if (geomType === "Polygon") {
      const coordinates = geometry.coordinates as unknown[] | undefined;
      const ring = ringToLatLngs(coordinates?.[0]);
      if (!ring) {
        skipped.push({ index, reason: "Polygon geometry has fewer than 3 usable points" });
        return;
      }
      regions.push({ name: name ?? nextFallbackName(), polygon: ring });
    } else if (geomType === "MultiPolygon") {
      const polys = geometry.coordinates as unknown[] | undefined;
      if (!Array.isArray(polys) || polys.length === 0) {
        skipped.push({ index, reason: "MultiPolygon geometry has no polygons" });
        return;
      }
      // Fan out: this model stores one polygon per region (no multi-part support),
      // so each constituent polygon of the MultiPolygon becomes its own region row.
      const rings: LatLng[][] = [];
      for (const poly of polys) {
        const ring = ringToLatLngs((poly as unknown[] | undefined)?.[0]);
        if (ring) rings.push(ring);
      }
      if (rings.length === 0) {
        skipped.push({ index, reason: "MultiPolygon geometry has no usable polygons" });
        return;
      }
      rings.forEach((ring, i) => {
        const base = name ?? nextFallbackName();
        // Only suffix when there's a shared source name and more than one part —
        // an unnamed part already gets a distinct "Region N" from nextFallbackName().
        const partName = name && rings.length > 1 ? `${base} (${i + 1})` : base;
        regions.push({ name: partName, polygon: ring });
      });
    } else {
      skipped.push({
        index,
        reason: `Unsupported geometry type "${typeof geomType === "string" ? geomType : String(geomType)}" — only Polygon/MultiPolygon are imported`,
      });
    }
  });

  return { regions, skipped };
}
