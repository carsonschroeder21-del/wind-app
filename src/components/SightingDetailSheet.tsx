import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { GameSightingPin } from '../types';
import { GAME_SPECIES_STYLE } from '../utils/pinCategories';
import { formatLogTimestamp } from '../utils/time';

interface SightingDetailSheetProps {
  pin: GameSightingPin | null;
  onClose: () => void;
  onChangeSpecies: () => void;
  onDelete: () => void;
}

/** Small detail/edit/delete sheet for a tapped game-sighting pin — deliberately minimal
 * (species, when, where) to match how little data these pins actually carry. */
export function SightingDetailSheet({ pin, onClose, onChangeSpecies, onDelete }: SightingDetailSheetProps) {
  const style = pin ? GAME_SPECIES_STYLE[pin.species] : null;
  const Icon = style?.icon;

  return (
    <Modal visible={pin != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {pin && style && Icon && (
            <>
              <View style={styles.headerRow}>
                <View style={[styles.iconCircle, { backgroundColor: style.color }]}>
                  <Icon size={20} color={palette.textHi} />
                </View>
                <Text style={styles.title}>{pin.species}</Text>
              </View>
              <Text style={styles.detailText}>Logged {formatLogTimestamp(pin.timestamp)}</Text>
              <Text style={styles.coordsText}>
                {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
              </Text>

              <Pressable onPress={onChangeSpecies} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Change Type</Text>
              </Pressable>
              <Pressable onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete Pin</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Close</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 24,
    paddingBottom: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.textHi, fontSize: 16, fontWeight: '600' },
  detailText: { color: palette.textLo, fontSize: 12, marginTop: 14 },
  coordsText: { color: palette.textLo, fontSize: 11, marginTop: 4, fontFamily: mono },
  actionButton: {
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { color: palette.onAmber, fontSize: 13, letterSpacing: 0.5, fontWeight: '500' },
  deleteButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: palette.bad,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { color: palette.bad, fontSize: 13 },
  cancelButton: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  cancelText: { color: palette.textLo, fontSize: 13 },
});
