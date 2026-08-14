import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { ConditionsSource } from '../types';

interface DataSourceLabelProps {
  source: ConditionsSource;
  label: string;
}

const COLOR_BY_SOURCE: Record<ConditionsSource, string> = {
  live: palette.good,
  regional: palette.textLo,
  'historical-sensor': palette.amber,
  'historical-estimate': palette.amber,
  forecast: palette.gameDir,
  'no-data': palette.bad,
};

/** Small pill labeling exactly what's feeding the conditions currently shown — always
 * visible so the hunter knows whether they're looking at real-time, logged, or
 * predicted data as they scrub the time slider. */
export function DataSourceLabel({ source, label }: DataSourceLabelProps) {
  const color = COLOR_BY_SOURCE[source];
  return (
    <View style={[styles.container, { borderColor: color, backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10, letterSpacing: 1, fontFamily: mono },
});
