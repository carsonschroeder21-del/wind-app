import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { Stand, WindReading } from '../types';
import { toCompass } from '../utils/compass';

export interface StandWindSnapshot {
  stand: Stand;
  wind: WindReading;
  isBad: boolean;
}

interface StandsDropdownProps {
  snapshots: StandWindSnapshot[];
  activeStandId: string | null;
  onSelectStand: (id: string) => void;
}

const MAX_LIST_HEIGHT = 320;

/** Collapsible panel pinned near the top of the Map screen listing every saved stand with
 * a quick wind snapshot — tapping a row opens the same stand-detail bottom sheet a pin tap
 * does. Self-positions via `position: absolute` so it drops in over the map without the
 * screen needing separate layout wiring. */
export function StandsDropdown({ snapshots, activeStandId, onSelectStand }: StandsDropdownProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((e) => !e)} style={styles.header}>
        <Text style={styles.headerText}>YOUR STANDS</Text>
        <View style={styles.headerRight}>
          <Text style={styles.countText}>{snapshots.length}</Text>
          {expanded ? (
            <ChevronUp size={16} color={palette.textHi} />
          ) : (
            <ChevronDown size={16} color={palette.textHi} />
          )}
        </View>
      </Pressable>

      {expanded && (
        <ScrollView style={styles.list} bounces={false}>
          {snapshots.length === 0 ? (
            <Text style={styles.emptyText}>No stands saved yet.</Text>
          ) : (
            snapshots.map(({ stand, wind, isBad }) => (
              <Pressable
                key={stand.id}
                onPress={() => onSelectStand(stand.id)}
                style={[styles.row, stand.id === activeStandId && styles.rowActive]}
              >
                <View style={[styles.dot, { backgroundColor: isBad ? palette.bad : palette.good }]} />
                <Text style={styles.rowName} numberOfLines={1}>
                  {stand.name}
                </Text>
                <Text style={styles.rowWind}>
                  {wind.speedMph} mph {toCompass(wind.directionDeg)}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(28,32,21,0.94)',
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerText: { color: palette.textHi, fontSize: 12, letterSpacing: 1.5, fontFamily: mono },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countText: { color: palette.textLo, fontSize: 12 },
  list: { maxHeight: MAX_LIST_HEIGHT, borderTopWidth: 1, borderTopColor: palette.line },
  emptyText: { color: palette.textLo, fontSize: 12, padding: 14, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  rowActive: { backgroundColor: 'rgba(209,131,47,0.12)' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowName: { color: palette.textHi, fontSize: 13, flex: 1 },
  rowWind: { color: palette.textLo, fontSize: 12, fontFamily: mono },
});
