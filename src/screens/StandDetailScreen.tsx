import { Check, ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { CompassDial } from '../components/CompassDial';
import { DataSourceLabel } from '../components/DataSourceLabel';
import { EntryRouteRisk } from '../components/EntryRouteRisk';
import type { PanoramaHotspotInput } from '../components/PanoramaViewer';
import { PanoramaViewer } from '../components/PanoramaViewer';
import { StandCooldownBanner } from '../components/StandCooldownBanner';
import { ThermalIndicator } from '../components/ThermalIndicator';
import { TimeSlider } from '../components/TimeSlider';
import { fetchWeatherSeries } from '../services/weather/openMeteo';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { WeatherPoint, WindReading } from '../types';
import { isWindUnfavorable, toCompass, windTravelDirection } from '../utils/compass';
import { assessStandCooldown } from '../utils/cooldown';
import { resolveConditionsAtTime } from '../utils/conditionsAtTime';
import { assessEntryRoute, findBestEntryWindow } from '../utils/entryRoute';
import { gameAreaBearingDeg } from '../utils/gameArea';
import { assessTemperatureTrend } from '../utils/temperature';

function buildPanoramaHotspots(wind: WindReading, gameBearingDeg: number, isBad: boolean): PanoramaHotspotInput[] {
  const goingDir = windTravelDirection(wind.directionDeg);
  return [
    { id: 'wind', bearingDeg: goingDir, colorHex: isBad ? palette.bad : palette.good, label: 'WIND' },
    { id: 'game', bearingDeg: gameBearingDeg, colorHex: palette.gameDir, label: 'GAME' },
  ];
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={styles.videoWrap}>
      <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
      <Text style={styles.videoHint}>360° video shown as a flat preview — full look-around playback isn't supported yet.</Text>
    </View>
  );
}

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
  const updateStand = useAppStore((s) => s.updateStand);
  const liveWind = useAppStore((s) => s.wind);
  const windSensorConnected = useAppStore((s) => s.windSensor.state === 'connected');
  const windHistory = useAppStore((s) => s.windHistory);
  const huntLog = useAppStore((s) => s.huntLog);
  const cooldownWindowDays = useAppStore((s) => s.cooldownWindowDays);
  const cooldownThreshold = useAppStore((s) => s.cooldownThreshold);

  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [weatherSeries, setWeatherSeries] = useState<WeatherPoint[] | null>(null);

  useEffect(() => {
    if (stand?.latitude == null || stand?.longitude == null) {
      setWeatherSeries(null);
      return;
    }
    let cancelled = false;
    fetchWeatherSeries(stand.latitude, stand.longitude).then((points) => {
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

  const gameBearingDeg = gameAreaBearingDeg(stand);
  const temperatureTrend = assessTemperatureTrend(weatherSeries, targetMs);
  const cooldown = assessStandCooldown(stand.id, huntLog, nowMs, cooldownWindowDays, cooldownThreshold);
  const isBad = resolved.wind != null && isWindUnfavorable(resolved.wind.directionDeg, gameBearingDeg);
  const isActive = stand.id === activeStandId;
  const hasLocation = stand.latitude != null && stand.longitude != null;
  const hasParking = stand.parkingLatitude != null && stand.parkingLongitude != null;

  const entryAssessment =
    hasLocation && hasParking && resolved.wind
      ? assessEntryRoute({
          stand: { latitude: stand.latitude!, longitude: stand.longitude! },
          parking: { latitude: stand.parkingLatitude!, longitude: stand.parkingLongitude! },
          standFacingDeg: stand.facingDeg,
          gameAreaLatitude: stand.gameAreaLatitude,
          gameAreaLongitude: stand.gameAreaLongitude,
          wind: resolved.wind,
        })
      : null;

  const bestEntryWindow =
    hasLocation && hasParking && weatherSeries
      ? findBestEntryWindow({
          stand: { latitude: stand.latitude!, longitude: stand.longitude! },
          parking: { latitude: stand.parkingLatitude!, longitude: stand.parkingLongitude! },
          standFacingDeg: stand.facingDeg,
          gameAreaLatitude: stand.gameAreaLatitude,
          gameAreaLongitude: stand.gameAreaLongitude,
          weatherSeries,
          fromMs: nowMs,
        })
      : null;

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
            {stand.media?.type === 'photo360' ? (
              <PanoramaViewer
                uri={stand.media.uri}
                northOffsetDeg={stand.media.northOffsetDeg}
                hotspots={buildPanoramaHotspots(resolved.wind, gameBearingDeg, isBad)}
                onCalibrated={(northOffsetDeg) =>
                  updateStand(stand.id, { media: { ...stand.media!, northOffsetDeg } })
                }
                height={280}
              />
            ) : stand.media?.type === 'video360' ? (
              <VideoPreview uri={stand.media.uri} />
            ) : (
              <View style={styles.dialWrap}>
                <CompassDial windDir={resolved.wind.directionDeg} gameBearingDeg={gameBearingDeg} size={220} />
              </View>
            )}
            {stand.media?.type === 'photo360' && stand.media.northOffsetDeg != null && (
              <Pressable
                onPress={() => updateStand(stand.id, { media: { ...stand.media!, northOffsetDeg: null } })}
                hitSlop={8}
                style={styles.recalibrateButton}
              >
                <Text style={styles.recalibrateText}>Recalibrate North</Text>
              </Pressable>
            )}
            <View style={styles.mphWrap}>
              <Text style={styles.mphText}>
                {resolved.wind.speedMph} <Text style={styles.mphUnit}>mph</Text>
              </Text>
              <Text style={styles.fromText}>WIND FROM {toCompass(resolved.wind.directionDeg)}</Text>
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

        <ThermalIndicator
          hour={hour}
          gameAreaRelativeElevation={stand.gameAreaRelativeElevation}
          temperatureTrend={temperatureTrend}
        />

        {cooldown.flagged && <StandCooldownBanner cooldown={cooldown} />}

        <EntryRouteRisk
          hasStandLocation={hasLocation}
          hasParking={hasParking}
          assessment={entryAssessment}
          bestWindow={bestEntryWindow}
        />
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
  videoWrap: { width: '100%' },
  video: { width: '100%', height: 220, borderRadius: 8, backgroundColor: palette.bgAlt },
  videoHint: { color: palette.textLo, fontSize: 10, marginTop: 6, textAlign: 'center', lineHeight: 14 },
  recalibrateButton: { marginTop: 8, alignSelf: 'center' },
  recalibrateText: { color: palette.amber, fontSize: 11, letterSpacing: 0.5 },
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
