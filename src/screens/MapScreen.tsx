import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from 'react-native-maps';
import type MapViewType from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AllStandsMapView, isLocated } from '../components/AllStandsMap';
import type { LocatedStand, MapType } from '../components/AllStandsMap';
import { MapTypeToggle } from '../components/MapTypeToggle';
import { PinCategoryPicker } from '../components/PinCategoryPicker';
import { RecenterButton } from '../components/RecenterButton';
import { SightingDetailSheet } from '../components/SightingDetailSheet';
import { StandEditor } from '../components/StandEditor';
import { StandsDropdown } from '../components/StandsDropdown';
import type { StandWindSnapshot } from '../components/StandsDropdown';
import { useStandWeatherSeries } from '../hooks/useStandWeatherSeries';
import { getCurrentLocation } from '../services/location';
import { loadMaps } from '../services/maps/loadMaps';
import { StandDetailScreen } from './StandDetailScreen';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import type { StandType } from '../types';
import { isWindUnfavorable } from '../utils/compass';
import { gameAreaBearingDeg } from '../utils/gameArea';
import { genId } from '../utils/id';
import { resolveMapPinWind } from '../utils/mapPinWind';
import { GAME_SIGHTING_CATEGORIES } from '../utils/pinCategories';
import type { PinCategory } from '../utils/pinCategories';

const RECENTER_ZOOM_DELTA = 0.01;
const RECENTER_ANIM_MS = 400;

// What's shown in the bottom-sheet Modal — full stand detail, the stand editor (new,
// prefilled from a long-press pin drop, or editing an existing one), or nothing.
type MapSheet =
  | { kind: 'detail'; standId: string }
  | { kind: 'edit'; standId: string | null; initialLocation?: LatLng; initialStandType?: StandType }
  | null;

