import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type MapViewType from 'react-native-maps';
import type { Region } from 'react-native-maps';

import { loadMaps } from '../services/maps/loadMaps';
import { darkMapStyle } from '../theme/mapStyle';
import { palette } from '../theme/palette';
import type { Stand } from '../types';

const DEFAULT_REGION: Region = { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 20, longitudeDelta: 20 };
const MIN_DELTA = 0.05;
const BOUNDS_PADDING_FACTOR = 1.6;

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
}

/** Bare map + stand pins, filling its parent — no border, no height prop, no "requires a
 * dev build" fallback (returns null instead, so a caller like the Home screen's map layer
 * can silently omit the whole feature rather than show StandScreen's fallback copy over a
 * compass dial). `AllStandsMap` below wraps this for its own bordered-card presentation;
 * this is the one real map-rendering implementation both share. Forwards the underlying
 * `react-native-maps` ref so a caller can call `animateToRegion` for a smooth pan/zoom. */
export const AllStandsMapView = forwardRef<MapViewType, AllStandsMapViewProps>(function AllStandsMapView(
  { stands, activeStandId, onSelectStand, initialRegion },
  ref,
) {
  const maps = loadMaps();
  if (!maps) return null;

  const { MapView, Marker, PROVIDER_GOOGLE } = maps;
  const located = stands.filter(isLocated);

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion ?? regionForStands(located)}
      customMapStyle={darkMapStyle}
    >
      {located.map((stand) => (
        <Marker
          key={stand.id}
          coordinate={{ latitude: stand.latitude, longitude: stand.longitude }}
          title={stand.name}
          description={`${stand.terrain}${stand.isEdge ? ' · Edge' : ''}`}
          pinColor={stand.id === activeStandId ? palette.amber : palette.gameDir}
          onPress={() => onSelectStand(stand.id)}
        />
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
