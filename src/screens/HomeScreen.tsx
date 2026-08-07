import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CompassDial } from '../components/CompassDial';
import { StatusBadge } from '../components/StatusBadge';
import { ThermalIndicator } from '../components/ThermalIndicator';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import { isWindUnfavorable, toCompass } from '../utils/compass';
import { formatRelativeTime } from '../utils/time';

// TODO: source from GPS + a terrain/elevation lookup once that's wired up. For now these
// mirror the demo values from the web prototype.
const STAND_ELEVATION_FT = 620;
const GAME_AREA_ELEVATION_FT = 540;

export function HomeScreen() {
  const wind = useAppStore((s) => s.wind);
  const standFacingDeg = useAppStore((s) => s.standFacingDeg);
  const windSensorConnected = useAppStore((s) => s.windSensor.state === 'connected');

  const isBad = isWindUnfavorable(wind.directionDeg, standFacingDeg);
  const hour = new Date().getHours();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBadge live={windSensorConnected} />

      <View style={styles.dialWrap}>
        <CompassDial windDir={wind.directionDeg} standFacing={standFacingDeg} />
        <View style={styles.mphWrap}>
          <Text style={styles.mphText}>
            {wind.speedMph} <Text style={styles.mphUnit}>mph</Text>
          </Text>
          <Text style={styles.fromText}>WIND FROM {toCompass(wind.directionDeg)}</Text>
        </View>
      </View>

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

      <ThermalIndicator
        hour={hour}
        standElevationFt={STAND_ELEVATION_FT}
        gameAreaElevationFt={GAME_AREA_ELEVATION_FT}
      />

      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>YOUR STAND FACING</Text>
          <Text style={styles.infoValue}>{toCompass(standFacingDeg)}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>LAST UPDATE</Text>
          <Text style={styles.infoValue}>{formatRelativeTime(wind.updatedAt)}</Text>
        </View>
      </View>
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
  infoRow: { marginTop: 16, width: '100%', flexDirection: 'row', gap: 12 },
  infoCard: { flex: 1, borderRadius: 8, padding: 12, backgroundColor: palette.panel },
  infoLabel: { color: palette.textLo, fontSize: 10, letterSpacing: 1 },
  infoValue: { color: palette.textHi, fontSize: 18, fontFamily: mono, marginTop: 2 },
});
