import { useEffect, useState } from 'react';

import { fetchWeatherSeries } from '../services/weather/openMeteo';
import type { WeatherPoint } from '../types';

interface LocatedStandLike {
  id: string;
  latitude: number;
  longitude: number;
}

/** Fetches each given stand's own weather series (for the map's per-pin "local" wind
 * cones), keyed by stand id. Re-fetches only when the set of stands or their coordinates
 * actually changes — `fetchWeatherSeries` already caches per rounded coordinate, so
 * stands sharing a property dedupe onto one request. */
export function useStandWeatherSeries(stands: LocatedStandLike[]): Record<string, WeatherPoint[] | null> {
  const [seriesByStandId, setSeriesByStandId] = useState<Record<string, WeatherPoint[] | null>>({});
  const key = stands.map((s) => `${s.id}:${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`).join('|');

  useEffect(() => {
    let cancelled = false;
    Promise.all(stands.map(async (s) => [s.id, await fetchWeatherSeries(s.latitude, s.longitude)] as const)).then(
      (entries) => {
        if (!cancelled) setSeriesByStandId(Object.fromEntries(entries));
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return seriesByStandId;
}
