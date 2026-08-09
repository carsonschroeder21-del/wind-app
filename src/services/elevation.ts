const METERS_TO_FEET = 3.28084;

/** Looks up ground elevation at a coordinate via Open-Meteo's free Elevation API
 * (https://open-meteo.com/en/docs/elevation-api) — no API key required. Returns feet,
 * rounded, or null if the lookup fails. */
export async function fetchElevationFt(latitude: number, longitude: number): Promise<number | null> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const meters = data?.elevation?.[0];
    if (typeof meters !== 'number') return null;

    return Math.round(meters * METERS_TO_FEET);
  } catch (err) {
    console.warn('[elevation] fetchElevationFt failed:', err);
    return null;
  }
}