export function MapScreen() {
  const stands = useAppStore((s) => s.stands);
  const activeStandId = useAppStore((s) => s.activeStandId);
  const setActiveStandId = useAppStore((s) => s.setActiveStandId);
  const wind = useAppStore((s) => s.wind);
  const sightingPins = useAppStore((s) => s.sightingPins);
  const addSightingPin = useAppStore((s) => s.addSightingPin);
  const updateSightingPin = useAppStore((s) => s.updateSightingPin);
  const deleteSightingPin = useAppStore((s) => s.deleteSightingPin);

  const [sheet, setSheet] = useState<MapSheet>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [recentering, setRecentering] = useState(false);
  const [longPressCoord, setLongPressCoord] = useState<LatLng | null>(null);
  const [pickerMode, setPickerMode] = useState<'all' | 'sighting-only' | null>(null);
  const [selectedSightingId, setSelectedSightingId] = useState<string | null>(null);
  const mapRef = useRef<MapViewType>(null);
  const located = useMemo(() => stands.filter(isLocated), [stands]);
  const seriesByStandId = useStandWeatherSeries(located);

  useEffect(() => {
    // Fires after the map's already mounted/painted (zoomed to fit every saved pin via
    // AllStandsMapView's default region) — satisfies "fit pins, then ask for location."
    void Location.requestForegroundPermissionsAsync();
  }, []);

  const resolveStandWind = (stand: LocatedStand) =>
    resolveMapPinWind(seriesByStandId[stand.id] ?? null, wind, Date.now());

  const snapshots: StandWindSnapshot[] = useMemo(() => {
    const nowMs = Date.now();
    return stands.map((stand) => {
      const series = isLocated(stand) ? (seriesByStandId[stand.id] ?? null) : null;
      const standWind = resolveMapPinWind(series, wind, nowMs);
      const isBad = isWindUnfavorable(standWind.directionDeg, gameAreaBearingDeg(stand));
      return { stand, wind: standWind, isBad };
    });
  }, [stands, seriesByStandId, wind]);

  const handleSelectStand = (id: string) => {
    setActiveStandId(id);
    setSheet({ kind: 'detail', standId: id });
  };

  const handleRecenter = async () => {
    setRecentering(true);
    // Reuses the same permission request the initial map-fit flow already made — this only
    // re-prompts if the hunter denied it then, otherwise it's an instant cached grant.
    const result = await getCurrentLocation();
    setRecentering(false);

    if (!result.ok) {
      Alert.alert(
        'Location unavailable',
        result.reason === 'permission-denied'
          ? 'Location permission denied — enable it in Settings to recenter the map.'
          : "Couldn't get your location. Try again.",
      );
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        latitudeDelta: RECENTER_ZOOM_DELTA,
        longitudeDelta: RECENTER_ZOOM_DELTA,
      },
      RECENTER_ANIM_MS,
    );
  };

  const handleLongPress = (coordinate: LatLng) => {
    setLongPressCoord(coordinate);
    setPickerMode('all');
  };

  const closePicker = () => {
    setPickerMode(null);
    setLongPressCoord(null);
  };

  const handleSelectCategory = (category: PinCategory) => {
    const coordinate = longPressCoord;
    const changingSightingId = pickerMode === 'sighting-only' ? selectedSightingId : null;
    closePicker();
    if (!coordinate && !changingSightingId) return;

    if (category.kind === 'stand') {
      setSheet({ kind: 'edit', standId: null, initialLocation: coordinate ?? undefined, initialStandType: category.standType });
      return;
    }

    if (changingSightingId) {
      updateSightingPin(changingSightingId, { species: category.species });
      setSelectedSightingId(null);
      return;
    }

    if (coordinate) {
      addSightingPin({
        id: genId(),
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        species: category.species,
        timestamp: Date.now(),
      });
    }
  };

  const handleChangeSightingSpecies = () => {
    setPickerMode('sighting-only');
  };

  const handleDeleteSighting = () => {
    if (!selectedSightingId) return;
    deleteSightingPin(selectedSightingId);
    setSelectedSightingId(null);
  };

  const maps = loadMaps();
  const selectedSighting = sightingPins.find((p) => p.id === selectedSightingId) ?? null;

  return (
    <View style={styles.container}>
      {maps ? (
        <>
          <AllStandsMapView
            ref={mapRef}
            stands={stands}
            activeStandId={activeStandId}
            onSelectStand={handleSelectStand}
            showsUserLocation
            mapType={mapType}
            resolveStandWind={resolveStandWind}
            onLongPress={handleLongPress}
            sightingPins={sightingPins}
            onSelectSighting={setSelectedSightingId}
          />
          <View style={styles.floatingControls}>
            <RecenterButton onPress={handleRecenter} busy={recentering} />
            <MapTypeToggle value={mapType} onChange={setMapType} />
          </View>
        </>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            Interactive map requires a development build.{'\n'}Switch to the Stand tab's List view for now.
          </Text>
        </View>
      )}

      <StandsDropdown snapshots={snapshots} activeStandId={activeStandId} onSelectStand={handleSelectStand} />

      <PinCategoryPicker
        visible={pickerMode != null}
        categories={pickerMode === 'sighting-only' ? GAME_SIGHTING_CATEGORIES : undefined}
        onClose={closePicker}
        onSelect={handleSelectCategory}
      />

      <SightingDetailSheet
        // Hidden while the "change type" picker is open on top of it, rather than
        // stacking two backdropped sheets at once.
        pin={pickerMode == null ? selectedSighting : null}
        onClose={() => setSelectedSightingId(null)}
        onChangeSpecies={handleChangeSightingSpecies}
        onDelete={handleDeleteSighting}
      />

      <Modal visible={sheet != null} animationType="slide" onRequestClose={() => setSheet(null)}>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          {sheet?.kind === 'detail' && (
            <StandDetailScreen
              standId={sheet.standId}
              onBack={() => setSheet(null)}
              onEdit={() => setSheet({ kind: 'edit', standId: sheet.standId })}
            />
          )}
          {sheet?.kind === 'edit' && (
            <StandEditor
              standId={sheet.standId}
              initialLocation={sheet.initialLocation ?? null}
              initialStandType={sheet.initialStandType ?? null}
              onDone={() => setSheet(null)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  floatingControls: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 20,
    elevation: 20,
  },
  sheet: { flex: 1, backgroundColor: palette.bg },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: palette.bg,
  },
  fallbackText: { color: palette.textLo, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
