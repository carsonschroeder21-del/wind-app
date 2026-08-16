import { useEffect, useRef } from 'react';

import { contributeThermalTrainingRow, pushHuntLogEntry, pushThermalLogEntry } from '../services/supabase/sync';
import { useAppStore } from '../state/store';

// Retry cadence for entries that failed to push (no connectivity, etc). New entries also
// trigger an immediate attempt via the effect's dependencies below, so this is a fallback,
// not the primary way sync happens.
const RETRY_INTERVAL_MS = 2 * 60 * 1000;

/** Always-on personal sync once signed in — every hunt log / thermal log entry gets
 * pushed to the account's own private tables (RLS-restricted to that account, see
 * supabase/schema.sql). This is unconditional and separate from the training opt-in
 * below: losing your phone shouldn't cost you your data regardless of whether you've
 * ever agreed to share anything. If `shareForTraining` is also on, thermal entries
 * additionally get an anonymized copy contributed to the shared training table — a
 * distinct action from personal sync, tracked with its own id list so turning the
 * setting on later catches up on entries that were already personally synced. Mounted
 * once at the app root. */
export function useCloudSync() {
  const authUserId = useAppStore((s) => s.authUserId);
  const huntLogCount = useAppStore((s) => s.huntLog.length);
  const thermalLogCount = useAppStore((s) => s.thermalLogs.length);
  const shareForTraining = useAppStore((s) => s.shareForTraining);
  const runningRef = useRef(false);

  useEffect(() => {
    const runSync = async () => {
      if (runningRef.current) return;
      const state = useAppStore.getState();
      const userId = state.authUserId;
      if (!userId) return;

      runningRef.current = true;
      try {
        const syncedIds = new Set(state.syncedEntryIds);
        const contributedIds = new Set(state.trainingContributedEntryIds);
        const newlySynced: string[] = [];
        const newlyContributed: string[] = [];

        for (const entry of state.huntLog) {
          if (syncedIds.has(entry.id)) continue;
          if (await pushHuntLogEntry(userId, entry)) newlySynced.push(entry.id);
        }

        for (const entry of state.thermalLogs) {
          if (!syncedIds.has(entry.id) && (await pushThermalLogEntry(userId, entry))) {
            newlySynced.push(entry.id);
          }
          if (state.shareForTraining && !contributedIds.has(entry.id) && (await contributeThermalTrainingRow(entry))) {
            newlyContributed.push(entry.id);
          }
        }

        if (newlySynced.length > 0) useAppStore.getState().markEntriesSynced(newlySynced);
        if (newlyContributed.length > 0) useAppStore.getState().markEntriesContributed(newlyContributed);
      } finally {
        runningRef.current = false;
      }
    };

    runSync();
    const interval = setInterval(runSync, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authUserId, huntLogCount, thermalLogCount, shareForTraining]);
}
