import { nearestWeatherPoint } from '../services/weather/openMeteo';
import type { PressureAssessment, PressureTrend, WeatherPoint } from '../types';

const HPA_PER_INHG = 33.8639;

export function hpaToInHg(hpa: number): number {
  return hpa / HPA_PER_INHG;
}

// How far back to look for the comparison point. Long enough to smooth out hour-to-hour
// sensor/model noise, short enough to still catch a front moving in over a single sit.
const LOOKBACK_HOURS = 3;
// Meteorological rule of thumb: sustained drift under ~0.5 hPa/hr is noise, not a real
// trend. 1.5 hPa over the 3h lookback sits comfortably above that.
const TREND_THRESHOLD_HPA = 1.5;

/** Assesses whether pressure has been rising, falling, or holding steady over the past
 * `LOOKBACK_HOURS`, from the same hourly weather series the time slider already fetches.
 * Falling pressure — especially ahead of a front — is the classic signal for increased
 * deer movement, so it's framed positively; rising pressure (post-frontal, settled
 * weather) is framed as the opposite; steady is neutral. Returns null when there isn't
 * enough series data to compare (no location set yet, or the fetch hasn't landed). */
export function assessPressureTrend(weatherSeries: WeatherPoint[] | null, nowMs: number): PressureAssessment | null {
  const current = nearestWeatherPoint(weatherSeries, nowMs);
  const past = nearestWeatherPoint(weatherSeries, nowMs - LOOKBACK_HOURS * 60 * 60 * 1000);
  if (!current || !past) return null;

  const changeHpa = current.pressureHpa - past.pressureHpa;
  let trend: PressureTrend = 'steady';
  if (changeHpa <= -TREND_THRESHOLD_HPA) trend = 'falling';
  else if (changeHpa >= TREND_THRESHOLD_HPA) trend = 'rising';

  const currentInHg = hpaToInHg(current.pressureHpa).toFixed(2);

  if (trend === 'falling') {
    return {
      trend,
      currentHpa: current.pressureHpa,
      changeHpa,
      label: 'Pressure falling — movement likely increasing',
      detail: `${currentInHg} inHg, down ${Math.abs(changeHpa).toFixed(1)} hPa over the last ${LOOKBACK_HOURS}h`,
    };
  }
  if (trend === 'rising') {
    return {
      trend,
      currentHpa: current.pressureHpa,
      changeHpa,
      label: 'Pressure rising — movement likely settling down',
      detail: `${currentInHg} inHg, up ${changeHpa.toFixed(1)} hPa over the last ${LOOKBACK_HOURS}h`,
    };
  }
  return {
    trend,
    currentHpa: current.pressureHpa,
    changeHpa,
    label: 'Pressure steady',
    detail: `${currentInHg} inHg, holding over the last ${LOOKBACK_HOURS}h`,
  };
}
