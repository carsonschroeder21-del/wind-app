import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { ToggleSwitch } from './ToggleSwitch';

interface ToggleRowProps {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ label, sub, checked, onChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  textCol: { flex: 1, paddingRight: 12 },
  label: { color: palette.textHi, fontSize: 14 },
  sub: { color: palette.textLo, fontSize: 11, marginTop: 2 },
});
