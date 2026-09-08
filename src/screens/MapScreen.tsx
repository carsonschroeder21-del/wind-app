import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AllStandsMapView, isLocated } from '../components/AllStandsMap';
import type { LocatedStand, MapType } from '../components/AllStandsMap';
import { MapTypeToggle } from '../components/MapTypeToggle';
import { StandsDropdown } from '../components/StandsDropdown';
import type { StandWindSnapshot } from '../components/StandsDropdown';
import { useStandWeatherSeries } from '../hooks/useStandWeatherSeries';
import { loadMaps } from '../services/maps/loadMaps';
import { StandDetailScreen } from './StandDetailScreen';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { isWindUnfavorable } from '../utils/compass';
import { gameAreaBearingDeg } from '../utils/gameArea';
import { resolveMapPinWind } from '../utils/mapPinWind';

export function MapScreen() {
  const stands = useAppStore((s) => s.stands);
  const activeStandId = useAppStore((s) => s.activeStandId);
  const setActiveStandId = useAppStore((s) => s.setActiveStandId);
  const wind = useAppStore((s) => s.wind);

  const [sheetStandId, setSheetStandId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
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
    setSheetStandId(id);
  };

  const maps = loadMaps();

  return (
    <View style={styles.container}>
      {maps ? (
        <>
          <AllStandsMapView
            stands={stands}
            activeStandId={activeStandId}
            onSelectStand={handleSelectStand}
            showsUserLocation
            mapType={mapType}
            resolveStandWind={resolveStandWind}
          />
          <MapTypeToggle value={mapType} onChange={setMapType} />
        </>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            Interactive map requires a development build.{'\n'}Switch to the Stand tab's List view for now.
          </Text>
        </View>
      )}

      <StandsDropdown snapshots={snapshots} activeStandId={activeStandId} onSelectStand={handleSelectStand} />

      <Modal
        visible={sheetStandId != null}
        animationType="slide"
        onRequestClose={() => setSheetStandId(null)}
      >
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          {sheetStandId != null && (
            <StandDetailScreen standId={sheetStandId} onBack={() => setSheetStandId(null)} />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
