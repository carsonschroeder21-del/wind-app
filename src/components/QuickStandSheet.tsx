import { Check } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { fetchElevationsFt } from '../services/elevation';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import { TERRAIN_TYPES } from '../types';
import type { GameAreaRelativeElevation, StandType, Terrain } from '../types';
import { toCompass } from '../utils/compass';
import { standTypeStyle } from '../utils/pinCategories';
import { detectRelativeElevation, slopeSamplePoints } from '../utils/slope';
import { ToggleSwitch } from './ToggleSwitch';

const RELATIVE_ELEVATION_LABELS: Record<GameAreaRelativeElevation, string> = {
  above: 'Above',
  level: 'Level with',
  below: 'Below',
};

export interface DraftStandPin {
  latitude: number;
  longitude: number;
  standType: StandType;
}

export interface QuickStandSaveInput {
  name: string;
  terrain: Terrain;
  isEdge: boolean;
  facingDeg: number;
  elevationFt: number | null;
  gameAreaRelativeElevation: GameAreaRelativeElevation;
}

interface QuickStandSheetProps {
  draftPin: DraftStandPin | null;
  defaultFacingDeg: number;
  onCancel: () => void;
  onSave: (input: QuickStandSaveInput) => void;
}

/** The short follow-up form after picking a stand type from the map's long-press menu —
 * name, terrain, edge, facing only. No parking/game-area pin steps and no manual
 * elevation picker: elevation and the above/level/below call are auto-detected from the
 * terrain around the dropped pin (see utils/slope.ts) the moment the pin lands, well
 * before the hunter finishes this form. The stand itself isn't created until Save —
 * the map shows a draft pin at the exact long-press point in the meantime. */
export function QuickStandSheet({ draftPin, defaultFacingDeg, onCancel, onSave }: QuickStandSheetProps) {
  const [name, setName] = useState('');
  const [terrain, setTerrain] = useState<Terrain>('Timber');
  const [isEdge, setIsEdge] = useState(false);
  const [facingDeg, setFacingDeg] = useState(defaultFacingDeg);
  const [nameError, setNameError] = useState(false);
  const [elevationSamples, setElevationSamples] = useState<(number | null)[] | null>(null);
  const [elevationLoading, setElevationLoading] = useState(false);

  useEffect(() => {
    if (!draftPin) return;
    // Reset the form for each new draft pin — this component stays mounted across drops.
    setName('');
    setTerrain('Timber');
    setIsEdge(false);
    setFacingDeg(defaultFacingDeg);
    setNameError(false);
    setElevationSamples(null);
    setElevationLoading(true);
    fetchElevationsFt(slopeSamplePoints(draftPin)).then((samples) => {
      setElevationLoading(false);
      setElevationSamples(samples);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPin?.latitude, draftPin?.longitude]);

  const relativeElevation = useMemo(
    () => detectRelativeElevation(elevationSamples, facingDeg),
    [elevationSamples, facingDeg],
  );

  if (!draftPin) return null;
  const style = standTypeStyle(draftPin.standType);
  const Icon = style.icon;

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }
    onSave({
      name: trimmedName,
      terrain,
      isEdge,
      facingDeg,
      elevationFt: elevationSamples?.[0] ?? null,
      gameAreaRelativeElevation: relativeElevation,
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <View style={[styles.iconCircle, { backgroundColor: style.color }]}>
                <Icon size={18} color={palette.textHi} />
              </View>
              <Text style={styles.title}>New {draftPin.standType}</Text>
            </View>

            <Text style={styles.sectionLabel}>STAND NAME</Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (text.trim()) setNameError(false);
              }}
              placeholder="e.g. Back Ridge"
              placeholderTextColor={palette.textLo}
              style={[styles.input, nameError && styles.inputError]}
              autoFocus
            />
            {nameError && <Text style={styles.errorText}>Give this stand a name to save it.</Text>}

            <Text style={styles.sectionLabel}>TERRAIN TYPE</Text>
            <View style={styles.chipRow}>
              {TERRAIN_TYPES.map((t) => {
                const active = terrain === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTerrain(t)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? palette.amber : palette.panel, borderColor: active ? palette.amber : palette.line },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? palette.onAmber : palette.textLo }]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.edgeRow}>
              <View style={styles.edgeTextCol}>
                <Text style={styles.edgeLabel}>Edge / transition spot</Text>
                <Text style={styles.edgeSub}>e.g. timber-field edge, shoreline edge</Text>
              </View>
              <ToggleSwitch checked={isEdge} onChange={setIsEdge} />
            </View>

            <Text style={styles.sectionLabel}>FACING DIRECTION (where you expect game)</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={359}
              step={1}
              value={facingDeg}
              onValueChange={setFacingDeg}
              minimumTrackTintColor={palette.amber}
              maximumTrackTintColor={palette.line}
              thumbTintColor={palette.amber}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderEdgeLabel}>N</Text>
              <Text style={styles.sliderValue}>{toCompass(facingDeg)}</Text>
              <Text style={styles.sliderEdgeLabel}>N</Text>
            </View>

            <Text style={styles.hintText}>
              Game area elevation: {elevationLoading ? 'detecting slope…' : `${RELATIVE_ELEVATION_LABELS[relativeElevation]} stand`}{' '}
              — auto-detected from the terrain around this pin, no second pin needed.
            </Text>

            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Check size={14} color={palette.onAmber} />
              <Text style={styles.saveButtonText}>Save Stand</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </ScrollView>
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
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 24,
    paddingBottom: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.textHi, fontSize: 16, fontWeight: '600' },
  sectionLabel: { color: palette.textHi, fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    color: palette.textHi,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputError: { borderColor: palette.bad },
  errorText: { color: palette.bad, fontSize: 11, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12 },
  edgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  edgeTextCol: { flex: 1, paddingRight: 12 },
  edgeLabel: { color: palette.textHi, fontSize: 13 },
  edgeSub: { color: palette.textLo, fontSize: 11, marginTop: 2 },
  slider: { width: '100%', height: 40 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderEdgeLabel: { color: palette.textLo, fontSize: 11 },
  sliderValue: { color: palette.amber, fontFamily: mono, fontSize: 14 },
  hintText: { color: palette.textLo, fontSize: 11, marginTop: 14, lineHeight: 15 },
  saveButton: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: { color: palette.onAmber, fontSize: 13, letterSpacing: 0.5, fontWeight: '500' },
  cancelButton: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  cancelButtonText: { color: palette.textLo, fontSize: 13 },
});
