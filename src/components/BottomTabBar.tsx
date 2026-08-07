import { Bell, Bluetooth, History, MapPin, Wind } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { TabId } from '../types';

const TABS: { id: TabId; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: Wind, label: 'Wind' },
  { id: 'stand', icon: MapPin, label: 'Stand' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
  { id: 'device', icon: Bluetooth, label: 'Device' },
  { id: 'log', icon: History, label: 'Log' },
];

interface BottomTabBarProps {
  tab: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomTabBar({ tab, onChange }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map(({ id, icon: Icon, label }) => {
        const active = tab === id;
        const color = active ? palette.amber : palette.textLo;
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={styles.tab} hitSlop={4}>
            <Icon size={18} color={color} />
            <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.bgAlt,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  label: { fontSize: 9, letterSpacing: 1, fontFamily: mono },
});
