import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';

interface StatusBadgeProps {
  live: boolean;
}

export function StatusBadge({ live }: StatusBadgeProps) {
  const color = live ? palette.good : palette.textLo;
  return (
    <View
      style={[
        styles.container,
        { borderColor: color, backgroundColor: live ? 'rgba(127,174,118,0.15)' : 'rgba(154,160,133,0.12)' },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{live ? 'LIVE · WINDMETER' : 'REGIONAL · GPS ESTIMATE'}</Text>
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
  text: { fontSize: 10, letterSpacing: 1.5, fontFamily: mono },
});
