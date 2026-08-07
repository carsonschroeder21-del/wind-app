import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

import { ToggleRow } from '../components/ToggleRow';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import type { AlertSensitivity } from '../types';

const LEVELS = ['Major shifts only', 'Balanced', 'Any shift'];

export function AlertsScreen() {
  const buzzOn = useAppStore((s) => s.buzzOn);
  const setBuzzOn = useAppStore((s) => s.setBuzzOn);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const setSensitivity = useAppStore((s) => s.setSensitivity);
  const quietHoursOn = useAppStore((s) => s.quietHoursOn);
  const setQuietHoursOn = useAppStore((s) => s.setQuietHoursOn);

  return (
    <View style={styles.container}>
      <ToggleRow
        label="Buzz on bad wind"
        sub="Bracelet vibrates when wind turns unfavorable"
        checked={buzzOn}
        onChange={setBuzzOn}
      />

      <View style={styles.sensitivitySection}>
        <Text style={styles.sensitivityLabel}>Sensitivity</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={2}
          step={1}
          value={sensitivity}
          onValueChange={(v) => setSensitivity(v as AlertSensitivity)}
          minimumTrackTintColor={palette.amber}
          maximumTrackTintColor={palette.line}
          thumbTintColor={palette.amber}
        />
        <Text style={styles.levelText}>{LEVELS[sensitivity]}</Text>
      </View>

      <ToggleRow label="Quiet hours" sub="Mute buzzing 11pm–5am" checked={quietHoursOn} onChange={setQuietHoursOn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  sensitivitySection: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: palette.line },
  sensitivityLabel: { color: palette.textHi, fontSize: 14, marginBottom: 10 },
  slider: { width: '100%', height: 40 },
  levelText: { color: palette.amber, fontSize: 12, marginTop: 4 },
});
