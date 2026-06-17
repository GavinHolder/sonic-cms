export interface LatLng { lat: number; lng: number }

export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  if (polygon.length < 3) return false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const latI = polygon[i].lat, lngI = polygon[i].lng;
    const latJ = polygon[j].lat, lngJ = polygon[j].lng;
    const intersect =
      lngI > point.lng !== lngJ > point.lng &&
      point.lat < ((latJ - latI) * (point.lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface CoveragePackage {
  id: string;
  name: string;
  speedDown: string | null;
  speedUp: string | null;
  price: string;
  period: string | null;
  features: string[];
  popular: boolean;
}
export interface CoverageNetworkResult {
  id: string;
  name: string;
  slug: string;
  category: "FNO" | "WISP" | "WIRELESS" | string;
  color: string;
  logoUrl: string | null;
  regionNames: string[];
  packages: CoveragePackage[];
}
export interface CoverageCheckResult {
  type: "fibre" | "wireless" | "miss";
  // fibre hit
  fnoProvider?: string;
  regionName?: string;
  // wireless hit (multiple zones possible)
  services?: Array<{
    name: string;
    serviceSlug: string;
    towerRef: string | null;
    description: string | null;
  }>;
  // multi-network result (current format)
  hit?: boolean;
  networks?: CoverageNetworkResult[];
  unlinkedRegionNames?: string[];
}
