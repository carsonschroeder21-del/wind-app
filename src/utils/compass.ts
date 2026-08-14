const DIRS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
] as const;

export function toCompass(deg: number): string {
  const idx = Math.round((deg % 360) / 22.5) % 16;
  return DIRS[(idx + 16) % 16];
}

/** Smallest absolute angular difference between two headings, in [0, 180]. */
export function angularDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/** The direction the wind is actually blowing TOWARD, given `windDirectionDeg` — the
 * direction it's coming FROM (the convention `WindReading.directionDeg` stores). Anything
 * that compares a wind direction against a bearing (a game direction, a facing angle) needs
 * this flip first — comparing the raw FROM direction against a bearing silently inverts
 * the result. */
export function windTravelDirection(windDirectionDeg: number): number {
  return (windDirectionDeg + 180) % 360;
}

const BAD_WIND_THRESHOLD_DEG = 55;

/** True when the wind is carrying scent toward `gameBearingDeg` (the bearing to the
 * expected game area — from the real dropped pin when set, else the stand's facing angle)
 * — i.e. the direction the wind is actually blowing TOWARD roughly lines up with it. */
export function isWindUnfavorable(windDirectionDeg: number, gameBearingDeg: number): boolean {
  return angularDiff(windTravelDirection(windDirectionDeg), gameBearingDeg) < BAD_WIND_THRESHOLD_DEG;
}
