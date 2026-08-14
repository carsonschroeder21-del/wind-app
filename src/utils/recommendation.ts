import type { EntryRouteAssessment, Stand, WindReading } from '../types';
import { angularDiff, isWindUnfavorable } from './compass';
import { assessEntryRoute } from './entryRoute';
import { assessThermal } from './thermal';

export interface StandRanking {
  stand: Stand;
  score: number;
  windFavorable: boolean;
  /** Angular distance between wind and the stand's facing — larger is safer. Used as a tie-breaker. */
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
    const windMarginDeg = angularDiff(wind.directionDeg, stand.facingDeg);
    const windFavorable = !isWindUnfavorable(wind.directionDeg, stand.facingDeg);
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
