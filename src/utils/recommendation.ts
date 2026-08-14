import type { EntryRouteAssessment, HuntLogEntry, Stand, StandCooldownStatus, WindReading } from '../types';
import { angularDiff, isWindUnfavorable, windTravelDirection } from './compass';
import { assessStandCooldown } from './cooldown';
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
  cooldown: StandCooldownStatus;
}

const WIND_WEIGHT = 2;
const THERMAL_WEIGHT = 1;
const ENTRY_WEIGHT = 1;
// Weighted like wind — a flagged stand should be able to drop below an otherwise-clean
// sit, not just nudge it down as a tie-breaker.
const COOLDOWN_WEIGHT = 2;

export interface RankStandsInput {
  stands: Stand[];
  wind: WindReading;
  hour: number;
  nowMs: number;
  huntLog: HuntLogEntry[];
  cooldownWindowDays: number;
  cooldownThreshold: number;
}

/** Ranks saved stands by how favorable current wind + thermal conditions are for each
 * one's facing direction and game-area elevation relationship, how exposed the walk-in is
 * (where a parking pin is set), and whether the stand is due for a rest. A clean sit that's
 * been overhunted, or has a high-risk walk-in, should rank below a clean sit without those
 * problems, all else equal. Highest score first. */
export function rankStands({
  stands,
  wind,
  hour,
  nowMs,
  huntLog,
  cooldownWindowDays,
  cooldownThreshold,
}: RankStandsInput): StandRanking[] {
  const rankings = stands.map((stand): StandRanking => {
    const gameBearingDeg = gameAreaBearingDeg(stand);
    const windMarginDeg = angularDiff(windTravelDirection(wind.directionDeg), gameBearingDeg);
    const windFavorable = !isWindUnfavorable(wind.directionDeg, gameBearingDeg);
    const thermal = assessThermal(hour, stand.gameAreaRelativeElevation);
    const cooldown = assessStandCooldown(stand.id, huntLog, nowMs, cooldownWindowDays, cooldownThreshold);

    let score = windFavorable ? WIND_WEIGHT : -WIND_WEIGHT;
    if (thermal.favorable === true) score += THERMAL_WEIGHT;
    else if (thermal.favorable === false) score -= THERMAL_WEIGHT;
    if (cooldown.flagged) score -= COOLDOWN_WEIGHT;

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
      cooldown,
    };
  });

  return rankings.sort((a, b) => b.score - a.score || b.windMarginDeg - a.windMarginDeg);
}
