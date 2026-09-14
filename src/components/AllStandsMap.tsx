import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type MapViewType from 'react-native-maps';
import type { LatLng, LongPressEvent, MapType, Region } from 'react-native-maps';

import { loadMaps } from '../services/maps/loadMaps';
import { darkMapStyle } from '../theme/mapStyle';
import { palette } from '../theme/palette';
import type { GameSightingPin, Stand, StandType, WindReading } from '../types';
import { isWindUnfavorable, toCompass, windTravelDirection } from '../utils/compass';
import { destinationPoint } from '../utils/geo';
import { gameAreaBearingDeg } from '../utils/gameArea';
import { GAME_SPECIES_STYLE, standTypeStyle } from '../utils/pinCategories';

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

export type { MapType };
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
  /** Basemap type — 'standard', 'satellite', or 'hybrid' (satellite + road/place labels).
   * Defaults to whatever react-native-maps itself defaults to ('standard') when omitted. */
  mapType?: MapType;
  /** When provided, every pin also gets an always-visible name label, a category-icon
   * badge (by the stand's standType) instead of a plain dot, and a small always-visible
   * wind-direction label (e.g. "NW") colored by whether the wind this resolver returns for
   * that stand is currently favorable — onX-style, no tap needed. Omitted by callers that
   * just want plain pins, so this stays additive rather than a second map implementation. */
  resolveStandWind?: (stand: LocatedStand) => WindReading | null;
  /** The one stand currently "expanded" (tapped) — only this stand gets the full scent
   * cone, drawn from `expandedWind` (which may reflect a time-slider offset rather than
   * "now") rather than `resolveStandWind`'s always-on now-only reading. Null/omitted means
   * no cone is drawn for anyone — same geometry/color logic as CompassDial's wind cone,
   * just projected onto the map instead of drawn in a fixed-size SVG. */
  expandedStandId?: string | null;
  expandedWind?: WindReading | null;
  /** Fires with the tapped-and-held coordinate — the Map screen's long-press pin-drop
   * menu. Omitted by callers that don't support dropping pins (Stand tab's map, the
   * editor's single-pin pickers). */
  onLongPress?: (coordinate: LatLng) => void;
  /** Game-sighting pins to render alongside the stand pins — only ever passed by the Map
   * screen, which is the only place they're droppable/visible. */
  sightingPins?: GameSightingPin[];
  onSelectSighting?: (id: string) => void;
  /** A stand-type pick from the long-press menu, rendered immediately at the exact
   * long-press coordinate with its real icon before the stand is actually saved — so the
   * pin shows up the instant a category is chosen rather than only after Save. */
  draftPin?: { latitude: number; longitude: number; standType: StandType } | null;
}

/** Bare map + stand pins, filling its parent — no border, no height prop, no "requires a
 * dev build" fallback (returns null instead, so a caller like the Home screen's map layer
 * can silently omit the whole feature rather than show StandScreen's fallback copy over a
 * compass dial). `AllStandsMap` below wraps this for its own bordered-card presentation;
 * this is the one real map-rendering implementation both share. Forwards the underlying
 * `react-native-maps` ref so a caller can call `animateToRegion` for a smooth pan/zoom. */
export const AllStandsMapView = forwardRef<MapViewType, AllStandsMapViewProps>(function AllStandsMapView(
  {
    stands,
    activeStandId,
    onSelectStand,
    initialRegion,
    showsUserLocation,
    mapType,
    resolveStandWind,
    onLongPress,
    sightingPins,
    onSelectSighting,
    draftPin,
    expandedStandId,
    expandedWind,
  },
  ref,
) {
  const maps = loadMaps();
  if (!maps) return null;

  const { MapView, Marker, Polygon, PROVIDER_GOOGLE } = maps;
  const located = stands.filter(isLocated);
  const draftPinStyle = draftPin ? standTypeStyle(draftPin.standType) : null;
  const DraftIcon = draftPinStyle?.icon;
  const expandedStand = expandedStandId ? located.find((s) => s.id === expandedStandId) : undefined;

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion ?? regionForStands(located)}
      customMapStyle={darkMapStyle}
      showsUserLocation={showsUserLocation}
      mapType={mapType}
      onLongPress={onLongPress ? (e: LongPressEvent) => onLongPress(e.nativeEvent.coordinate) : undefined}
    >
      {expandedStand &&
        expandedWind &&
        (() => {
          const gameBearingDeg = gameAreaBearingDeg(expandedStand);
          const isBad = isWindUnfavorable(expandedWind.directionDeg, gameBearingDeg);
          const coneColor = isBad ? palette.bad : palette.good;
          return (
            <Polygon
              coordinates={scentConePolygon(expandedStand, expandedWind.directionDeg)}
              fillColor={`${coneColor}55`}
              strokeColor={coneColor}
              strokeWidth={1.5}
            />
          );
        })()}

      {located.map((stand) => {
        const isActive = stand.id === activeStandId;
        const style = standTypeStyle(stand.standType);
        const Icon = style.icon;
        const nowWind = resolveStandWind?.(stand) ?? null;
        const windIsBad = nowWind ? isWindUnfavorable(nowWind.directionDeg, gameAreaBearingDeg(stand)) : null;
        return (
          <Marker
            key={stand.id}
            coordinate={{ latitude: stand.latitude, longitude: stand.longitude }}
            title={stand.name}
            description={`${stand.terrain}${stand.isEdge ? ' · Edge' : ''}`}
            pinColor={isActive ? palette.amber : palette.gameDir}
            onPress={() => onSelectStand(stand.id)}
            anchor={resolveStandWind ? { x: 0.5, y: 1 } : undefined}
          >
            {resolveStandWind && (
              <View style={styles.markerWrap}>
                <View style={styles.nameLabel}>
                  <Text style={styles.nameLabelText} numberOfLines={1}>
                    {stand.name}
                  </Text>
                </View>
                {nowWind && (
                  <View
                    style={[
                      styles.windLabel,
                      { borderColor: windIsBad ? palette.bad : palette.good },
                    ]}
                  >
                    <Text style={[styles.windLabelText, { color: windIsBad ? palette.bad : palette.good }]}>
                      {toCompass(nowWind.directionDeg)}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.pinBadge,
                    { backgroundColor: style.color, borderColor: isActive ? palette.amber : palette.textHi },
                  ]}
                >
                  <Icon size={14} color={palette.textHi} />
                </View>
              </View>
            )}
          </Marker>
        );
      })}

      {sightingPins?.map((pin) => {
        const style = GAME_SPECIES_STYLE[pin.species];
        const Icon = style.icon;
        return (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.species}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => onSelectSighting?.(pin.id)}
          >
            <View style={styles.markerWrap}>
              <View style={[styles.pinBadge, { backgroundColor: style.color, borderColor: palette.textHi }]}>
                <Icon size={14} color={palette.textHi} />
              </View>
            </View>
          </Marker>
        );
      })}

      {draftPin && draftPinStyle && DraftIcon && (
        <Marker coordinate={{ latitude: draftPin.latitude, longitude: draftPin.longitude }} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.markerWrap}>
            <View style={[styles.pinBadge, { backgroundColor: draftPinStyle.color, borderColor: palette.amber }]}>
              <DraftIcon size={14} color={palette.textHi} />
            </View>
          </View>
        </Marker>
      )}
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
  windLabel: {
    marginBottom: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(20,23,15,0.85)',
    borderWidth: 1,
  },
  windLabelText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  pinBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
