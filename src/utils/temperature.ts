import { nearestWeatherPoint } from '../services/weather/openMeteo';
import type { WeatherPoint } from '../types';

export type TemperatureTrend = 'rising' | 'falling' | 'flat';

// Same lookback as the pressure trend tracker — long enough to smooth out hourly noise.
const LOOKBACK_HOURS = 3;
// Degrees F over the lookback window to count as a real trend rather than noise.
const TREND_THRESHOLD_F = 2;

/** Rising/falling/flat temperature trend over the last few hours, from the same hourly
 * weather series the pressure tracker uses. This is the tiebreaker thermal.ts's
 * resolveThermalDirection() uses to pick rising/sinking during midday/transition windows
 * instead of giving up with "unknown." Null when there isn't enough series data to
 * compare (no location yet, or the fetch hasn't landed) — callers should treat that the
 * same as a flat/no-signal trend. */
export function assessTemperatureTrend(weatherSeries: WeatherPoint[] | null, atMs: number): TemperatureTrend | null {
  const current = nearestWeatherPoint(weatherSeries, atMs);
  const past = nearestWeatherPoint(weatherSeries, atMs - LOOKBACK_HOURS * 60 * 60 * 1000);
  if (!current || !past) return null;

  const changeF = current.temperatureF - past.temperatureF;
  if (changeF >= TREND_THRESHOLD_F) return 'rising';
  if (changeF <= -TREND_THRESHOLD_F) return 'falling';
  return 'flat';
}
