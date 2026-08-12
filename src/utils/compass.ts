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

const BAD_WIND_THRESHOLD_DEG = 55;

/** True when the wind is carrying scent toward the hunter's `standFacingDeg` (the
 * expected game direction) — i.e. the direction the wind is actually blowing TOWARD
 * (`windDirectionDeg + 180`, since `windDirectionDeg` itself is where it's coming FROM)
 * roughly lines up with where the game is expected. */
export function isWindUnfavorable(windDirectionDeg: number, standFacingDeg: number): boolean {
  const goingDir = (windDirectionDeg + 180) % 360;
  return angularDiff(goingDir, standFacingDeg) < BAD_WIND_THRESHOLD_DEG;
}
