import Slider from '@react-native-community/slider';
import { Check, LocateFixed, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LatLng } from 'react-native-maps';

import { fetchElevationFt } from '../services/elevation';
import { getCurrentLocation } from '../services/location';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import { GAME_AREA_RELATIVE_ELEVATIONS, TERRAIN_TYPES } from '../types';
import type { GameAreaRelativeElevation, Stand, Terrain } from '../types';
import { toCompass } from '../utils/compass';
import { StandMapPicker } from './StandMapPicker';
import { ToggleSwitch } from './ToggleSwitch';

const RELATIVE_ELEVATION_LABELS: Record<GameAreaRelativeElevation, string> = {
  above: 'Above',
  level: 'Level with',
  below: 'Below',
};

interface StandEditorProps {
  /** null when creating a new stand. */
  standId: string | null;
  onDone: () => void;
}

export function StandEditor({ standId, onDone }: StandEditorProps) {
  const existing = useAppStore((s) => s.stands.find((st) => st.id === standId) ?? null);
  const activeStand = useAppStore((s) => s.stands.find((st) => st.id === s.activeStandId) ?? null);
  const addStand = useAppStore((s) => s.addStand);
  const updateStand = useAppStore((s) => s.updateStand);
  const deleteStand = useAppStore((s) => s.deleteStand);

  const [name, setName] = useState(existing?.name ?? '');
  const [terrain, setTerrain] = useState<Terrain>(existing?.terrain ?? 'Timber');
  const [isEdge, setIsEdge] = useState(existing?.isEdge ?? false);
  const [facingDeg, setFacingDeg] = useState(existing?.facingDeg ?? activeStand?.facingDeg ?? 0);
  const [latitude, setLatitude] = useState<number | null>(existing?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(existing?.longitude ?? null);
  const [elevationFt, setElevationFt] = useState<number | null>(existing?.elevationFt ?? null);
  const [relativeElevation, setRelativeElevation] = useState<GameAreaRelativeElevation>(
    existing?.gameAreaRelativeElevation ?? 'level',
  );

  const [locating, setLocating] = useState(false);
  const [elevationLoading, setElevationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);

  /** Single funnel for every way a coordinate can be set — map tap, marker drag, or the
   * GPS button — so elevation lookup always follows consistently. */
  const handleLocationChange = async (coords: LatLng) => {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
    setLocationError(null);

    setElevationLoading(true);
    const ft = await fetchElevationFt(coords.latitude, coords.longitude);
    setElevationLoading(false);
    setElevationFt(ft);
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    setLocationError(null);
    const result = await getCurrentLocation();
    setLocating(false);

    if (!result.ok) {
      setLocationError(
        result.reason === 'permission-denied'
          ? 'Location permission denied — enable it in Settings to tag this stand.'
          : "Couldn't get your location. Try again.",
      );
      return;
    }

    await handleLocationChange(result.location);
  };

  const handleRefreshElevation = async () => {
    if (latitude == null || longitude == null) return;
    setElevationLoading(true);
    const ft = await fetchElevationFt(latitude, longitude);
    setElevationLoading(false);
    setElevationFt(ft);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }

    const payload: Omit<Stand, 'id' | 'createdAt' | 'updatedAt'> = {
      name: trimmedName,
      terrain,
      isEdge,
      facingDeg,
      latitude,
      longitude,
      elevationFt,
      gameAreaRelativeElevation: relativeElevation,
    };

    if (existing) {
      updateStand(existing.id, payload);
    } else {
      addStand(payload);
    }
    onDone();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Delete stand?', `"${existing.name}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteStand(existing.id);
          onDone();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
      />
      {nameError && <Text style={styles.errorText}>Give this stand a name to save it.</Text>}

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

      <Text style={styles.sectionLabel}>GAME AREA IS...</Text>
      <View style={styles.terrainRow}>
        {GAME_AREA_RELATIVE_ELEVATIONS.map((option) => {
          const active = relativeElevation === option;
          return (
            <Pressable
              key={option}
              onPress={() => setRelativeElevation(option)}
              style={[
                styles.terrainChip,
                { backgroundColor: active ? palette.amber : palette.panel, borderColor: active ? palette.amber : palette.line },
              ]}
            >
              <Text style={[styles.terrainChipText, { color: active ? palette.onAmber : palette.textLo }]}>
                {RELATIVE_ELEVATION_LABELS[option]} stand
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>LOCATION</Text>
      <StandMapPicker latitude={latitude} longitude={longitude} onPick={handleLocationChange} height={200} />

      <Pressable onPress={handleUseCurrentLocation} disabled={locating} style={styles.locationButton}>
        {locating ? (
          <ActivityIndicator size="small" color={palette.onAmber} />
        ) : (
          <>
            <LocateFixed size={14} color={palette.onAmber} />
            <Text style={styles.locationButtonText}>Use Current Location</Text>
          </>
        )}
      </Pressable>
      {locationError && <Text style={styles.errorText}>{locationError}</Text>}
      {latitude != null && longitude != null && (
        <Text style={styles.coordsText}>
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
      )}

      <View style={styles.elevationRow}>
        <Text style={styles.elevationText}>
          Elevation: {elevationLoading ? 'Looking up…' : elevationFt != null ? `${elevationFt} ft` : '— ft'}
        </Text>
        {latitude != null && longitude != null && (
          <Pressable onPress={handleRefreshElevation} disabled={elevationLoading} hitSlop={8}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Check size={14} color={palette.onAmber} />
        <Text style={styles.saveButtonText}>{existing ? 'Save Changes' : 'Save Stand'}</Text>
      </Pressable>

      <Pressable onPress={onDone} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>

      {existing && (
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Trash2 size={14} color={palette.bad} />
          <Text style={styles.deleteButtonText}>Delete Stand</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  sectionLabel: { color: palette.textHi, fontSize: 13, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
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
  terrainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  terrainChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  terrainChipText: { fontSize: 12 },
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
  coordsText: { color: palette.textLo, fontSize: 11, marginTop: 8, fontFamily: mono },
  locationButton: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  locationButtonText: { color: palette.onAmber, fontSize: 12, fontWeight: '500' },
  elevationRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  elevationText: { color: palette.textLo, fontSize: 12 },
  refreshText: { color: palette.amber, fontSize: 12 },
  saveButton: {
    marginTop: 28,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: { color: palette.onAmber, fontSize: 13, letterSpacing: 0.5, fontWeight: '500' },
  cancelButton: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  cancelButtonText: { color: palette.textLo, fontSize: 13 },
  deleteButton: {
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: palette.bad,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: { color: palette.bad, fontSize: 13 },
});
