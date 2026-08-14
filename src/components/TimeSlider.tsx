import Slider from '@react-native-community/slider';
import { RotateCcw } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';

const STEP_MINUTES = 5;

interface TimeSliderProps {
  /** Selected time, as minutes offset from "now" (negative = past, positive = future). */
  offsetMinutes: number;
  onChange: (offsetMinutes: number) => void;
  minOffsetMinutes: number;
  maxOffsetMinutes: number;
}

function formatOffset(minutes: number): string {
  if (Math.abs(minutes) < STEP_MINUTES) return 'Now';
  const hours = Math.abs(minutes) / 60;
  const magnitude = hours >= 1 ? `${hours % 1 === 0 ? hours : hours.toFixed(1)}h` : `${Math.abs(minutes)}m`;
  return minutes < 0 ? `-${magnitude}` : `+${magnitude}`;
}

export function TimeSlider({ offsetMinutes, onChange, minOffsetMinutes, maxOffsetMinutes }: TimeSliderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.offsetText}>{formatOffset(offsetMinutes)}</Text>
        <Pressable
          onPress={() => onChange(0)}
          disabled={offsetMinutes === 0}
          hitSlop={8}
          style={[styles.nowButton, offsetMinutes === 0 && styles.nowButtonDisabled]}
        >
          <RotateCcw size={12} color={offsetMinutes === 0 ? palette.textLo : palette.amber} />
          <Text style={[styles.nowButtonText, offsetMinutes === 0 && styles.nowButtonTextDisabled]}>NOW</Text>
        </Pressable>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={minOffsetMinutes}
        maximumValue={maxOffsetMinutes}
        step={STEP_MINUTES}
        value={offsetMinutes}
        onValueChange={onChange}
        minimumTrackTintColor={palette.amber}
        maximumTrackTintColor={palette.line}
        thumbTintColor={palette.amber}
      />

      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel}>{formatOffset(minOffsetMinutes)}</Text>
        <Text style={styles.rangeLabel}>{formatOffset(maxOffsetMinutes)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offsetText: { color: palette.textHi, fontSize: 16, fontFamily: mono },
  nowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.amber,
  },
  nowButtonDisabled: { borderColor: palette.line },
  nowButtonText: { color: palette.amber, fontSize: 10, letterSpacing: 1, fontFamily: mono },
  nowButtonTextDisabled: { color: palette.textLo },
  slider: { width: '100%', height: 36 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  rangeLabel: { color: palette.textLo, fontSize: 10, fontFamily: mono },
});
