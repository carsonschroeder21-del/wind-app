import type { Stand } from '../types';
import type { GeoPoint } from './geo';
import { bearingBetween, destinationPoint } from './geo';

/** Fields needed to resolve where "the game area" is for a stand — either the real
 * dropped pin, or (for stands saved before the pin existed, or that haven't dropped one
 * yet) the legacy facing-angle fallback. */
export type GameAreaSource = Pick<
  Stand,
  'latitude' | 'longitude' | 'facingDeg' | 'gameAreaLatitude' | 'gameAreaLongitude'
>;

export function hasGameAreaPin(
  stand: GameAreaSource,
): stand is GameAreaSource & { gameAreaLatitude: number; gameAreaLongitude: number } {
  return stand.gameAreaLatitude != null && stand.gameAreaLongitude != null;
}

// How far out to project the facing-angle fallback into an actual point, for stands with
// no dropped game-area pin. Matches the reference distance the entry-risk feature used
// before real pins existed.
const FALLBACK_GAME_DISTANCE_M = 400;

/** The actual point to treat as "the game area" — the real dropped pin when one exists,
 * else a synthetic point projected out along the stand's saved facing angle, for callers
 * that need real geometry (e.g. bearing-to-game from points along an entry route) rather
 * than just a single direction. */
export function resolveGameAreaPoint(stand: GameAreaSource & GeoPoint): GeoPoint {
  if (hasGameAreaPin(stand)) {
    return { latitude: stand.gameAreaLatitude, longitude: stand.gameAreaLongitude };
  }
  return destinationPoint(stand, stand.facingDeg, FALLBACK_GAME_DISTANCE_M);
}

/** Bearing from the stand to the game area — computed from the real dropped pin when the
 * stand's own location and a game-area pin both exist, else the saved facing angle
 * directly (also the fallback when the stand has no location yet, since a bearing can't
 * be computed from an unset origin). */
export function gameAreaBearingDeg(stand: GameAreaSource): number {
  if (stand.latitude != null && stand.longitude != null && hasGameAreaPin(stand)) {
    return bearingBetween(
      { latitude: stand.latitude, longitude: stand.longitude },
      { latitude: stand.gameAreaLatitude, longitude: stand.gameAreaLongitude },
    );
  }
  return stand.facingDeg;
}
