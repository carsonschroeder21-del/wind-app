import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CompassDial } from '../components/CompassDial';
import { StandRecommendation } from '../components/StandRecommendation';
import { StatusBadge } from '../components/StatusBadge';
import { ThermalIndicator } from '../components/ThermalIndicator';
import { ThermalLogModal } from '../components/ThermalLogModal';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { ThermalObservation } from '../types';
import { isWindUnfavorable, toCompass } from '../utils/compass';
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
  const windSensorConnected = useAppStore((s) => s.windSensor.state === 'connected');

  const activeStand = stands.find((s) => s.id === activeStandId) ?? null;
  const [logModalVisible, setLogModalVisible] = useState(false);

  const hour = new Date().getHours();
  const isBad = activeStand != null && isWindUnfavorable(wind.directionDeg, activeStand.facingDeg);
  const thermal = assessThermal(hour, activeStand?.gameAreaRelativeElevation ?? 'level');
  const rankings = rankStands(stands, wind, hour);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBadge live={windSensorConnected} />

      <View style={styles.dialWrap}>
        <CompassDial windDir={wind.directionDeg} standFacing={activeStand?.facingDeg ?? null} />
        <View style={styles.mphWrap}>
          <Text style={styles.mphText}>
            {wind.speedMph} <Text style={styles.mphUnit}>mph</Text>
          </Text>
          <Text style={styles.fromText}>WIND FROM {toCompass(wind.directionDeg)}</Text>
        </View>
      </View>

      {activeStand ? (
        <>
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

          <ThermalIndicator hour={hour} gameAreaRelativeElevation={activeStand.gameAreaRelativeElevation} />

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
        </>
      ) : (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyBannerText}>
            No active stand yet — add one in the Stand tab to see thermal guidance and recommendations here.
          </Text>
        </View>
      )}

      <StandRecommendation rankings={rankings} activeStandId={activeStandId} onSelect={setActiveStandId} />

      <ThermalLogModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        onSubmit={handleSubmitObservation}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
