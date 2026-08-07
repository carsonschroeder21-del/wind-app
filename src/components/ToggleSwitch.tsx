import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { palette } from '../theme/palette';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [checked, progress]);

  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: [palette.line, palette.amber] });
  const knobLeft = progress.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });

  return (
    <Pressable onPress={() => onChange(!checked)} hitSlop={8}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.knob, { left: knobLeft }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.textHi,
  },
});
