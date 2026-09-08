import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MapType } from 'react-native-maps';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';

const OPTIONS: { value: MapType; label: string }[] = [
  { value: 'standard', label: 'STD' },
  { value: 'satellite', label: 'SAT' },
  { value: 'hybrid', label: 'HYBRID' },
];

interface MapTypeToggleProps {
  value: MapType;
  onChange: (value: MapType) => void;
}

/** Small basemap switcher pinned over the map (onX-style) — Standard/Satellite/Hybrid via
 * react-native-maps' own `mapType` prop, no tile source of our own to manage. */
export function MapTypeToggle({ value, onChange }: MapTypeToggleProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map(({ value: optionValue, label }) => {
        const active = value === optionValue;
        return (
          <Pressable
            key={optionValue}
            onPress={() => onChange(optionValue)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: 'rgba(28,32,21,0.94)',
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
  },
  segment: { paddingHorizontal: 10, paddingVertical: 8 },
  segmentActive: { backgroundColor: palette.amber },
  label: { color: palette.textLo, fontSize: 10, letterSpacing: 0.5, fontFamily: mono },
  labelActive: { color: palette.onAmber, fontWeight: '700' },
});
