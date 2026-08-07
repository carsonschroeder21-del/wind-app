import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { HuntLogEntry } from '../types';

export function LogScreen() {
  const huntLog = useAppStore((s) => s.huntLog);

  return (
    <FlatList
      data={huntLog}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => <LogRow entry={item} />}
    />
  );
}

function LogRow({ entry }: { entry: HuntLogEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.dateText}>
          {entry.date} · {entry.time}
        </Text>
        <Text style={styles.windText}>{entry.windLabel}</Text>
      </View>
      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{entry.terrain.toUpperCase()}</Text>
        </View>
        {entry.isEdge && (
          <View style={[styles.tag, styles.edgeTag]}>
            <Text style={[styles.tagText, styles.edgeTagText]}>EDGE</Text>
          </View>
        )}
      </View>
      <Text style={styles.noteText}>{entry.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.line },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  dateText: { color: palette.textHi, fontSize: 13 },
  windText: { color: palette.amber, fontSize: 13, fontFamily: mono },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
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
  noteText: { color: palette.textLo, fontSize: 12, marginTop: 4 },
});
