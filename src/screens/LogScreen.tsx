import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { HuntLogEntry, ThermalLogEntry } from '../types';
import { compareThermalObservation } from '../utils/thermal';
import { formatLogTimestamp } from '../utils/time';

type LogTab = 'hunts' | 'thermal';

export function LogScreen() {
  const huntLog = useAppStore((s) => s.huntLog);
  const thermalLogs = useAppStore((s) => s.thermalLogs);
  const [view, setView] = useState<LogTab>('hunts');

  return (
    <View style={styles.screen}>
      <View style={styles.segmentRow}>
        <SegmentButton label="Hunts" active={view === 'hunts'} onPress={() => setView('hunts')} />
        <SegmentButton label="Thermal Log" active={view === 'thermal'} onPress={() => setView('thermal')} />
      </View>

      {view === 'hunts' ? (
        <FlatList
          data={huntLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No hunts logged yet.</Text>}
          renderItem={({ item }) => <HuntRow entry={item} />}
        />
      ) : (
        <FlatList
          data={thermalLogs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No thermal observations yet — log what you're noticing from the Wind tab.
            </Text>
          }
          renderItem={({ item }) => <ThermalRow entry={item} />}
        />
      )}
    </View>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const SIGHTING_LABEL: Record<HuntLogEntry['sighting'], string> = {
  none: 'Nothing',
  'saw-game': 'Saw Game',
  harvest: 'Harvest',
};

function HuntRow({ entry }: { entry: HuntLogEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.dateText}>{formatLogTimestamp(entry.timestamp)}</Text>
        <Text style={styles.windText}>{entry.windLabel}</Text>
      </View>
      <View style={styles.tagRow}>
        {entry.standName && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{entry.standName.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.tag}>
          <Text style={styles.tagText}>{entry.terrain.toUpperCase()}</Text>
        </View>
        {entry.isEdge && (
          <View style={[styles.tag, styles.edgeTag]}>
            <Text style={[styles.tagText, styles.edgeTagText]}>EDGE</Text>
          </View>
        )}
        {entry.sighting !== 'none' && (
          <View style={[styles.tag, styles.sightingTag]}>
            <Text style={[styles.tagText, styles.sightingTagText]}>{SIGHTING_LABEL[entry.sighting].toUpperCase()}</Text>
          </View>
        )}
      </View>
      {entry.note ? <Text style={styles.noteText}>{entry.note}</Text> : null}
    </View>
  );
}

const OBSERVATION_LABEL: Record<ThermalLogEntry['observed'], string> = {
  rising: 'Rising',
  sinking: 'Sinking',
  unsure: 'Not sure',
};

const PREDICTED_LABEL: Record<ThermalLogEntry['predicted'], string> = {
  rising: 'Rising',
  sinking: 'Sinking',
  transitioning: 'Unstable',
};

function ThermalRow({ entry }: { entry: ThermalLogEntry }) {
  const comparison = compareThermalObservation(entry.predicted, entry.observed);
  const color = comparison === 'match' ? palette.good : comparison === 'mismatch' ? palette.bad : palette.textLo;
  const comparisonLabel = comparison === 'match' ? 'MATCHED' : comparison === 'mismatch' ? 'MISMATCH' : '—';

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.dateText}>{formatLogTimestamp(entry.timestamp)}</Text>
        <Text style={[styles.comparisonText, { color }]}>{comparisonLabel}</Text>
      </View>
      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{entry.standName.toUpperCase()}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{entry.terrain.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.noteText}>
        Predicted {PREDICTED_LABEL[entry.predicted]} · Observed {OBSERVATION_LABEL[entry.observed]} ·{' '}
        {entry.windSpeedMph} mph
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  segmentRow: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  segmentButtonActive: { backgroundColor: palette.amber, borderColor: palette.amber },
  segmentButtonText: { color: palette.textLo, fontSize: 12 },
  segmentButtonTextActive: { color: palette.onAmber, fontWeight: '500' },
  list: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  emptyText: { color: palette.textLo, fontSize: 13, textAlign: 'center', marginTop: 24 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.line },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  dateText: { color: palette.textHi, fontSize: 13 },
  windText: { color: palette.amber, fontSize: 13, fontFamily: mono },
  comparisonText: { fontSize: 11, fontFamily: mono, letterSpacing: 0.5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  tagText: { color: palette.textLo, fontSize: 10, letterSpacing: 0.5 },
  edgeTag: { backgroundColor: 'rgba(209,131,47,0.15)', borderColor: palette.amber },
  edgeTagText: { color: palette.amber },
  sightingTag: { backgroundColor: 'rgba(127,174,118,0.15)', borderColor: palette.good },
  sightingTagText: { color: palette.good },
  noteText: { color: palette.textLo, fontSize: 12, marginTop: 4 },
});
