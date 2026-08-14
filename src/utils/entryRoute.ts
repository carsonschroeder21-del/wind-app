import type { EntryRouteAssessment, WeatherPoint, WindReading } from '../types';
import { isWindUnfavorable } from './compass';
import type { GeoPoint } from './geo';
import { bearingBetween, destinationPoint, distanceMetersBetween, lerpPoint, metersToFeet } from './geo';

// How far out to treat the expected game area as being, for the purpose of checking
// exposure at points *along* the walk-in (not just at the stand itself). Far enough to
// represent "out there" rather than right next to the stand, but not so far that bearing
// to it stops varying across a realistic walk-in — an infinitely-distant reference point
// would make every point on the path share the stand's own bearing, which would silently
// collapse this into a single all-or-nothing check instead of a real per-segment one.
const GAME_REFERENCE_DISTANCE_M = 400;
const PATH_SAMPLES = 12;
// A route counts as "high risk" once more than half of it is exposed — below that, some
// exposure but not most of it reads as "moderate."
const HIGH_RISK_FRACTION = 0.5;

export interface EntryRouteInput {
  stand: GeoPoint;
  parking: GeoPoint;
  standFacingDeg: number;
  wind: WindReading;
}

function positionLabel(t: number): string {
  if (t < 0.34) return 'near your parking spot';
  if (t < 0.67) return 'near the midpoint';
  return 'near the stand';
}

/** Assesses scent exposure along the straight-line walk-in between a parking spot and the
 * stand, for a single wind reading. Samples points along that line and checks — using the
 * same angularDiff/cone-half-angle test the wind cone itself uses — whether the wind at
 * that moment would carry scent released at each point toward the expected game area. */
export function assessEntryRoute({ stand, parking, standFacingDeg, wind }: EntryRouteInput): EntryRouteAssessment {
  const gameArea = destinationPoint(stand, standFacingDeg, GAME_REFERENCE_DISTANCE_M);
  const totalMeters = distanceMetersBetween(parking, stand);

  let exposedCount = 0;
  let firstExposedT: number | null = null;
  let lastExposedT: number | null = null;

  for (let i = 0; i <= PATH_SAMPLES; i++) {
    const t = i / PATH_SAMPLES;
    const point = lerpPoint(parking, stand, t);
    const bearingToGame = bearingBetween(point, gameArea);
    // Same test the rest of the app uses to decide whether wind is carrying toward a
    // given bearing (isWindUnfavorable) — just applied at each point along the walk-in
    // instead of only at the stand itself.
    const exposed = isWindUnfavorable(wind.directionDeg, bearingToGame);
    if (exposed) {
      exposedCount += 1;
      if (firstExposedT == null) firstExposedT = t;
      lastExposedT = t;
    }
  }

  const exposedFraction = exposedCount / (PATH_SAMPLES + 1);
  const exposedFeet = metersToFeet(totalMeters) * exposedFraction;
  const totalFeet = metersToFeet(totalMeters);

  if (exposedFraction === 0) {
    return {
      level: 'low',
      exposedFraction,
      exposedFeet,
      totalFeet,
      label: 'Low risk — wind carries away from your walk-in path',
    };
  }

  if (exposedFraction >= HIGH_RISK_FRACTION) {
    return {
      level: 'high',
      exposedFraction,
      exposedFeet,
      totalFeet,
      label: 'High risk — wind carries directly along your entry route toward the game area',
    };
  }

  const midT = ((firstExposedT ?? 0) + (lastExposedT ?? 0)) / 2;
  return {
    level: 'moderate',
    exposedFraction,
    exposedFeet,
    totalFeet,
    label: `Moderate risk — wind crosses your path ${positionLabel(midT)}`,
  };
}

export interface BestEntryWindowInput {
  stand: GeoPoint;
  parking: GeoPoint;
  standFacingDeg: number;
  weatherSeries: WeatherPoint[];
  fromMs: number;
  horizonHours?: number;
}

export interface BestEntryWindow {
  startMs: number;
  endMs: number;
  assessment: EntryRouteAssessment;
}

/** Scans the weather forecast over the next few hours to find the hour with the least
 * scent exposure along the entry route — an hour at a time, matching the forecast data's
 * own resolution rather than implying more precision than an hourly forecast can give. */
export function findBestEntryWindow({
  stand,
  parking,
  standFacingDeg,
  weatherSeries,
  fromMs,
  horizonHours = 6,
}: BestEntryWindowInput): BestEntryWindow | null {
  const horizonMs = fromMs + horizonHours * 60 * 60 * 1000;
  const upcoming = weatherSeries
    .filter((p) => p.timestampMs >= fromMs && p.timestampMs <= horizonMs)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  let best: BestEntryWindow | null = null;
  for (const point of upcoming) {
    const assessment = assessEntryRoute({
      stand,
      parking,
      standFacingDeg,
      wind: { directionDeg: point.directionDeg, speedMph: point.speedMph, updatedAt: point.timestampMs },
    });
    if (!best || assessment.exposedFraction < best.assessment.exposedFraction) {
      best = { startMs: point.timestampMs, endMs: point.timestampMs + 60 * 60 * 1000, assessment };
    }
  }

  return best;
}
