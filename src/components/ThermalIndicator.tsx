import { Thermometer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';

interface ThermalIndicatorProps {
  /** 0-23, local time. */
  hour: number;
  standElevationFt: number;
  gameAreaElevationFt: number;
}

export function ThermalIndicator({ hour, standElevationFt, gameAreaElevationFt }: ThermalIndicatorProps) {
  // Morning: thermals rise (uphill). Evening: thermals sink (downhill).
  const isMorning = hour >= 5 && hour < 11;
  const isEvening = hour >= 16 && hour < 21;
  const transitioning = !isMorning && !isEvening;

  const gameIsUphill = gameAreaElevationFt > standElevationFt;
  const gameIsDownhill = gameAreaElevationFt < standElevationFt;

  let label = 'Midday — thermals unstable';
  let detail = 'Switching direction, hardest time to predict';
  let bad = false;

  if (isMorning) {
    label = 'Rising (uphill)';
    if (gameIsUphill) {
      detail = 'Game area is uphill — thermals likely carry your scent to them';
      bad = true;
    } else if (gameIsDownhill) {
      detail = 'Game area is downhill — thermals likely carry scent away from them';
      bad = false;
    } else {
      detail = 'Flat terrain between you and game area';
    }
  } else if (isEvening) {
    label = 'Sinking (downhill)';
    if (gameIsDownhill) {
      detail = 'Game area is downhill — thermals likely carry your scent to them';
      bad = true;
    } else if (gameIsUphill) {
      detail = 'Game area is uphill — thermals likely carry scent away from them';
      bad = false;
    } else {
      detail = 'Flat terrain between you and game area';
    }
  }

  const color = transitioning ? palette.amber : bad ? palette.bad : palette.good;

  return (
    <View style={[styles.container, { backgroundColor: `${color}22`, borderColor: color }]}>
      <View style={styles.headerRow}>
        <Thermometer size={15} color={color} />
        <Text style={styles.headerText}>THERMAL — {label.toUpperCase()}</Text>
      </View>
      <Text style={styles.detailText}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerText: { color: palette.textHi, fontSize: 12, letterSpacing: 1 },
  detailText: { color: palette.textLo, fontSize: 12 },
});
