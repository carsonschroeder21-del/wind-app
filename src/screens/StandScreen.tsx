import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { StandEditor } from '../components/StandEditor';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { Stand } from '../types';
import { toCompass } from '../utils/compass';

export function StandScreen() {
  const stands = useAppStore((s) => s.stands);
  const activeStandId = useAppStore((s) => s.activeStandId);
  const setActiveStandId = useAppStore((s) => s.setActiveStandId);
  const deleteStand = useAppStore((s) => s.deleteStand);

  const [editingStandId, setEditingStandId] = useState<string | null | 'new'>(null);

  if (editingStandId !== null) {
    return (
      <StandEditor
        standId={editingStandId === 'new' ? null : editingStandId}
        onDone={() => setEditingStandId(null)}
      />
    );
  }

  const handleDelete = (stand: Stand) => {
    Alert.alert('Delete stand?', `"${stand.name}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteStand(stand.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setEditingStandId('new')} style={styles.addButton}>
        <Plus size={16} color={palette.onAmber} />
        <Text style={styles.addButtonText}>Add Stand</Text>
      </Pressable>

      <FlatList
        data={stands}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No stands saved yet — add one above.</Text>
        }
        renderItem={({ item }) => {
          const active = item.id === activeStandId;
          return (
            <Pressable
              onPress={() => setActiveStandId(item.id)}
              style={[styles.card, active && styles.cardActive]}
            >
              <View style={styles.cardTop}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {active && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => setEditingStandId(item.id)} hitSlop={8} style={styles.iconButton}>
                    <Pencil size={16} color={palette.textLo} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} hitSlop={8} style={styles.iconButton}>
                    <Trash2 size={16} color={palette.bad} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {item.terrain}
                  {item.isEdge ? ' · Edge' : ''}
                </Text>
                <Text style={styles.metaText}>Facing {toCompass(item.facingDeg)}</Text>
                <Text style={styles.metaText}>{item.elevationFt != null ? `${item.elevationFt} ft` : 'Elevation unknown'}</Text>
              </View>

              {!active && <Text style={styles.tapHint}>Tap to set active</Text>}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  addButton: {
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: { color: palette.onAmber, fontSize: 13, fontWeight: '500' },
  list: { paddingBottom: 16, gap: 12 },
  emptyText: { color: palette.textLo, fontSize: 13, textAlign: 'center', marginTop: 24 },
  card: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  cardActive: { borderColor: palette.amber },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  name: { color: palette.textHi, fontSize: 15 },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(209,131,47,0.15)',
    borderWidth: 1,
    borderColor: palette.amber,
  },
  activeBadgeText: { color: palette.amber, fontSize: 9, letterSpacing: 0.5, fontFamily: mono },
  cardActions: { flexDirection: 'row', gap: 12, marginLeft: 8 },
  iconButton: { padding: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metaText: { color: palette.textLo, fontSize: 11 },
  tapHint: { color: palette.textLo, fontSize: 10, marginTop: 8, fontStyle: 'italic' },
});
