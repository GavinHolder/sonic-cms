export interface LatLng { lat: number; lng: number }

export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
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
}
