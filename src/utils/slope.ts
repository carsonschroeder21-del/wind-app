import type { GameAreaRelativeElevation } from '../types';
import { angularDiff } from './compass';
import { destinationPoint } from './geo';
import type { GeoPoint } from './geo';

// A short distance out is enough to characterize the local slope around a stand without
// sampling terrain unrelated to it.
const SAMPLE_DISTANCE_M = 150;
// Total elevation spread across the sampled points below this counts as "basically flat" —
// no meaningful slope to call above/below, so it defaults to level regardless of facing.
const FLAT_RANGE_FT = 8;
// How closely the game bearing has to line up with the slope's uphill/downhill axis to
// count as "the game area is on that side," rather than a sidehill shot across the slope.
const ALIGNMENT_THRESHOLD_DEG = 60;

/** The 5 points to sample for a stand's local slope: itself, then north/south/east/west a
 * short distance out. Exported so the caller can batch-fetch elevation for all of them in
 * one request (`fetchElevationsFt` accepts a list). Order matters — `detectRelativeElevation`
 * expects elevations back in this same [center, north, south, east, west] order. */
export function slopeSamplePoints(center: GeoPoint): GeoPoint[] {
  return [
    center,
    destinationPoint(center, 0, SAMPLE_DISTANCE_M),
    destinationPoint(center, 180, SAMPLE_DISTANCE_M),
    destinationPoint(center, 90, SAMPLE_DISTANCE_M),
    destinationPoint(center, 270, SAMPLE_DISTANCE_M),
  ];
}

/** Auto-detects whether the game area (in the given bearing — the real game-area pin's
 * bearing when set, else the facing direction) sits above, level with, or below the stand,
 * from the local slope alone. Replaces the old manual "Game Area Is..." picker: samples
 * elevation around the stand independent of any bearing (find the slope's steepest-ascent
 * direction first), then checks how closely the bearing of interest lines up with that
 * uphill/downhill axis. `elevationsFt` must be in `slopeSamplePoints`' order. */
export function detectRelativeElevation(
  elevationsFt: (number | null)[] | null,
  gameBearingDeg: number,
): GameAreaRelativeElevation {
  if (!elevationsFt) return 'level';
  const [center, north, south, east, west] = elevationsFt;
  if (center == null || north == null || south == null || east == null || west == null) return 'level';

  const range = Math.max(center, north, south, east, west) - Math.min(center, north, south, east, west);
  if (range < FLAT_RANGE_FT) return 'level';

  const northSlope = north - south;
  const eastSlope = east - west;
  if (northSlope === 0 && eastSlope === 0) return 'level';

  // Compass bearing of steepest ascent (0 = north, 90 = east).
  const uphillBearing = (((Math.atan2(eastSlope, northSlope) * 180) / Math.PI) + 360) % 360;
  const downhillBearing = (uphillBearing + 180) % 360;

  if (angularDiff(gameBearingDeg, uphillBearing) <= ALIGNMENT_THRESHOLD_DEG) return 'above';
  if (angularDiff(gameBearingDeg, downhillBearing) <= ALIGNMENT_THRESHOLD_DEG) return 'below';
  return 'level';
}
