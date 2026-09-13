import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import type { PinCategory } from '../utils/pinCategories';
import { GAME_SIGHTING_CATEGORIES, GAME_SPECIES_STYLE, STAND_TYPE_CATEGORIES, STAND_TYPE_STYLE } from '../utils/pinCategories';

function styleForCategory(category: PinCategory) {
  return category.kind === 'stand' ? STAND_TYPE_STYLE[category.standType] : GAME_SPECIES_STYLE[category.species];
}

function keyForCategory(category: PinCategory) {
  return category.kind === 'stand' ? `stand-${category.standType}` : `sighting-${category.species}`;
}

interface PinCategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: PinCategory) => void;
  /** Restricts the picker to just these categories (e.g. only sighting species when
   * changing an existing sighting pin's type) instead of the full stand+sighting menu. */
  categories?: PinCategory[];
}

/** Long-press-on-the-map action sheet — pick a stand type (feeds into the normal stand
 * editor flow) or a game-sign species (drops a simple, standalone sighting pin). Also
 * reused, restricted via `categories`, for changing an existing sighting pin's species. */
export function PinCategoryPicker({ visible, onClose, onSelect, categories }: PinCategoryPickerProps) {
  const renderGrid = (items: PinCategory[]) => (
    <View style={styles.grid}>
      {items.map((category) => {
        const style = styleForCategory(category);
        const Icon = style.icon;
        return (
          <Pressable key={keyForCategory(category)} onPress={() => onSelect(category)} style={styles.item}>
            <View style={[styles.iconCircle, { backgroundColor: style.color }]}>
              <Icon size={20} color={palette.textHi} />
            </View>
            <Text style={styles.itemLabel} numberOfLines={2}>
              {style.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {categories ? (
            <>
              <Text style={styles.title}>Change Type</Text>
              <Text style={styles.subtitle}>Pick what this pin represents.</Text>
              {renderGrid(categories)}
            </>
          ) : (
            <>
              <Text style={styles.title}>Drop a Pin</Text>
              <Text style={styles.subtitle}>Choose what to mark at this location.</Text>

              <Text style={styles.sectionLabel}>STAND TYPE</Text>
              {renderGrid(STAND_TYPE_CATEGORIES)}

              <Text style={styles.sectionLabel}>GAME SIGN</Text>
              {renderGrid(GAME_SIGHTING_CATEGORIES)}
            </>
          )}

          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
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
  title: { color: palette.textHi, fontSize: 16, fontWeight: '600' },
  subtitle: { color: palette.textLo, fontSize: 12, marginTop: 4, marginBottom: 8 },
  sectionLabel: { color: palette.textHi, fontSize: 12, letterSpacing: 1, marginBottom: 10, marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { width: 84, alignItems: 'center', gap: 6 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { color: palette.textLo, fontSize: 11, textAlign: 'center' },
  cancelButton: { alignItems: 'center', paddingVertical: 10, marginTop: 16 },
  cancelText: { color: palette.textLo, fontSize: 13 },
});
