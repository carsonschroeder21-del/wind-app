import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import type { PressureAssessment } from '../types';

const ICON_BY_TREND = {
  falling: TrendingDown,
  rising: TrendingUp,
  steady: Minus,
} as const;

interface PressureIndicatorProps {
  assessment: PressureAssessment;
}

export function PressureIndicator({ assessment }: PressureIndicatorProps) {
  const { trend, label, detail } = assessment;
  const color = trend === 'falling' ? palette.good : trend === 'rising' ? palette.bad : palette.amber;
  const Icon = ICON_BY_TREND[trend];

  return (
    <View style={[styles.container, { backgroundColor: `${color}22`, borderColor: color }]}>
      <View style={styles.headerRow}>
        <Icon size={15} color={color} />
        <Text style={[styles.headerText, { color }]}>{label.toUpperCase()}</Text>
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
  headerText: { fontSize: 12, letterSpacing: 1 },
  detailText: { color: palette.textLo, fontSize: 12 },
});
