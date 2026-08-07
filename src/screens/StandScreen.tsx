import Slider from '@react-native-community/slider';
import { Check, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { ToggleSwitch } from '../components/ToggleSwitch';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import { TERRAIN_TYPES } from '../types';
import { toCompass } from '../utils/compass';

const GRID_SPACING = 20;
const MAP_HEIGHT = 160;
const SAVED_FEEDBACK_MS = 1800;

function MapGridBackground() {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const cols = Math.ceil(width / GRID_SPACING);
  const rows = Math.ceil(MAP_HEIGHT / GRID_SPACING);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={MAP_HEIGHT}>
          {Array.from({ length: cols }, (_, i) => (
            <Line
              key={`v${i}`}
              x1={i * GRID_SPACING}
              y1={0}
              x2={i * GRID_SPACING}
              y2={MAP_HEIGHT}
              stroke={palette.line}
              strokeWidth={1}
              opacity={0.2}
            />
          ))}
          {Array.from({ length: rows }, (_, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={i * GRID_SPACING}
              x2={width}
              y2={i * GRID_SPACING}
              stroke={palette.line}
              strokeWidth={1}
              opacity={0.2}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}

export function StandScreen() {
  const standFacingDeg = useAppStore((s) => s.standFacingDeg);
  const setStandFacing = useAppStore((s) => s.setStandFacing);
  const terrain = useAppStore((s) => s.terrain);
  const setTerrain = useAppStore((s) => s.setTerrain);
  const isEdge = useAppStore((s) => s.isEdge);
  const setIsEdge = useAppStore((s) => s.setIsEdge);
  const saveStand = useAppStore((s) => s.saveStand);

  const [justSaved, setJustSaved] = useState(false);

  const handleSave = () => {
    saveStand();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), SAVED_FEEDBACK_MS);
  };

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <MapGridBackground />
        <View style={styles.mapContent}>
          <MapPin size={26} color={palette.amber} />
          <Text style={styles.mapHint}>Tap map to drop stand pin</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>TERRAIN TYPE</Text>
      <View style={styles.terrainRow}>
        {TERRAIN_TYPES.map((t) => {
          const active = terrain === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTerrain(t)}
              style={[
                styles.terrainChip,
                { backgroundColor: active ? palette.amber : palette.panel, borderColor: active ? palette.amber : palette.line },
              ]}
            >
              <Text style={[styles.terrainChipText, { color: active ? palette.onAmber : palette.textLo }]}>{t}</Text>
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
        value={standFacingDeg}
        onValueChange={setStandFacing}
        minimumTrackTintColor={palette.amber}
        maximumTrackTintColor={palette.line}
        thumbTintColor={palette.amber}
      />
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderEdgeLabel}>N</Text>
        <Text style={styles.sliderValue}>{toCompass(standFacingDeg)}</Text>
        <Text style={styles.sliderEdgeLabel}>N</Text>
      </View>

      <Pressable onPress={handleSave} style={styles.saveButton}>
        {justSaved && <Check size={14} color={palette.onAmber} />}
        <Text style={styles.saveButtonText}>{justSaved ? 'Saved' : 'Save Stand Location'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  map: {
    height: MAP_HEIGHT,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContent: { alignItems: 'center' },
  mapHint: { color: palette.textLo, fontSize: 11, marginTop: 6 },
  sectionLabel: { color: palette.textHi, fontSize: 13, letterSpacing: 1, marginBottom: 8 },
  terrainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  terrainChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  terrainChipText: { fontSize: 12 },
  edgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
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
});
