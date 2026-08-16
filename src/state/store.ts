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

const DAY_MS = 24 * 60 * 60 * 1000;

// Predate per-stand tracking (standId: null) — illustrative history only, not counted
// against any stand's cooldown.
const SEED_LOG: HuntLogEntry[] = [
  {
    id: 'seed-1',
    timestamp: Date.now() - 12 * DAY_MS,
    standId: null,
    standName: '',
    windLabel: '4 mph NW',
    terrain: 'Timber',
    isEdge: true,
    sighting: 'saw-game',
    note: 'Good — steady, favorable',
  },
  {
    id: 'seed-2',
    timestamp: Date.now() - 13 * DAY_MS,
    standId: null,
    standName: '',
    windLabel: '9 mph SE',
    terrain: 'Field',
    isEdge: false,
    sighting: 'none',
    note: 'Shifted bad at 6:30',
  },
  {
    id: 'seed-3',
    timestamp: Date.now() - 16 * DAY_MS,
    standId: null,
    standName: '',
    windLabel: '2 mph N',
    terrain: 'Water',
    isEdge: false,
    sighting: 'none',
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

  // Stand cooldown tracker: how many days the rolling "hunted N times" window covers,
  // and how many hunts within it trip the "resting recommended" flag.
  cooldownWindowDays: number;
  setCooldownWindowDays: (days: number) => void;
  cooldownThreshold: number;
  setCooldownThreshold: (count: number) => void;

  // Good-sit-window notification: whether it's on, what hour (local, 0-23) the once-daily
  // check runs at, and the date (YYYY-MM-DD) it last ran — so it only fires once per day.
  goodSitNotificationsOn: boolean;
  setGoodSitNotificationsOn: (on: boolean) => void;
  goodSitCheckHour: number;
  setGoodSitCheckHour: (hour: number) => void;
  lastGoodSitCheckDateKey: string | null;
  markGoodSitChecked: (dateKey: string) => void;

  // Hunt log reminder: nudges the hunter to log a hunt after a long-enough app absence
  // with a stand active, since nothing else creates a HuntLogEntry automatically.
  // `backgroundedAtMs` is set when the app leaves the foreground and cleared once
  // consumed by the next foreground check — persisted so it survives the OS killing the
  // app while backgrounded (the exact case this is meant to catch).
  huntLogReminderOn: boolean;
  setHuntLogReminderOn: (on: boolean) => void;
  backgroundedAtMs: number | null;
  setBackgroundedAtMs: (ms: number | null) => void;

  // Cloud sync account. Not persisted here — Supabase's own client already persists the
  // session to AsyncStorage; this is just a live mirror of it (set by useSupabaseAuth,
  // mounted at the root) so the UI/sync hook can read "who's signed in" synchronously
  // without an async lookup.
  authUserId: string | null;
  authEmail: string | null;
  setAuthUser: (user: { id: string; email: string | null } | null) => void;

  // Personal hunt-log/thermal-log sync happens automatically once signed in — always on,
  // no separate toggle. Contributing an anonymized copy to the shared training dataset is
  // a distinct, off-by-default opt-in.
  shareForTraining: boolean;
  setShareForTraining: (on: boolean) => void;
  // Entry ids (shared id space across huntLog/thermalLogs — genId() is unique across
  // both) already pushed to the account's private tables, and already contributed to the
  // anonymized training table. Two separate lists because the two are separate decisions
  // that can happen at different times (e.g. turning training-sharing on later triggers a
  // catch-up pass over entries that were already personally synced).
  syncedEntryIds: string[];
  trainingContributedEntryIds: string[];
  markEntriesSynced: (ids: string[]) => void;
  markEntriesContributed: (ids: string[]) => void;

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

      cooldownWindowDays: 7,
      setCooldownWindowDays: (cooldownWindowDays) => set({ cooldownWindowDays }),
      cooldownThreshold: 3,
      setCooldownThreshold: (cooldownThreshold) => set({ cooldownThreshold }),

      goodSitNotificationsOn: true,
      setGoodSitNotificationsOn: (goodSitNotificationsOn) => set({ goodSitNotificationsOn }),
      goodSitCheckHour: 18,
      setGoodSitCheckHour: (goodSitCheckHour) => set({ goodSitCheckHour }),
      lastGoodSitCheckDateKey: null,
      markGoodSitChecked: (dateKey) => set({ lastGoodSitCheckDateKey: dateKey }),

      huntLogReminderOn: true,
      setHuntLogReminderOn: (huntLogReminderOn) => set({ huntLogReminderOn }),
      backgroundedAtMs: null,
      setBackgroundedAtMs: (backgroundedAtMs) => set({ backgroundedAtMs }),

      authUserId: null,
      authEmail: null,
      setAuthUser: (user) => set({ authUserId: user?.id ?? null, authEmail: user?.email ?? null }),

      shareForTraining: false,
      setShareForTraining: (shareForTraining) => set({ shareForTraining }),
      syncedEntryIds: [],
      trainingContributedEntryIds: [],
      markEntriesSynced: (ids) =>
        set((s) => ({ syncedEntryIds: [...s.syncedEntryIds, ...ids.filter((id) => !s.syncedEntryIds.includes(id))] })),
      markEntriesContributed: (ids) =>
        set((s) => ({
          trainingContributedEntryIds: [
            ...s.trainingContributedEntryIds,
            ...ids.filter((id) => !s.trainingContributedEntryIds.includes(id)),
          ],
        })),

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
        cooldownWindowDays: state.cooldownWindowDays,
        cooldownThreshold: state.cooldownThreshold,
        goodSitNotificationsOn: state.goodSitNotificationsOn,
        goodSitCheckHour: state.goodSitCheckHour,
        lastGoodSitCheckDateKey: state.lastGoodSitCheckDateKey,
        huntLogReminderOn: state.huntLogReminderOn,
        backgroundedAtMs: state.backgroundedAtMs,
        shareForTraining: state.shareForTraining,
        syncedEntryIds: state.syncedEntryIds,
        trainingContributedEntryIds: state.trainingContributedEntryIds,
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
