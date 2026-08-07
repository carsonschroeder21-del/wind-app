import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AlertSensitivity,
  BraceletStatus,
  HuntLogEntry,
  Terrain,
  WindReading,
  WindSensorStatus,
} from '../types';

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

interface AppState {
  wind: WindReading;
  setWind: (reading: WindReading) => void;

  standFacingDeg: number;
  setStandFacing: (deg: number) => void;
  terrain: Terrain;
  setTerrain: (terrain: Terrain) => void;
  isEdge: boolean;
  setIsEdge: (isEdge: boolean) => void;
  standSavedAt: number | null;
  saveStand: () => void;

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      wind: { directionDeg: 300, speedMph: 6, updatedAt: Date.now() },
      setWind: (wind) => set({ wind }),

      standFacingDeg: 120,
      setStandFacing: (standFacingDeg) => set({ standFacingDeg }),
      terrain: 'Timber',
      setTerrain: (terrain) => set({ terrain }),
      isEdge: false,
      setIsEdge: (isEdge) => set({ isEdge }),
      standSavedAt: null,
      saveStand: () => set({ standSavedAt: Date.now() }),

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
    }),
    {
      name: 'wind-scout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Live sensor/BLE connection state and the current wind reading are runtime-only —
      // only persist the durable settings and history a hunter would expect to survive
      // an app restart.
      partialize: (state) => ({
        standFacingDeg: state.standFacingDeg,
        terrain: state.terrain,
        isEdge: state.isEdge,
        standSavedAt: state.standSavedAt,
        buzzOn: state.buzzOn,
        sensitivity: state.sensitivity,
        quietHoursOn: state.quietHoursOn,
        huntLog: state.huntLog,
      }),
    },
  ),
);
