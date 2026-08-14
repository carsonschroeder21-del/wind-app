import { nearestWeatherPoint } from '../services/weather/openMeteo';
import type { ConditionsSource, ResolvedConditions, WeatherPoint, WindHistoryEntry, WindReading } from '../types';
import { formatLogTimestamp } from './time';

// Within this window of "now," the slider just tracks the live reading rather than
// hunting through history/forecast — matches the Live/Regional badge shown elsewhere.
const NOW_TOLERANCE_MS = 5 * 60 * 1000;
// A logged sensor reading only counts as "the" historical reading for a target time if
// it's reasonably close to it — otherwise a stale reading from hours away would be
// misleading to show as if it were measured at that moment.
const HISTORY_MATCH_TOLERANCE_MS = 15 * 60 * 1000;

export interface ConditionsAtTimeParams {
  targetMs: number;
  nowMs: number;
  liveWind: WindReading;
  windSensorConnected: boolean;
  windHistory: WindHistoryEntry[];
  weatherSeries: WeatherPoint[] | null;
}

function nearestHistoryEntry(
  history: WindHistoryEntry[],
  targetMs: number,
  maxDistanceMs: number,
): WindHistoryEntry | null {
  let closest: WindHistoryEntry | null = null;
  let closestDist = Infinity;
  for (const entry of history) {
    const dist = Math.abs(entry.updatedAt - targetMs);
    if (dist < closestDist) {
      closest = entry;
      closestDist = dist;
    }
  }
  return closest && closestDist <= maxDistanceMs ? closest : null;
}

function labelFor(source: ConditionsSource, targetMs: number): string {
  switch (source) {
    case 'live':
      return 'Live · Sensor';
    case 'regional':
      return 'Regional · Estimate';
    case 'historical-sensor':
      return `Historical · ${formatLogTimestamp(targetMs)} · Sensor`;
    case 'historical-estimate':
      return `Historical · ${formatLogTimestamp(targetMs)} · Estimate`;
    case 'forecast':
      return `Forecast · ${formatLogTimestamp(targetMs)}`;
    case 'no-data':
      return `No data · ${formatLogTimestamp(targetMs)}`;
  }
}

/** Picks which data source feeds the wind reading shown for a given slider position —
 * live sensor/regional estimate at "now," logged sensor history or the weather API's
 * historical hours in the past, and the weather API's forecast in the future. */
export function resolveConditionsAtTime(params: ConditionsAtTimeParams): ResolvedConditions {
  const { targetMs, nowMs, liveWind, windSensorConnected, windHistory, weatherSeries } = params;

  if (Math.abs(targetMs - nowMs) <= NOW_TOLERANCE_MS) {
    const source: ConditionsSource = windSensorConnected ? 'live' : 'regional';
    return { source, wind: liveWind, label: labelFor(source, targetMs) };
  }

  if (targetMs < nowMs) {
    const sensorEntry =
      nearestHistoryEntry(
        windHistory.filter((e) => e.source === 'live'),
        targetMs,
        HISTORY_MATCH_TOLERANCE_MS,
      ) ?? null;
    if (sensorEntry) {
      return {
        source: 'historical-sensor',
        wind: { directionDeg: sensorEntry.directionDeg, speedMph: sensorEntry.speedMph, updatedAt: sensorEntry.updatedAt },
        label: labelFor('historical-sensor', targetMs),
      };
    }

    const weatherPoint = nearestWeatherPoint(weatherSeries, targetMs);
    if (weatherPoint) {
      return {
        source: 'historical-estimate',
        wind: { directionDeg: weatherPoint.directionDeg, speedMph: weatherPoint.speedMph, updatedAt: weatherPoint.timestampMs },
        label: labelFor('historical-estimate', targetMs),
      };
    }

    return { source: 'no-data', wind: null, label: labelFor('no-data', targetMs) };
  }

  const weatherPoint = nearestWeatherPoint(weatherSeries, targetMs);
  if (weatherPoint) {
    return {
      source: 'forecast',
      wind: { directionDeg: weatherPoint.directionDeg, speedMph: weatherPoint.speedMph, updatedAt: weatherPoint.timestampMs },
      label: labelFor('forecast', targetMs),
    };
  }

  return { source: 'no-data', wind: null, label: labelFor('no-data', targetMs) };
}
