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
import { QuickStandSheet } from '../components/QuickStandSheet';
import type { DraftStandPin, QuickStandSaveInput } from '../components/QuickStandSheet';
import { RecenterButton } from '../components/RecenterButton';
import { SightingDetailSheet } from '../components/SightingDetailSheet';
import { StandEditor } from '../components/StandEditor';
import { StandQuickView } from '../components/StandQuickView';
import { StandsDropdown } from '../components/StandsDropdown';
import type { StandWindSnapshot } from '../components/StandsDropdown';
import { useStandWeatherSeries } from '../hooks/useStandWeatherSeries';
import { getCurrentLocation } from '../services/location';
import { loadMaps } from '../services/maps/loadMaps';
import { StandDetailScreen } from './StandDetailScreen';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { isWindUnfavorable } from '../utils/compass';
import { resolveConditionsAtTime } from '../utils/conditionsAtTime';
import { gameAreaBearingDeg } from '../utils/gameArea';
import { genId } from '../utils/id';
import { resolveMapPinWind } from '../utils/mapPinWind';
import { GAME_SIGHTING_CATEGORIES } from '../utils/pinCategories';
import type { PinCategory } from '../utils/pinCategories';
import { assessTemperatureTrend } from '../utils/temperature';

const RECENTER_ZOOM_DELTA = 0.01;
const RECENTER_ANIM_MS = 400;

// What's shown in the bottom-sheet Modal — full stand detail, or editing an existing
// stand. Creating a new stand no longer goes through this Modal at all — see draftPin.
type MapSheet = { kind: 'detail'; standId: string } | { kind: 'edit'; standId: string } | null;

export function MapScreen() {
  const stands = useAppStore((s) => s.stands);
  const activeStandId = useAppStore((s) => s.activeStandId);
  const setActiveStandId = useAppStore((s) => s.setActiveStandId);
  const addStand = useAppStore((s) => s.addStand);
  const wind = useAppStore((s) => s.wind);
  const windSensorConnected = useAppStore((s) => s.windSensor.state === 'connected');
  const windHistory = useAppStore((s) => s.windHistory);
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
  // A stand-type pick from the long-press menu drops this immediately — rendered on the
  // map right away with its real icon, at the exact long-press coordinate, before the
  // stand actually exists — QuickStandSheet turns it into a real saved Stand on Save.
  const [draftPin, setDraftPin] = useState<DraftStandPin | null>(null);
  // The one stand whose scent cone + StandQuickView are showing — set by tapping its pin
  // or its dropdown row, cleared by the panel's close button. offsetMinutes drives the
  // time slider inside that panel and resets whenever a different stand is expanded.
  const [expandedStandId, setExpandedStandId] = useState<string | null>(null);
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const mapRef = useRef<MapViewType>(null);
  const located = useMemo(() => stands.filter(isLocated), [stands]);
  const seriesByStandId = useStandWeatherSeries(located);
  const activeStand = stands.find((s) => s.id === activeStandId) ?? null;

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
    setExpandedStandId(id);
    setOffsetMinutes(0);
  };

  const handleCloseQuickView = () => setExpandedStandId(null);

  const handleViewFullDetails = () => {
    if (!expandedStandId) return;
    setSheet({ kind: 'detail', standId: expandedStandId });
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
      if (coordinate) {
        setDraftPin({ latitude: coordinate.latitude, longitude: coordinate.longitude, standType: category.standType });
      }
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

  const handleQuickSave = (input: QuickStandSaveInput) => {
    if (!draftPin) return;
    const newId = addStand({
      name: input.name,
      terrain: input.terrain,
      standType: draftPin.standType,
      isEdge: input.isEdge,
      facingDeg: input.facingDeg,
      latitude: draftPin.latitude,
      longitude: draftPin.longitude,
      elevationFt: input.elevationFt,
      gameAreaRelativeElevation: input.gameAreaRelativeElevation,
      media: null,
      gameAreaLatitude: null,
      gameAreaLongitude: null,
      parkingLatitude: null,
      parkingLongitude: null,
    });
    setActiveStandId(newId);
    setDraftPin(null);
  };

  const maps = loadMaps();
  const selectedSighting = sightingPins.find((p) => p.id === selectedSightingId) ?? null;

  const expandedStand = stands.find((s) => s.id === expandedStandId) ?? null;
  const expandedSeries = expandedStand ? (seriesByStandId[expandedStand.id] ?? null) : null;
  const nowMs = Date.now();
  const targetMs = nowMs + offsetMinutes * 60 * 1000;
  const targetHour = new Date(targetMs).getHours();
  // Same time-adjustable resolver StandDetailScreen's own time slider already uses — the
  // scent cone and StandQuickView's wind readout both read off this, so dragging the
  // slider moves the cone exactly the way the full detail screen's compass dial would.
  const resolved = expandedStand
    ? resolveConditionsAtTime({
        targetMs,
        nowMs,
        liveWind: wind,
        windSensorConnected,
        windHistory,
        weatherSeries: expandedSeries,
      })
    : null;
  const expandedTemperatureTrend = expandedStand ? assessTemperatureTrend(expandedSeries, targetMs) : null;

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
            draftPin={draftPin}
            expandedStandId={expandedStandId}
            expandedWind={resolved?.wind ?? null}
          />
          {!expandedStand && (
            <View style={styles.floatingControls}>
              <RecenterButton onPress={handleRecenter} busy={recentering} />
              <MapTypeToggle value={mapType} onChange={setMapType} />
            </View>
          )}
        </>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            Interactive map requires a development build.{'\n'}Switch to the Stand tab's List view for now.
          </Text>
        </View>
      )}

      {!expandedStand && (
        <StandsDropdown snapshots={snapshots} activeStandId={activeStandId} onSelectStand={handleSelectStand} />
      )}

      <StandQuickView
        stand={expandedStand}
        offsetMinutes={offsetMinutes}
        onChangeOffset={setOffsetMinutes}
        windDirectionDeg={resolved?.wind?.directionDeg ?? null}
        windSpeedMph={resolved?.wind?.speedMph ?? null}
        dataSource={resolved?.source ?? 'no-data'}
        dataLabel={resolved?.label ?? ''}
        hour={targetHour}
        temperatureTrend={expandedTemperatureTrend}
        onClose={handleCloseQuickView}
        onViewFullDetails={handleViewFullDetails}
      />

      <PinCategoryPicker
        visible={pickerMode != null}
        categories={pickerMode === 'sighting-only' ? GAME_SIGHTING_CATEGORIES : undefined}
        onClose={closePicker}
        onSelect={handleSelectCategory}
      />

      <QuickStandSheet
        draftPin={draftPin}
        defaultFacingDeg={activeStand?.facingDeg ?? 0}
        onCancel={() => setDraftPin(null)}
        onSave={handleQuickSave}
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
          {sheet?.kind === 'edit' && <StandEditor standId={sheet.standId} onDone={() => setSheet(null)} />}
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
