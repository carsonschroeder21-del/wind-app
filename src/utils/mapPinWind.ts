import { nearestWeatherPoint } from '../services/weather/openMeteo';
import type { WeatherPoint, WindReading } from '../types';

/** Resolves the wind reading to show for a stand's pin on the all-stands map, right now.
 *
 * Unlike `resolveConditionsAtTime` (which always shows the single shared live/regional
 * reading for "now," and only consults a stand's own forecast for past/future times), the
 * map view wants each pin to reflect its own location when possible — that's the whole
 * point of showing a cone per pin instead of one shared cone. So here a stand's own
 * nearest-to-now Open-Meteo point (fetched from its own coordinates) counts as its "local"
 * reading, and only falls back to the shared reading — the same live-sensor-or-regional
 * value every other screen shows — when that stand has no forecast data (no saved
 * location yet, or the fetch hasn't resolved/failed). */
export function resolveMapPinWind(
  weatherSeries: WeatherPoint[] | null,
  sharedWind: WindReading,
  nowMs: number,
): WindReading {
  const point = nearestWeatherPoint(weatherSeries, nowMs);
  if (!point) return sharedWind;
  return { directionDeg: point.directionDeg, speedMph: point.speedMph, updatedAt: point.timestampMs };
}
