import type { HuntLogEntry, SightingOutcome } from '../types';

// Weighted so a harvest outranks a sighting, and either outranks a blank sit, when
// ranking stands/directions/times by "success" rather than just raw hunt count.
const SIGHTING_SCORE: Record<SightingOutcome, number> = { none: 0, 'saw-game': 1, harvest: 2 };

interface Tally {
  hunts: number;
  sightings: number;
  harvests: number;
  score: number;
}

function newTally(): Tally {
  return { hunts: 0, sightings: 0, harvests: 0, score: 0 };
}

function addToTally(tally: Tally, sighting: SightingOutcome): void {
  tally.hunts += 1;
  tally.score += SIGHTING_SCORE[sighting];
  if (sighting === 'saw-game') tally.sightings += 1;
  if (sighting === 'harvest') tally.harvests += 1;
}

/** windLabel is always produced internally by HomeScreen as `"${mph} mph ${toCompass(...)}"`
 * — the compass abbreviation (N, NNE, ... — never containing a space) is reliably the last
 * token, so there's no need for a second stored field just to recover it. */
function compassFromWindLabel(windLabel: string): string | null {
  const parts = windLabel.trim().split(/\s+/);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

function periodLabel(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 16) return 'Midday';
  if (hour >= 16 && hour < 21) return 'Evening';
  return 'Night';
}

/** Picks the tally with the highest score among entries with `score > 0` — "best
 * performing" is about where/when success actually happened, not just where most of the
 * sits happened. Returns null when nothing in the log has a logged sighting or harvest
 * yet, per-key ties broken by hunt count (more sits backing the same score reads as the
 * stronger signal). */
function pickBest<T extends { score: number; hunts: number }>(entries: T[]): T | null {
  const withScore = entries.filter((e) => e.score > 0);
  if (withScore.length === 0) return null;
  return withScore.sort((a, b) => b.score - a.score || b.hunts - a.hunts)[0];
}

export interface StandStat {
  standName: string;
  hunts: number;
  sightings: number;
  harvests: number;
}

export interface BucketStat {
  label: string;
  hunts: number;
  sightings: number;
  harvests: number;
}

export interface SeasonReport {
  totalSits: number;
  mostHuntedStand: StandStat | null;
  mostSuccessfulStand: StandStat | null;
  bestWindDirection: BucketStat | null;
  bestTimeOfDay: BucketStat | null;
}

/** Summarizes the accumulated hunt log — most-hunted stand, most-successful stand, the
 * best-performing wind direction and time-of-day bucket (by logged sightings/harvests),
 * and total sits. Entries with no `standId` (logged before per-stand tracking existed)
 * count toward totals but are skipped for the stand breakdowns, same as the cooldown
 * tracker and recommendation engine already do. */
export function buildSeasonReport(huntLog: HuntLogEntry[]): SeasonReport {
  const standTallies = new Map<string, { standName: string } & Tally>();
  const directionTallies = new Map<string, Tally>();
  const periodTallies = new Map<string, Tally>();

  for (const entry of huntLog) {
    if (entry.standId) {
      const t = standTallies.get(entry.standId) ?? { standName: entry.standName, ...newTally() };
      addToTally(t, entry.sighting);
      standTallies.set(entry.standId, t);
    }

    const compass = compassFromWindLabel(entry.windLabel);
    if (compass) {
      const t = directionTallies.get(compass) ?? newTally();
      addToTally(t, entry.sighting);
      directionTallies.set(compass, t);
    }

    const period = periodLabel(new Date(entry.timestamp).getHours());
    const t = periodTallies.get(period) ?? newTally();
    addToTally(t, entry.sighting);
    periodTallies.set(period, t);
  }

  const standStats = [...standTallies.values()].map((t) => ({
    standName: t.standName || 'Unknown stand',
    hunts: t.hunts,
    sightings: t.sightings,
    harvests: t.harvests,
    score: t.score,
  }));
  const directionStats = [...directionTallies.entries()].map(([compass, t]) => ({ label: compass, ...t }));
  const periodStats = [...periodTallies.entries()].map(([label, t]) => ({ label, ...t }));

  const mostHuntedStand = standStats.length > 0 ? standStats.sort((a, b) => b.hunts - a.hunts)[0] : null;

  return {
    totalSits: huntLog.length,
    mostHuntedStand,
    mostSuccessfulStand: pickBest(standStats),
    bestWindDirection: pickBest(directionStats),
    bestTimeOfDay: pickBest(periodStats),
  };
}
