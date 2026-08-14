import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { palette } from '../theme/palette';
import type { SightingOutcome } from '../types';

interface HuntLogModalProps {
  visible: boolean;
  standName: string;
  onClose: () => void;
  onSubmit: (input: { sighting: SightingOutcome; note: string }) => void;
}

const SIGHTING_OPTIONS: { value: SightingOutcome; label: string }[] = [
  { value: 'none', label: 'Nothing' },
  { value: 'saw-game', label: 'Saw Game' },
  { value: 'harvest', label: 'Harvest' },
];

export function HuntLogModal({ visible, standName, onClose, onSubmit }: HuntLogModalProps) {
  const [sighting, setSighting] = useState<SightingOutcome>('none');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    onSubmit({ sighting, note: note.trim() });
    setSighting('none');
    setNote('');
  };

  const handleClose = () => {
    setSighting('none');
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Log this hunt</Text>
          <Text style={styles.subtitle}>Saved against {standName} with the current conditions.</Text>

          <Text style={styles.sectionLabel}>WHAT DID YOU SEE?</Text>
          <View style={styles.optionRow}>
            {SIGHTING_OPTIONS.map((opt) => {
              const active = sighting === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSighting(opt.value)}
                  style={[styles.chip, { backgroundColor: active ? palette.amber : palette.panel, borderColor: active ? palette.amber : palette.line }]}
                >
                  <Text style={[styles.chipText, { color: active ? palette.onAmber : palette.textLo }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Anything worth remembering?"
            placeholderTextColor={palette.textLo}
            style={styles.input}
            multiline
          />

          <Pressable onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Log Hunt</Text>
          </Pressable>
          <Pressable onPress={handleClose} style={styles.cancelButton}>
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
  subtitle: { color: palette.textLo, fontSize: 12, marginTop: 4, marginBottom: 16 },
  sectionLabel: { color: palette.textHi, fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12 },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    color: palette.textHi,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: palette.onAmber, fontSize: 13, letterSpacing: 0.5, fontWeight: '500' },
  cancelButton: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  cancelText: { color: palette.textLo, fontSize: 13 },
});
