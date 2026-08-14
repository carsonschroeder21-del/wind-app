import type { HuntLogEntry, StandCooldownStatus } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Counts how many times a stand has been hunted within a rolling window ending at
 * `nowMs`, and flags it once that count reaches `threshold` — overhunting a spot
 * pressures deer into avoiding it, so a flagged stand is a candidate to rest rather than
 * hunt again immediately. `windowDays`/`threshold` are user-configurable (Alerts screen). */
export function assessStandCooldown(
  standId: string,
  huntLog: HuntLogEntry[],
  nowMs: number,
  windowDays: number,
  threshold: number,
): StandCooldownStatus {
  const cutoffMs = nowMs - windowDays * DAY_MS;
  const huntsInWindow = huntLog.filter((entry) => entry.standId === standId && entry.timestamp >= cutoffMs).length;
  return { flagged: huntsInWindow >= threshold, huntsInWindow, windowDays, threshold };
}
