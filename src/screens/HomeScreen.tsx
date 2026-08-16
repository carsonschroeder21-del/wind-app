import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CompassDial } from '../components/CompassDial';
import { HomeMapReveal, HOME_MAP_COMPACT_HEIGHT } from '../components/HomeMapReveal';
import { HuntLogModal } from '../components/HuntLogModal';
import { PressureIndicator } from '../components/PressureIndicator';
import { StandRecommendation } from '../components/StandRecommendation';
import { StatusBadge } from '../components/StatusBadge';
import { ThermalIndicator } from '../components/ThermalIndicator';
import { ThermalLogModal } from '../components/ThermalLogModal';
import { loadMaps } from '../services/maps/loadMaps';
import { fetchWeatherSeries } from '../services/weather/openMeteo';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { SightingOutcome, ThermalObservation, WeatherPoint } from '../types';
import { isWindUnfavorable, toCompass } from '../utils/compass';
import { gameAreaBearingDeg } from '../utils/gameArea';
import { assessPressureTrend } from '../utils/pressure';
import { rankStands } from '../utils/recommendation';
import { assessThermal, getThermalDirection } from '../utils/thermal';
import { formatRelativeTime } from '../utils/time';
import { genId } from '../utils/id';

export function HomeScreen() {
  const wind = useAppStore((s) => s.wind);
  const stands = useAppStore((s) => s.stands);
  const activeStandId = useAppStore((s) => s.activeStandId);
  const setActiveStandId = useAppStore((s) => s.setActiveStandId);
  const addThermalLogEntry = useAppStore((s) => s.addThermalLogEntry);
  const addHuntLogEntry = useAppStore((s) => s.addHuntLogEntry);
  const huntLog = useAppStore((s) => s.huntLog);
  const cooldownWindowDays = useAppStore((s) => s.cooldownWindowDays);
  const cooldownThreshold = useAppStore((s) => s.cooldownThreshold);
  const windSensorConnected = useAppStore((s) => s.windSensor.state === 'connected');

  const activeStand = stands.find((s) => s.id === activeStandId) ?? null;
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [huntLogModalVisible, setHuntLogModalVisible] = useState(false);
  const [weatherSeries, setWeatherSeries] = useState<WeatherPoint[] | null>(null);
  const [rootHeight, setRootHeight] = useState(0);

  useEffect(() => {
    if (activeStand?.latitude == null || activeStand?.longitude == null) {
      setWeatherSeries(null);
      return;
    }
    let cancelled = false;
    fetchWeatherSeries(activeStand.latitude, activeStand.longitude).then((points) => {
      if (!cancelled) setWeatherSeries(points);
    });
    return () => {
      cancelled = true;
    };
  }, [activeStand?.latitude, activeStand?.longitude]);

  const hour = new Date().getHours();
  const gameBearingDeg = activeStand != null ? gameAreaBearingDeg(activeStand) : null;
  const isBad = gameBearingDeg != null && isWindUnfavorable(wind.directionDeg, gameBearingDeg);
  const thermal = assessThermal(hour, activeStand?.gameAreaRelativeElevation ?? 'level');
  const pressure = assessPressureTrend(weatherSeries, Date.now());
  const rankings = rankStands({
    stands,
    wind,
    hour,
    nowMs: Date.now(),
    huntLog,
    cooldownWindowDays,
    cooldownThreshold,
  });

  // Background map layer only makes sense with a real stand to center on, and only
  // renders anywhere react-native-maps actually works (dev-client/EAS build) — same
  // Expo-Go/web fallback the Stand tab's map already uses, just applied one level up so
  // the compass dial/banners render exactly as before when it's not available.
  const mapsAvailable = loadMaps() != null;
  const useMapLayer = mapsAvailable && activeStand != null;

  const handleSubmitObservation = (observed: ThermalObservation) => {
    if (activeStand) {
      addThermalLogEntry({
        id: genId(),
        timestamp: Date.now(),
        standId: activeStand.id,
        standName: activeStand.name,
        terrain: activeStand.terrain,
        predicted: getThermalDirection(hour),
        observed,
        windDirectionDeg: wind.directionDeg,
        windSpeedMph: wind.speedMph,
      });
    }
    setLogModalVisible(false);
  };

  const handleSubmitHunt = ({ sighting, note }: { sighting: SightingOutcome; note: string }) => {
    if (activeStand) {
      addHuntLogEntry({
        id: genId(),
        timestamp: Date.now(),
        standId: activeStand.id,
        standName: activeStand.name,
        windLabel: `${wind.speedMph} mph ${toCompass(wind.directionDeg)}`,
        terrain: activeStand.terrain,
        isEdge: activeStand.isEdge,
        sighting,
        note,
      });
    }
    setHuntLogModalVisible(false);
  };

  const dialSection = (
    <>
      <StatusBadge live={windSensorConnected} />

      <View style={styles.dialWrap}>
        <CompassDial windDir={wind.directionDeg} gameBearingDeg={gameBearingDeg} />
        <View style={styles.mphWrap}>
          <Text style={styles.mphText}>
            {wind.speedMph} <Text style={styles.mphUnit}>mph</Text>
          </Text>
          <Text style={styles.fromText}>WIND FROM {toCompass(wind.directionDeg)}</Text>
        </View>
      </View>

      {activeStand && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: isBad ? 'rgba(193,87,63,0.15)' : 'rgba(127,174,118,0.15)',
              borderColor: isBad ? palette.bad : palette.good,
            },
          ]}
        >
          <View style={[styles.bannerDot, { backgroundColor: isBad ? palette.bad : palette.good }]} />
          <Text style={styles.bannerText}>
            {isBad
              ? 'Scent likely carrying toward your target area.'
              : 'Wind is carrying away from your target area.'}
          </Text>
        </View>
      )}
    </>
  );

  const bodyContent = (
    <>
      {activeStand ? (
        <>
          <ThermalIndicator hour={hour} gameAreaRelativeElevation={activeStand.gameAreaRelativeElevation} />

          {pressure && <PressureIndicator assessment={pressure} />}

          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>ACTIVE STAND</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {activeStand.name}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>LAST UPDATE</Text>
              <Text style={styles.infoValue}>{formatRelativeTime(wind.updatedAt)}</Text>
            </View>
          </View>

          <Pressable onPress={() => setLogModalVisible(true)} style={styles.logButton}>
            <Text style={styles.logButtonText}>Log What You're Seeing</Text>
          </Pressable>

          <Pressable onPress={() => setHuntLogModalVisible(true)} style={styles.logButton}>
            <Text style={styles.logButtonText}>Log This Hunt</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyBannerText}>
            No active stand yet — add one in the Stand tab to see thermal guidance and recommendations here.
          </Text>
        </View>
      )}

      <StandRecommendation rankings={rankings} activeStandId={activeStandId} onSelect={setActiveStandId} />
    </>
  );

  return (
    <View style={styles.root} onLayout={(e) => setRootHeight(e.nativeEvent.layout.height)}>
      {useMapLayer && (
        <HomeMapReveal
          stands={stands}
          activeStand={activeStand}
          activeStandId={activeStandId}
          onSelectStand={setActiveStandId}
          fullHeight={rootHeight}
        >
          {dialSection}
        </HomeMapReveal>
      )}

      <ScrollView
        contentContainerStyle={[styles.container, useMapLayer && { paddingTop: HOME_MAP_COMPACT_HEIGHT + 24 }]}
      >
        {!useMapLayer && dialSection}
        {bodyContent}
      </ScrollView>

      <ThermalLogModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        onSubmit={handleSubmitObservation}
      />

      {activeStand && (
        <HuntLogModal
          visible={huntLogModalVisible}
          standName={activeStand.name}
          onClose={() => setHuntLogModalVisible(false)}
          onSubmit={handleSubmitHunt}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  dialWrap: { alignItems: 'center' },
  mphWrap: { marginTop: 12, alignItems: 'center' },
  mphText: { color: palette.textHi, fontSize: 34, fontFamily: mono, fontWeight: '700' },
  mphUnit: { fontSize: 16, color: palette.textLo, fontWeight: '400' },
  fromText: { color: palette.textLo, fontSize: 12, letterSpacing: 1 },
  banner: {
    marginTop: 24,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerDot: { width: 10, height: 10, borderRadius: 5 },
  bannerText: { color: palette.textHi, fontSize: 13, flex: 1 },
  emptyBanner: {
    marginTop: 24,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emptyBannerText: { color: palette.textLo, fontSize: 13, lineHeight: 18 },
  infoRow: { marginTop: 16, width: '100%', flexDirection: 'row', gap: 12 },
  infoCard: { flex: 1, borderRadius: 8, padding: 12, backgroundColor: palette.panel },
  infoLabel: { color: palette.textLo, fontSize: 10, letterSpacing: 1 },
  infoValue: { color: palette.textHi, fontSize: 18, fontFamily: mono, marginTop: 2 },
  logButton: {
    marginTop: 16,
    width: '100%',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: palette.line,
  },
  logButtonText: { color: palette.textHi, fontSize: 13 },
});
