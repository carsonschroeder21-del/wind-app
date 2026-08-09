import { Thermometer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import type { GameAreaRelativeElevation } from '../types';
import { assessThermal } from '../utils/thermal';

interface ThermalIndicatorProps {
  /** 0-23, local time. */
  hour: number;
  gameAreaRelativeElevation: GameAreaRelativeElevation;
}

export function ThermalIndicator({ hour, gameAreaRelativeElevation }: ThermalIndicatorProps) {
  const { label, detail, favorable } = assessThermal(hour, gameAreaRelativeElevation);
  const color = favorable == null ? palette.amber : favorable ? palette.good : palette.bad;

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
