import type { EntryRouteAssessment, Stand, WindReading } from '../types';
import { angularDiff, isWindUnfavorable, windTravelDirection } from './compass';
import { assessEntryRoute } from './entryRoute';
import { gameAreaBearingDeg } from './gameArea';
import { assessThermal } from './thermal';

export interface StandRanking {
  stand: Stand;
  score: number;
  windFavorable: boolean;
  /** Angular distance between the wind's actual travel direction and the game bearing —
   * larger is safer (wind is carrying further away from the game area). Tie-breaker. */
  windMarginDeg: number;
  thermalFavorable: boolean | null;
  thermalLabel: string;
  /** Null when the stand has no parking pin set, so entry risk can't be assessed. */
  entryRisk: EntryRouteAssessment | null;
}

const WIND_WEIGHT = 2;
const THERMAL_WEIGHT = 1;
const ENTRY_WEIGHT = 1;

/** Ranks saved stands by how favorable current wind + thermal conditions are for each
 * one's facing direction and game-area elevation relationship, and — where a parking pin
 * is set — how exposed the walk-in is. A clean sit with a high-risk walk-in should rank
 * below a clean sit with clean access, all else equal. Highest score first. */
export function rankStands(stands: Stand[], wind: WindReading, hour: number): StandRanking[] {
  const rankings = stands.map((stand): StandRanking => {
    const gameBearingDeg = gameAreaBearingDeg(stand);
    const windMarginDeg = angularDiff(windTravelDirection(wind.directionDeg), gameBearingDeg);
    const windFavorable = !isWindUnfavorable(wind.directionDeg, gameBearingDeg);
    const thermal = assessThermal(hour, stand.gameAreaRelativeElevation);

    let score = windFavorable ? WIND_WEIGHT : -WIND_WEIGHT;
    if (thermal.favorable === true) score += THERMAL_WEIGHT;
    else if (thermal.favorable === false) score -= THERMAL_WEIGHT;

    let entryRisk: EntryRouteAssessment | null = null;
    if (stand.latitude != null && stand.longitude != null && stand.parkingLatitude != null && stand.parkingLongitude != null) {
      entryRisk = assessEntryRoute({
        stand: { latitude: stand.latitude, longitude: stand.longitude },
        parking: { latitude: stand.parkingLatitude, longitude: stand.parkingLongitude },
        standFacingDeg: stand.facingDeg,
        gameAreaLatitude: stand.gameAreaLatitude,
        gameAreaLongitude: stand.gameAreaLongitude,
        wind,
      });
      if (entryRisk.level === 'high') score -= ENTRY_WEIGHT;
      else if (entryRisk.level === 'moderate') score -= ENTRY_WEIGHT / 2;
    }

    return {
      stand,
      score,
      windFavorable,
      windMarginDeg,
      thermalFavorable: thermal.favorable,
      thermalLabel: thermal.label,
      entryRisk,
    };
  });

  return rankings.sort((a, b) => b.score - a.score || b.windMarginDeg - a.windMarginDeg);
}
