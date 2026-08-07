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

/** True when wind blowing from `windDirectionDeg` is roughly opposite the hunter's
 * `standFacingDeg` — i.e. likely to carry scent toward the game area. */
export function isWindUnfavorable(windDirectionDeg: number, standFacingDeg: number): boolean {
  return angularDiff(windDirectionDeg, standFacingDeg) < BAD_WIND_THRESHOLD_DEG;
}
