import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import type { ThermalObservation } from '../types';

interface ThermalLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (observation: ThermalObservation) => void;
}

const OPTIONS: { value: ThermalObservation; label: string }[] = [
  { value: 'rising', label: 'Scent Rising' },
  { value: 'sinking', label: 'Scent Sinking' },
  { value: 'unsure', label: 'Not Sure' },
];

export function ThermalLogModal({ visible, onClose, onSubmit }: ThermalLogModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>What are you noticing?</Text>
          <Text style={styles.subtitle}>Logged with a timestamp against what the app predicted right now.</Text>
          {OPTIONS.map((opt) => (
            <Pressable key={opt.value} onPress={() => onSubmit(opt.value)} style={styles.option}>
              <Text style={styles.optionText}>{opt.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
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
  subtitle: { color: palette.textLo, fontSize: 12, marginTop: 4, marginBottom: 16 },
  option: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 10,
  },
  optionText: { color: palette.textHi, fontSize: 14 },
  cancelButton: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  cancelText: { color: palette.textLo, fontSize: 13 },
});
