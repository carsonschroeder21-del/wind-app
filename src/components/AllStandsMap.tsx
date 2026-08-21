import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type MapViewType from 'react-native-maps';
import type { Region } from 'react-native-maps';

import { loadMaps } from '../services/maps/loadMaps';
import { darkMapStyle } from '../theme/mapStyle';
import { palette } from '../theme/palette';
import type { Stand, WindReading } from '../types';
import { isWindUnfavorable, windTravelDirection } from '../utils/compass';
import { destinationPoint } from '../utils/geo';
import { gameAreaBearingDeg } from '../utils/gameArea';

const DEFAULT_REGION: Region = { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 20, longitudeDelta: 20 };
const MIN_DELTA = 0.05;
const BOUNDS_PADDING_FACTOR = 1.6;

// Matches CompassDial's wind cone geometry (same half-angle), projected onto real ground
// distance instead of a fixed-size SVG so it reads sensibly at any map zoom level.
const CONE_HALF_ANGLE_DEG = 16;
const CONE_DISTANCE_M = 300;

function scentConePolygon(pin: { latitude: number; longitude: number }, windDirectionDeg: number) {
  const goingDir = windTravelDirection(windDirectionDeg);
  return [
    pin,
    destinationPoint(pin, goingDir - CONE_HALF_ANGLE_DEG, CONE_DISTANCE_M),
    destinationPoint(pin, goingDir + CONE_HALF_ANGLE_DEG, CONE_DISTANCE_M),
  ];
}

export type LocatedStand = Stand & { latitude: number; longitude: number };

export function isLocated(stand: Stand): stand is LocatedStand {
  return stand.latitude != null && stand.longitude != null;
}

/** The region that fits every located stand on screen at once — "the Map tab's view."
 * Exported so other screens that want the exact same view (the Home screen's expanded
 * map layer) can animate to it instead of reimplementing the bounds math. */
export function regionForStands(located: LocatedStand[]): Region {
  if (located.length === 0) return DEFAULT_REGION;
  if (located.length === 1) {
    return { latitude: located[0].latitude, longitude: located[0].longitude, latitudeDelta: MIN_DELTA, longitudeDelta: MIN_DELTA };
  }

  const lats = located.map((s) => s.latitude);
  const lons = located.map((s) => s.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * BOUNDS_PADDING_FACTOR, MIN_DELTA),
    longitudeDelta: Math.max((maxLon - minLon) * BOUNDS_PADDING_FACTOR, MIN_DELTA),
  };
}

interface AllStandsMapViewProps {
  stands: Stand[];
  activeStandId: string | null;
  onSelectStand: (id: string) => void;
  /** Overrides the default "fit every stand" region for the map's initial mount — the
   * Home screen's compact background layer starts tightly zoomed on just the active
   * stand, then the caller animates it out to `regionForStands` via the ref on expand. */
  initialRegion?: Region;
  /** Shows the OS-provided "you are here" dot (requires location permission to already be
   * granted — the caller is responsible for requesting it). Off by default so existing
   * callers (Stand tab's map, Home's background layer) are unaffected. */
  showsUserLocation?: boolean;
  /** When provided, every pin also gets an always-visible name label and a scent-cone
   * wedge shaded green/red by whether the wind reading this resolver returns for that
   * stand is currently favorable — same cone geometry and color logic as CompassDial, just
   * projected onto the map instead of drawn in a fixed-size SVG. Omitted by callers that
   * just want plain pins, so this stays additive rather than a second map implementation. */
  resolveStandWind?: (stand: LocatedStand) => WindReading | null;
}

/** Bare map + stand pins, filling its parent — no border, no height prop, no "requires a
 * dev build" fallback (returns null instead, so a caller like the Home screen's map layer
 * can silently omit the whole feature rather than show StandScreen's fallback copy over a
 * compass dial). `AllStandsMap` below wraps this for its own bordered-card presentation;
 * this is the one real map-rendering implementation both share. Forwards the underlying
 * `react-native-maps` ref so a caller can call `animateToRegion` for a smooth pan/zoom. */
