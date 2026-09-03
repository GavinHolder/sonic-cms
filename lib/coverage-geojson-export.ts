/**
 * Client-side CoverageRegion/CoverageTower -> GeoJSON/KML export for the
 * "Export" button (Admin -> Features -> Coverage Maps). Mirrors the import
 * side (lib/coverage-geojson-import.ts) so round-tripping a file out and
 * back in produces the same polygons.
 *
 * Pure functions, no DOM/Leaflet dependency — same reasoning as the import
 * module: testable independently, and this file only ever sees data already
 * loaded from this app's own API (not untrusted upload input), so escaping
 * here is about producing well-formed KML/XML, not defending against attack
 * input the way the import parser has to.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ExportRegion {
  name: string;
  polygon: LatLng[];
  color: string;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  description: string | null;
  isActive: boolean;
  regionType: string;
  networkName: string | null;
}

export interface ExportTower {
  name: string;
  lat: number;
  lng: number;
  description: string | null;
  isActive: boolean;
  networkName: string | null;
}

/**
 * COORDINATE ORDER — mirrors the note in coverage-geojson-import.ts. Storage
 * is {lat, lng}; GeoJSON/KML both want [lng, lat]. Converted here, once.
 */
function toLngLat(p: LatLng): [number, number] {
  return [p.lng, p.lat];
}

/** GeoJSON/KML linear rings must be closed (first point repeated as last).
 * This app's stored polygons are open (see coverage-geojson-import.ts), so
 * close them here rather than assuming the source data already is. */
function closedRing(points: LatLng[]): LatLng[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first.lat === last.lat && first.lng === last.lng) return points;
  return [...points, first];
}

export function regionsAndTowersToGeoJson(regions: ExportRegion[], towers: ExportTower[]) {
  const regionFeatures = regions.map((r) => ({
    type: "Feature" as const,
    properties: {
      name: r.name,
      description: r.description,
      regionType: r.regionType,
      network: r.networkName,
      isActive: r.isActive,
      fillColor: r.color,
      fillOpacity: r.opacity,
      strokeColor: r.strokeColor,
      strokeWidth: r.strokeWidth,
    },
    geometry: {
      type: "Polygon" as const,
      coordinates: [closedRing(r.polygon).map(toLngLat)],
    },
  }));

  const towerFeatures = towers.map((t) => ({
    type: "Feature" as const,
    properties: {
      name: t.name,
      description: t.description,
      network: t.networkName,
      isActive: t.isActive,
    },
    geometry: {
      type: "Point" as const,
      coordinates: [t.lng, t.lat],
    },
  }));

  return {
    type: "FeatureCollection" as const,
    features: [...regionFeatures, ...towerFeatures],
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** KML color is aabbggrr (alpha, blue, green, red), each a hex byte — the
 * opposite byte order from CSS "#rrggbb". `opacity` (0-1) becomes the alpha
 * byte so a region's fill transparency survives the export. */
function toKmlColor(hex: string, opacity = 1): string {
  const clean = hex.replace("#", "");
  const r = clean.slice(0, 2) || "00";
  const g = clean.slice(2, 4) || "00";
  const b = clean.slice(4, 6) || "00";
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${a}${b}${g}${r}`;
}

function regionPlacemark(r: ExportRegion): string {
  const ring = closedRing(r.polygon)
    .map((p) => `${p.lng},${p.lat},0`)
    .join(" ");
  const descParts = [r.description, r.networkName ? `Network: ${r.networkName}` : null, `Type: ${r.regionType}`].filter(Boolean);
  return `    <Placemark>
      <name>${escapeXml(r.name)}</name>
      <description>${escapeXml(descParts.join(" — "))}</description>
      <Style>
        <LineStyle><color>${toKmlColor(r.strokeColor)}</color><width>${r.strokeWidth}</width></LineStyle>
        <PolyStyle><color>${toKmlColor(r.color, r.opacity)}</color></PolyStyle>
      </Style>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${ring}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
}

function towerPlacemark(t: ExportTower): string {
  const descParts = [t.description, t.networkName ? `Network: ${t.networkName}` : null].filter(Boolean);
  return `    <Placemark>
      <name>${escapeXml(t.name)}</name>
      <description>${escapeXml(descParts.join(" — "))}</description>
      <Point>
        <coordinates>${t.lng},${t.lat},0</coordinates>
      </Point>
    </Placemark>`;
}

export function regionsAndTowersToKml(mapName: string, regions: ExportRegion[], towers: ExportTower[]): string {
  const regionsXml = regions.map(regionPlacemark).join("\n");
  const towersXml = towers.map(towerPlacemark).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(mapName)}</name>
    <Folder>
      <name>Regions</name>
${regionsXml}
    </Folder>
    <Folder>
      <name>Towers</name>
${towersXml}
    </Folder>
  </Document>
</kml>`;
}
