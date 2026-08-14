const EARTH_RADIUS_M = 6371000;
const METERS_TO_FEET = 3.28084;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Forward azimuth (initial compass bearing) from one point to another, in degrees. */
export function bearingBetween(from: GeoPoint, to: GeoPoint): number {
  const phi1 = toRad(from.latitude);
  const phi2 = toRad(to.latitude);
  const deltaLambda = toRad(to.longitude - from.longitude);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Great-circle distance between two points, in meters. Fine at walking/hunting scales —
 * no need for anything more precise than the spherical-earth approximation here. */
export function distanceMetersBetween(from: GeoPoint, to: GeoPoint): number {
  const phi1 = toRad(from.latitude);
  const phi2 = toRad(to.latitude);
  const deltaPhi = toRad(to.latitude - from.latitude);
  const deltaLambda = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function metersToFeet(meters: number): number {
  return meters * METERS_TO_FEET;
}

/** The point reached by travelling a given bearing and distance from a start point. */
export function destinationPoint(from: GeoPoint, bearingDeg: number, distanceMeters: number): GeoPoint {
  const delta = distanceMeters / EARTH_RADIUS_M;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(from.latitude);
  const lambda1 = toRad(from.longitude);

  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
  const lambda2 =
    lambda1 +
    Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));

  return { latitude: toDeg(phi2), longitude: toDeg(lambda2) };
}

/** Point a fraction `t` (0 = from, 1 = to) along the straight line between two points.
 * Plain linear interpolation of lat/lon — indistinguishable from the true geodesic at the
 * walking distances a stand's entry route covers. */
export function lerpPoint(from: GeoPoint, to: GeoPoint, t: number): GeoPoint {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * t,
    longitude: from.longitude + (to.longitude - from.longitude) * t,
  };
}
