import { Check, ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CompassDial } from '../components/CompassDial';
import { DataSourceLabel } from '../components/DataSourceLabel';
import { ThermalIndicator } from '../components/ThermalIndicator';
import { TimeSlider } from '../components/TimeSlider';
import { fetchWeatherWindSeries } from '../services/weather/openMeteo';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { WeatherPoint } from '../types';
import { isWindUnfavorable, toCompass } from '../utils/compass';
import { resolveConditionsAtTime } from '../utils/conditionsAtTime';

const MIN_OFFSET_MINUTES = -24 * 60;
const MAX_OFFSET_MINUTES = 48 * 60;

interface StandDetailScreenProps {
  standId: string;
  onBack: () => void;
}

export function StandDetailScreen({ standId, onBack }: StandDetailScreenProps) {
  const stand = useAppStore((s) => s.stands.find((st) => st.id === standId) ?? null);
  const activeStandId = useAppStore((s) => s.activeStandId);
  const setActiveStandId = useAppStore((s) => s.setActiveStandId);
  const liveWind = useAppStore((s) => s.wind);
  const windSensorConnected = useAppStore((s) => s.windSensor.state === 'connected');
  const windHistory = useAppStore((s) => s.windHistory);

  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [weatherSeries, setWeatherSeries] = useState<WeatherPoint[] | null>(null);

  useEffect(() => {
    if (stand?.latitude == null || stand?.longitude == null) {
      setWeatherSeries(null);
      return;
    }
    let cancelled = false;
    fetchWeatherWindSeries(stand.latitude, stand.longitude).then((points) => {
      if (!cancelled) setWeatherSeries(points);
    });
    return () => {
      cancelled = true;
    };
  }, [stand?.latitude, stand?.longitude]);

  if (!stand) {
    return (
      <View style={styles.container}>
        <Text style={styles.missingText}>Stand not found.</Text>
      </View>
    );
  }

  const nowMs = Date.now();
  const targetMs = nowMs + offsetMinutes * 60 * 1000;
  const hour = new Date(targetMs).getHours();

  const resolved = resolveConditionsAtTime({
    targetMs,
    nowMs,
    liveWind,
    windSensorConnected,
    windHistory,
    weatherSeries,
  });

  const isBad = resolved.wind != null && isWindUnfavorable(resolved.wind.directionDeg, stand.facingDeg);
  const isActive = stand.id === activeStandId;
  const hasLocation = stand.latitude != null && stand.longitude != null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={20} color={palette.textHi} />
          <Text style={styles.backText}>Stands</Text>
        </Pressable>
        {!isActive && (
          <Pressable onPress={() => setActiveStandId(stand.id)} style={styles.activeButton}>
            <Check size={13} color={palette.onAmber} />
            <Text style={styles.activeButtonText}>Set Active</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.standName}>{stand.name}</Text>
        <DataSourceLabel source={resolved.source} label={resolved.label} />

        {resolved.wind ? (
          <>
            <View style={styles.dialWrap}>
              <CompassDial windDir={resolved.wind.directionDeg} standFacing={stand.facingDeg} size={220} />
              <View style={styles.mphWrap}>
                <Text style={styles.mphText}>
                  {resolved.wind.speedMph} <Text style={styles.mphUnit}>mph</Text>
                </Text>
                <Text style={styles.fromText}>WIND FROM {toCompass(resolved.wind.directionDeg)}</Text>
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
          </>
        ) : (
          <View style={styles.noDataBanner}>
            <Text style={styles.noDataText}>
              {hasLocation
                ? "No wind data available for this time — it's outside the sensor log and the weather forecast range."
                : 'Add a location to this stand to see historical and forecast conditions.'}
            </Text>
          </View>
        )}

        <ThermalIndicator hour={hour} gameAreaRelativeElevation={stand.gameAreaRelativeElevation} />
      </ScrollView>

      <View style={styles.sliderWrap}>
        <TimeSlider
          offsetMinutes={offsetMinutes}
          onChange={setOffsetMinutes}
          minOffsetMinutes={MIN_OFFSET_MINUTES}
          maxOffsetMinutes={MAX_OFFSET_MINUTES}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  missingText: { color: palette.textLo, fontSize: 13, textAlign: 'center', marginTop: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: palette.textHi, fontSize: 14, marginLeft: 2 },
  activeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.amber,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeButtonText: { color: palette.onAmber, fontSize: 11, fontWeight: '500' },
  scroll: { alignItems: 'center', paddingBottom: 16 },
  standName: { color: palette.textHi, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  dialWrap: { alignItems: 'center' },
  mphWrap: { marginTop: 12, alignItems: 'center' },
  mphText: { color: palette.textHi, fontSize: 30, fontFamily: mono, fontWeight: '700' },
  mphUnit: { fontSize: 14, color: palette.textLo, fontWeight: '400' },
  fromText: { color: palette.textLo, fontSize: 11, letterSpacing: 1 },
  banner: {
    marginTop: 20,
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
  noDataBanner: {
    marginTop: 20,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noDataText: { color: palette.textLo, fontSize: 13, lineHeight: 18 },
  sliderWrap: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
