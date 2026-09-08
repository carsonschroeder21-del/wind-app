import { LocateFixed } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { palette } from '../theme/palette';

interface RecenterButtonProps {
  onPress: () => void;
  busy?: boolean;
}

/** Floating "recenter on my location" button — same crosshair affordance as Google/Apple
 * Maps and onX. Grouped with MapTypeToggle by the caller rather than self-positioning, so
 * the two floating controls stack together instead of scattering around the screen. */
export function RecenterButton({ onPress, busy }: RecenterButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={styles.button} hitSlop={8}>
      {busy ? (
        <ActivityIndicator size="small" color={palette.textHi} />
      ) : (
        <LocateFixed size={18} color={palette.textHi} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,32,21,0.94)',
    borderWidth: 1,
    borderColor: palette.line,
  },
});