export const AllStandsMapView = forwardRef<MapViewType, AllStandsMapViewProps>(function AllStandsMapView(
  { stands, activeStandId, onSelectStand, initialRegion, showsUserLocation, resolveStandWind },
  ref,
) {
  const maps = loadMaps();
  if (!maps) return null;

  const { MapView, Marker, Polygon, PROVIDER_GOOGLE } = maps;
  const located = stands.filter(isLocated);

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion ?? regionForStands(located)}
      customMapStyle={darkMapStyle}
      showsUserLocation={showsUserLocation}
    >
      {resolveStandWind &&
        located.map((stand) => {
          const wind = resolveStandWind(stand);
          if (!wind) return null;
          const gameBearingDeg = gameAreaBearingDeg(stand);
          const isBad = isWindUnfavorable(wind.directionDeg, gameBearingDeg);
          const coneColor = isBad ? palette.bad : palette.good;
          return (
            <Polygon
              key={`cone-${stand.id}`}
              coordinates={scentConePolygon(stand, wind.directionDeg)}
              fillColor={`${coneColor}55`}
              strokeColor={coneColor}
              strokeWidth={1.5}
            />
          );
        })}

      {located.map((stand) => (
        <Marker
          key={stand.id}
          coordinate={{ latitude: stand.latitude, longitude: stand.longitude }}
          title={stand.name}
          description={`${stand.terrain}${stand.isEdge ? ' · Edge' : ''}`}
          pinColor={stand.id === activeStandId ? palette.amber : palette.gameDir}
          onPress={() => onSelectStand(stand.id)}
          anchor={resolveStandWind ? { x: 0.5, y: 1 } : undefined}
          tracksViewChanges={false}
        >
          {resolveStandWind && (
            <View style={styles.markerWrap}>
              <View style={styles.nameLabel}>
                <Text style={styles.nameLabelText} numberOfLines={1}>
                  {stand.name}
                </Text>
              </View>
              <View
                style={[
                  styles.pinDot,
                  { backgroundColor: stand.id === activeStandId ? palette.amber : palette.gameDir },
                ]}
              />
            </View>
          )}
        </Marker>
      ))}
    </MapView>
  );
});

interface AllStandsMapProps {
  stands: Stand[];
  activeStandId: string | null;
  onSelectStand: (id: string) => void;
  height?: number;
}

export function AllStandsMap({ stands, activeStandId, onSelectStand, height = 360 }: AllStandsMapProps) {
  const maps = loadMaps();
  const located = stands.filter(isLocated);
  const unlocatedCount = stands.length - located.length;

  if (!maps) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>
          Interactive map requires a development build.{'\n'}Switch to List view to manage your stands for now.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.mapBox, { height }]}>
        <AllStandsMapView stands={stands} activeStandId={activeStandId} onSelectStand={onSelectStand} />
      </View>
      {stands.length === 0 ? (
        <Text style={styles.hint}>No stands saved yet — add one from List view.</Text>
      ) : (
        unlocatedCount > 0 && (
          <Text style={styles.hint}>
            {unlocatedCount} stand{unlocatedCount === 1 ? '' : 's'} without a saved location{' '}
            {unlocatedCount === 1 ? "isn't" : "aren't"} shown — open it and drop a pin to add it here.
          </Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  markerWrap: { alignItems: 'center' },
  nameLabel: {
    maxWidth: 140,
    marginBottom: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(20,23,15,0.85)',
    borderWidth: 1,
    borderColor: palette.line,
  },
  nameLabelText: { color: palette.textHi, fontSize: 10, fontWeight: '600' },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.textHi,
  },
  mapBox: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: palette.line },
  hint: { color: palette.textLo, fontSize: 11, marginTop: 8 },
  fallback: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fallbackText: { color: palette.textLo, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
