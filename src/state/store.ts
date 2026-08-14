import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AlertSensitivity,
  BraceletStatus,
  HuntLogEntry,
  Stand,
  ThermalLogEntry,
  WindHistoryEntry,
  WindReading,
  WindSensorStatus,
  WindSource,
} from '../types';
import { genId } from '../utils/id';

const SEED_LOG: HuntLogEntry[] = [
  {
    id: 'seed-1',
    date: 'Aug 2',
    time: '6:14 AM',
    windLabel: '4 mph NW',
    terrain: 'Timber',
    isEdge: true,
    note: 'Good — steady, favorable',
  },
  {
    id: 'seed-2',
    date: 'Aug 1',
    time: '5:50 PM',
    windLabel: '9 mph SE',
    terrain: 'Field',
    isEdge: false,
    note: 'Shifted bad at 6:30',
  },
  {
    id: 'seed-3',
    date: 'Jul 29',
    time: '6:02 AM',
    windLabel: '2 mph N',
    terrain: 'Water',
    isEdge: false,
    note: 'Calm, favorable all sit',
  },
];

function createDefaultStand(): Stand {
  const now = Date.now();
  return {
    id: genId(),
    name: 'My Stand',
    terrain: 'Timber',
    isEdge: false,
    facingDeg: 120,
    latitude: null,
    longitude: null,
    elevationFt: null,
    gameAreaRelativeElevation: 'level',
    media: null,
    gameAreaLatitude: null,
    gameAreaLongitude: null,
    parkingLatitude: null,
    parkingLongitude: null,
    createdAt: now,
    updatedAt: now,
  };
}

const SEED_STAND = createDefaultStand();

interface AppState {
  wind: WindReading;
  setWind: (reading: WindReading) => void;

  stands: Stand[];
  activeStandId: string | null;
  // `id` is normally left for addStand to generate, but callers that need to know the
  // id before the stand exists in the store (e.g. to namespace uploaded media files
  // under it while the editor is still open) can supply one up front.
  addStand: (input: Omit<Stand, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string;
  updateStand: (id: string, patch: Partial<Omit<Stand, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteStand: (id: string) => void;
  setActiveStandId: (id: string) => void;

  buzzOn: boolean;
  setBuzzOn: (on: boolean) => void;
  sensitivity: AlertSensitivity;
  setSensitivity: (level: AlertSensitivity) => void;
  quietHoursOn: boolean;
  setQuietHoursOn: (on: boolean) => void;

  bracelet: BraceletStatus;
  setBraceletStatus: (status: BraceletStatus) => void;
  windSensor: WindSensorStatus;
  setWindSensorStatus: (status: WindSensorStatus) => void;

  huntLog: HuntLogEntry[];
  addHuntLogEntry: (entry: HuntLogEntry) => void;

  thermalLogs: ThermalLogEntry[];
  addThermalLogEntry: (entry: ThermalLogEntry) => void;

  windHistory: WindHistoryEntry[];
  recordWindHistory: (reading: WindReading, source: WindSource) => void;
}

const WIND_HISTORY_MAX_AGE_MS = 96 * 60 * 60 * 1000;
// Readings arrive every couple of seconds from the sensor/regional drift model — that's
// far more resolution than a time slider scrubbed by hand needs, so only keep one entry
// per interval to keep persisted storage small.
const WIND_HISTORY_MIN_INTERVAL_MS = 5 * 60 * 1000;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      wind: { directionDeg: 300, speedMph: 6, updatedAt: Date.now() },
      setWind: (wind) => set({ wind }),

      stands: [SEED_STAND],
      activeStandId: SEED_STAND.id,

      addStand: (input) => {
        const now = Date.now();
        const { id, ...rest } = input;
        const stand: Stand = { ...rest, id: id ?? genId(), createdAt: now, updatedAt: now };
        set((s) => ({ stands: [...s.stands, stand] }));
        return stand.id;
      },

      updateStand: (id, patch) =>
        set((s) => ({
          stands: s.stands.map((stand) => (stand.id === id ? { ...stand, ...patch, updatedAt: Date.now() } : stand)),
        })),

      deleteStand: (id) =>
        set((s) => {
          const stands = s.stands.filter((stand) => stand.id !== id);
          const activeStandId = s.activeStandId === id ? (stands[0]?.id ?? null) : s.activeStandId;
          return { stands, activeStandId };
        }),

      setActiveStandId: (activeStandId) => set({ activeStandId }),

      buzzOn: true,
      setBuzzOn: (buzzOn) => set({ buzzOn }),
      sensitivity: 1,
      setSensitivity: (sensitivity) => set({ sensitivity }),
      quietHoursOn: false,
      setQuietHoursOn: (quietHoursOn) => set({ quietHoursOn }),

      bracelet: { state: 'disconnected', deviceName: null, batteryPct: null, signal: null },
      setBraceletStatus: (bracelet) => set({ bracelet }),
      windSensor: { state: 'disconnected', deviceName: null },
      setWindSensorStatus: (windSensor) => set({ windSensor }),

      huntLog: SEED_LOG,
      addHuntLogEntry: (entry) => set((s) => ({ huntLog: [entry, ...s.huntLog] })),

      thermalLogs: [],
      addThermalLogEntry: (entry) => set((s) => ({ thermalLogs: [entry, ...s.thermalLogs] })),

      windHistory: [],
      recordWindHistory: (reading, source) =>
        set((s) => {
          const last = s.windHistory[s.windHistory.length - 1];
          if (last && reading.updatedAt - last.updatedAt < WIND_HISTORY_MIN_INTERVAL_MS) return s;

          const cutoff = reading.updatedAt - WIND_HISTORY_MAX_AGE_MS;
          const windHistory = [...s.windHistory, { ...reading, source }].filter((e) => e.updatedAt >= cutoff);
          return { windHistory };
        }),
    }),
    {
      name: 'wind-scout-storage',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Live sensor/BLE connection state and the current wind reading are runtime-only —
      // only persist the durable settings and history a hunter would expect to survive
      // an app restart.
      partialize: (state) => ({
        stands: state.stands,
        activeStandId: state.activeStandId,
        buzzOn: state.buzzOn,
        sensitivity: state.sensitivity,
        quietHoursOn: state.quietHoursOn,
        huntLog: state.huntLog,
        thermalLogs: state.thermalLogs,
        windHistory: state.windHistory,
      }),
      // v1 stored a single flat stand (standFacingDeg/terrain/isEdge) instead of a
      // stands[] list — no real users yet, so just reseed a default stand rather than
      // writing a field-by-field migration for a shape that never shipped.
      migrate: (persistedState, version) => {
        if (version < 2) {
          const stand = createDefaultStand();
          return {
            stands: [stand],
            activeStandId: stand.id,
            huntLog: SEED_LOG,
            thermalLogs: [],
          } as unknown as AppState;
        }
        return persistedState as AppState;
      },
    },
  ),
);

export function getActiveStand(state: AppState): Stand | null {
  return state.stands.find((s) => s.id === state.activeStandId) ?? null;
}
