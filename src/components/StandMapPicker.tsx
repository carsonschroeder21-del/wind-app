import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LatLng, MapPressEvent, MarkerDragStartEndEvent, Region } from 'react-native-maps';

import { loadMaps } from '../services/maps/loadMaps';
import { darkMapStyle } from '../theme/mapStyle';
import { palette } from '../theme/palette';

// Geographic center of the contiguous US, zoomed way out — a reasonable starting point
// for a stand with no coordinates yet, so the hunter can pan/zoom to find their spot.
const DEFAULT_REGION: Region = { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 20, longitudeDelta: 20 };
const PIN_ZOOM_DELTA = 0.01;

interface StandMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onPick: (coords: LatLng) => void;
  height?: number;
}

export function StandMapPicker({ latitude, longitude, onPick, height = 200 }: StandMapPickerProps) {
  const maps = loadMaps();

  // Computed once — MapView owns its own pan/zoom after that. Re-centering on every
  // coordinate change would yank the map out from under a hunter who just dragged it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialRegion: Region = useMemo(
    () => (latitude != null && longitude != null
      ? { latitude, longitude, latitudeDelta: PIN_ZOOM_DELTA, longitudeDelta: PIN_ZOOM_DELTA }
      : DEFAULT_REGION),
    [],
  );

  if (!maps) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>
          Interactive map requires a development build.{'\n'}Use "Use Current Location" below for now.
        </Text>
      </View>
    );
  }

  const { MapView, Marker, PROVIDER_GOOGLE } = maps;

  return (
    <View>
      <View style={[styles.mapBox, { height }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          customMapStyle={darkMapStyle}
          onPress={(e: MapPressEvent) => onPick(e.nativeEvent.coordinate)}
        >
          {latitude != null && longitude != null && (
            <Marker
              coordinate={{ latitude, longitude }}
              draggable
              onDragEnd={(e: MarkerDragStartEndEvent) => onPick(e.nativeEvent.coordinate)}
              pinColor={palette.amber}
            />
          )}
        </MapView>
      </View>
      <Text style={styles.hint}>Tap the map or drag the pin to set your stand&apos;s location</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: palette.line },
  hint: { color: palette.textLo, fontSize: 11, marginTop: 6 },
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
