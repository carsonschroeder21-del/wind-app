import type { HuntLogEntry, Stand, WeatherPoint, WindReading } from '../types';
import { assessStandCooldown } from './cooldown';
import { isWindUnfavorable } from './compass';
import { assessEntryRoute } from './entryRoute';
import { gameAreaBearingDeg } from './gameArea';
import { assessTemperatureTrend } from './temperature';
import { assessThermal } from './thermal';

// The daily check runs in the evening and looks specifically at the 12-18h-out window —
// early morning prime time on a typical evening check — rather than the full forecast
// range assessEntryRoute/rankStands consider for "right now."
const WINDOW_START_HOURS = 12;
const WINDOW_END_HOURS = 18;

export interface GoodSitWindow {
  stand: Stand;
  atMs: number;
}

export interface FindGoodSitWindowInput {
  stands: Stand[];
  /** Forecast series per stand, keyed by stand id — whatever's already been fetched via
   * fetchWeatherSeries for each stand's own coordinates. Stands with no entry (no
   * location yet, or the fetch hasn't landed) are skipped. */
  weatherSeriesByStandId: Record<string, WeatherPoint[] | null | undefined>;
  huntLog: HuntLogEntry[];
  cooldownWindowDays: number;
  cooldownThreshold: number;
  fromMs: number;
}

/** Finds the first stand and hour, 12-18 hours out from `fromMs`, where wind, thermal,
 * and (where a parking pin is set) entry-risk conditions all genuinely align favorably —
 * a deliberately high bar (every factor has to be actively favorable, not just neutral),
 * so the once-daily notification only fires for real standout windows rather than every
 * so-so day. Skips stands currently flagged for a cooldown rest, since nudging a hunter
 * back to a stand that should be resting defeats the point of tracking it. Returns null
 * when nothing clears the bar. */
export function findGoodSitWindow({
  stands,
  weatherSeriesByStandId,
  huntLog,
  cooldownWindowDays,
  cooldownThreshold,
  fromMs,
}: FindGoodSitWindowInput): GoodSitWindow | null {
  const rangeStartMs = fromMs + WINDOW_START_HOURS * 60 * 60 * 1000;
  const rangeEndMs = fromMs + WINDOW_END_HOURS * 60 * 60 * 1000;

  for (const stand of stands) {
    if (stand.latitude == null || stand.longitude == null) continue;

    const cooldown = assessStandCooldown(stand.id, huntLog, fromMs, cooldownWindowDays, cooldownThreshold);
    if (cooldown.flagged) continue;

    const series = weatherSeriesByStandId[stand.id];
    if (!series) continue;

    const gameBearingDeg = gameAreaBearingDeg(stand);
    const hasParking = stand.parkingLatitude != null && stand.parkingLongitude != null;

    const candidates = series
      .filter((p) => p.timestampMs >= rangeStartMs && p.timestampMs <= rangeEndMs)
      .sort((a, b) => a.timestampMs - b.timestampMs);

    for (const point of candidates) {
      const wind: WindReading = { directionDeg: point.directionDeg, speedMph: point.speedMph, updatedAt: point.timestampMs };
      if (isWindUnfavorable(wind.directionDeg, gameBearingDeg)) continue;

      const temperatureTrend = assessTemperatureTrend(series, point.timestampMs);
      const thermal = assessThermal(new Date(point.timestampMs).getHours(), stand.gameAreaRelativeElevation, temperatureTrend);
      if (thermal.favorable !== true) continue;

      if (hasParking) {
        const entryRisk = assessEntryRoute({
          stand: { latitude: stand.latitude, longitude: stand.longitude },
          parking: { latitude: stand.parkingLatitude!, longitude: stand.parkingLongitude! },
          standFacingDeg: stand.facingDeg,
          gameAreaLatitude: stand.gameAreaLatitude,
          gameAreaLongitude: stand.gameAreaLongitude,
          wind,
        });
        if (entryRisk.level !== 'low') continue;
      }

      return { stand, atMs: point.timestampMs };
    }
  }

  return null;
}

function periodLabel(hour: number): string {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 16 && hour < 21) return 'evening';
  return 'midday';
}

/** "Tomorrow morning looks strong at Back Ridge — wind and thermals align around 6:14 AM." */
export function formatGoodSitMessage(window: GoodSitWindow, fromMs: number): string {
  const target = new Date(window.atMs);
  const dayWord = target.toDateString() === new Date(fromMs).toDateString() ? 'Today' : 'Tomorrow';
  const time = target.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dayWord} ${periodLabel(target.getHours())} looks strong at ${window.stand.name} — wind and thermals align around ${time}.`;
}
