import { ChevronRight, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { ConditionsSource, Stand, TemperatureTrend } from '../types';
import { toCompass } from '../utils/compass';
import { DataSourceLabel } from './DataSourceLabel';
import { ThermalIndicator } from './ThermalIndicator';
import { TimeSlider } from './TimeSlider';

const MIN_OFFSET_MINUTES = -24 * 60;
const MAX_OFFSET_MINUTES = 48 * 60;

interface StandQuickViewProps {
  /** Null hides the panel entirely. */
  stand: Stand | null;
  offsetMinutes: number;
  onChangeOffset: (offsetMinutes: number) => void;
  windDirectionDeg: number | null;
  windSpeedMph: number | null;
  dataSource: ConditionsSource;
  dataLabel: string;
  hour: number;
  temperatureTrend: TemperatureTrend | null;
  onClose: () => void;
  onViewFullDetails: () => void;
}

/** Compact, non-full-screen panel shown when a stand pin (or dropdown row) is tapped —
 * the map and that stand's scent cone stay visible above it. Time slider, wind, and
 * ThermalIndicator (the exact same component/logic StandDetailScreen uses) all update
 * live as the slider moves; "View Full Details" is the only way to reach the rest
 * (photo/cooldown/entry-risk/edit), via the unchanged full-screen StandDetailScreen. */
export function StandQuickView({
  stand,
  offsetMinutes,
  onChangeOffset,
  windDirectionDeg,
  windSpeedMph,
  dataSource,
  dataLabel,
  hour,
  temperatureTrend,
  onClose,
  onViewFullDetails,
}: StandQuickViewProps) {
  if (!stand) return null;

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {stand.name}
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <X size={18} color={palette.textHi} />
        </Pressable>
      </View>

      <DataSourceLabel source={dataSource} label={dataLabel} />

      {windDirectionDeg != null && windSpeedMph != null ? (
        <Text style={styles.windText}>
          {windSpeedMph} <Text style={styles.windUnit}>mph</Text> {toCompass(windDirectionDeg)}
        </Text>
      ) : (
        <Text style={styles.noDataText}>No wind data for this time.</Text>
      )}

      <ThermalIndicator hour={hour} gameAreaRelativeElevation={stand.gameAreaRelativeElevation} temperatureTrend={temperatureTrend} />

      <TimeSlider
        offsetMinutes={offsetMinutes}
        onChange={onChangeOffset}
        minOffsetMinutes={MIN_OFFSET_MINUTES}
        maxOffsetMinutes={MAX_OFFSET_MINUTES}
      />

      <Pressable onPress={onViewFullDetails} style={styles.detailsButton}>
        <Text style={styles.detailsButtonText}>View Full Details</Text>
        <ChevronRight size={14} color={palette.onAmber} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.bgAlt,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    zIndex: 30,
    elevation: 30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { color: palette.textHi, fontSize: 16, fontWeight: '600', flex: 1, paddingRight: 12 },
  windText: { color: palette.textHi, fontSize: 22, fontFamily: mono, fontWeight: '700', marginBottom: 4 },
  windUnit: { fontSize: 13, color: palette.textLo, fontWeight: '400' },
  noDataText: { color: palette.textLo, fontSize: 12, marginBottom: 4 },
  detailsButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  detailsButtonText: { color: palette.onAmber, fontSize: 13, letterSpacing: 0.5, fontWeight: '500' },
});
