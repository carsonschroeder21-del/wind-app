const METERS_TO_FEET = 3.28084;

export interface ElevationPoint {
  latitude: number;
  longitude: number;
}

/** Looks up ground elevation for one or more coordinates in a single request, via
 * Open-Meteo's free Elevation API (https://open-meteo.com/en/docs/elevation-api — accepts
 * comma-separated coordinate lists) — no API key required. Returns feet, rounded, in the
 * same order as `points`; any point that fails to resolve comes back null without failing
 * the rest. */
export async function fetchElevationsFt(points: ElevationPoint[]): Promise<(number | null)[]> {
  try {
    const lats = points.map((p) => p.latitude).join(',');
    const lons = points.map((p) => p.longitude).join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
    const response = await fetch(url);
    if (!response.ok) return points.map(() => null);

    const data = await response.json();
    const elevations = data?.elevation;
    if (!Array.isArray(elevations)) return points.map(() => null);

    return points.map((_, i) => (typeof elevations[i] === 'number' ? Math.round(elevations[i] * METERS_TO_FEET) : null));
  } catch (err) {
    console.warn('[elevation] fetchElevationsFt failed:', err);
    return points.map(() => null);
  }
}

/** Single-point convenience wrapper around `fetchElevationsFt`. */
export async function fetchElevationFt(latitude: number, longitude: number): Promise<number | null> {
  const [ft] = await fetchElevationsFt([{ latitude, longitude }]);
  return ft;
}
