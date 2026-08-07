import { ChevronLeft, Wind } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';

interface TopBarProps {
  title: string;
  onBack?: () => void;
}

export function TopBar({ title, onBack }: TopBarProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={22} color={palette.textHi} />
        </Pressable>
      ) : (
        <Wind size={18} color={palette.amber} style={styles.icon} />
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  backButton: { marginRight: 8, marginLeft: -4, padding: 4 },
  icon: { marginRight: 8 },
  title: {
    color: palette.textHi,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: mono,
  },
});
