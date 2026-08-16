import type { WeatherPoint } from '../../types';

const PAST_DAYS = 2;
const FORECAST_DAYS = 3;
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  fetchedAt: number;
  points: WeatherPoint[];
}

// Keyed by rounded coordinates (weather data doesn't need pinpoint precision) so nearby
// stands share a cache entry instead of each firing its own request.
const cache = new Map<string, CacheEntry>();

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

/** Fetches an hourly weather time series — wind + barometric pressure + temperature,
 * recent past through multi-day forecast — from Open-Meteo's free forecast API
 * (https://open-meteo.com/en/docs), which also serves `past_days` of recent history in
 * the same call. No API key required, same provider already used for elevation lookups.
 * Returns null on failure. */
export async function fetchWeatherSeries(latitude: number, longitude: number): Promise<WeatherPoint[] | null> {
  const key = cacheKey(latitude, longitude);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.points;
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&hourly=wind_speed_10m,wind_direction_10m,pressure_msl,temperature_2m` +
      `&wind_speed_unit=mph&temperature_unit=fahrenheit` +
      `&past_days=${PAST_DAYS}&forecast_days=${FORECAST_DAYS}&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) return cached?.points ?? null;

    const data = await response.json();
    const times: string[] | undefined = data?.hourly?.time;
    const speeds: number[] | undefined = data?.hourly?.wind_speed_10m;
    const directions: number[] | undefined = data?.hourly?.wind_direction_10m;
    // Mean-sea-level pressure — comparable across stands at different elevations, unlike
    // raw station pressure.
    const pressures: number[] | undefined = data?.hourly?.pressure_msl;
    const temperatures: number[] | undefined = data?.hourly?.temperature_2m;
    if (!times || !speeds || !directions || !pressures || !temperatures) return cached?.points ?? null;

    const points: WeatherPoint[] = times.map((time, i) => ({
      // Open-Meteo returns local time (no offset) when timezone=auto — parsed as local,
      // which lines up with the device's clock for a stand near the hunter.
      timestampMs: new Date(time).getTime(),
      speedMph: Math.round(speeds[i]),
      directionDeg: Math.round(directions[i]),
      pressureHpa: Math.round(pressures[i] * 10) / 10,
      temperatureF: Math.round(temperatures[i]),
    }));

    cache.set(key, { fetchedAt: Date.now(), points });
    return points;
  } catch (err) {
    console.warn('[openMeteo] fetchWeatherSeries failed:', err);
    return cached?.points ?? null;
  }
}

/** Nearest weather point to a target time, or null if the series is empty/missing or the
 * nearest point is further away than `maxDistanceMs` (default 45 min — half the hourly
 * step, so every in-range timestamp always has a point within tolerance). */
export function nearestWeatherPoint(
  points: WeatherPoint[] | null,
  targetMs: number,
  maxDistanceMs = 45 * 60 * 1000,
): WeatherPoint | null {
  if (!points || points.length === 0) return null;

  let closest: WeatherPoint | null = null;
  let closestDist = Infinity;
  for (const point of points) {
    const dist = Math.abs(point.timestampMs - targetMs);
    if (dist < closestDist) {
      closest = point;
      closestDist = dist;
    }
  }

  return closest && closestDist <= maxDistanceMs ? closest : null;
}
