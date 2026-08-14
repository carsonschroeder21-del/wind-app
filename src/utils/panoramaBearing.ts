/** Normalizes a degree value to (-180, 180], the range Pannellum's yaw expects. */
function normalizeSigned(deg: number): number {
  let d = deg % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}

/** Converts a real-world compass bearing to the panorama viewer's internal yaw, given the
 * panorama's calibrated north offset. Derived directly from Pannellum's own northOffset
 * convention (its compass-needle rotation is `-(yaw + northOffset)`, i.e. the needle points
 * true north when `yaw = -northOffset` — so in general `bearing = yaw + northOffset`). */
export function bearingToYaw(bearingDeg: number, northOffsetDeg: number): number {
  return normalizeSigned(bearingDeg - northOffsetDeg);
}

/** Derives a panorama's north offset from the yaw the viewer was showing when the hunter
 * confirmed they were facing true north (the calibration step). */
export function calibrateNorthOffset(yawWhenFacingNorthDeg: number): number {
  return normalizeSigned(-yawWhenFacingNorthDeg);
}
