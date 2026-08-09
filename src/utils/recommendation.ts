import type { Stand, WindReading } from '../types';
import { angularDiff, isWindUnfavorable } from './compass';
import { assessThermal } from './thermal';

export interface StandRanking {
  stand: Stand;
  score: number;
  windFavorable: boolean;
  /** Angular distance between wind and the stand's facing — larger is safer. Used as a tie-breaker. */
  windMarginDeg: number;
  thermalFavorable: boolean | null;
  thermalLabel: string;
}

const WIND_WEIGHT = 2;
const THERMAL_WEIGHT = 1;

/** Ranks saved stands by how favorable current wind + thermal conditions are for each
 * one's facing direction and game-area elevation relationship. Highest score first. */
export function rankStands(stands: Stand[], wind: WindReading, hour: number): StandRanking[] {
  const rankings = stands.map((stand): StandRanking => {
    const windMarginDeg = angularDiff(wind.directionDeg, stand.facingDeg);
    const windFavorable = !isWindUnfavorable(wind.directionDeg, stand.facingDeg);
    const thermal = assessThermal(hour, stand.gameAreaRelativeElevation);

    let score = windFavorable ? WIND_WEIGHT : -WIND_WEIGHT;
    if (thermal.favorable === true) score += THERMAL_WEIGHT;
    else if (thermal.favorable === false) score -= THERMAL_WEIGHT;

    return {
      stand,
      score,
      windFavorable,
      windMarginDeg,
      thermalFavorable: thermal.favorable,
      thermalLabel: thermal.label,
    };
  });

  return rankings.sort((a, b) => b.score - a.score || b.windMarginDeg - a.windMarginDeg);
}
