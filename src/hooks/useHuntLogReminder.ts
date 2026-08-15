import { useEffect, useRef } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { useAppStore } from '../state/store';
import type { SightingOutcome, Stand } from '../types';
import { toCompass } from '../utils/compass';
import { genId } from '../utils/id';

// Shortest away-gap worth treating as "maybe a sit" — long enough that a quick app
// switch or a lunch break doesn't trigger it, short enough to still catch a normal hunt.
const MIN_AWAY_MS = 2 * 60 * 60 * 1000;

function logHunt(stand: Stand, sighting: SightingOutcome) {
  const { wind, addHuntLogEntry } = useAppStore.getState();
  addHuntLogEntry({
    id: genId(),
    timestamp: Date.now(),
    standId: stand.id,
    standName: stand.name,
    windLabel: `${wind.speedMph} mph ${toCompass(wind.directionDeg)}`,
    terrain: stand.terrain,
    isEdge: stand.isEdge,
    sighting,
    note: '',
  });
}

function promptSighting(stand: Stand) {
  Alert.alert('What did you see?', undefined, [
    { text: 'Nothing', onPress: () => logHunt(stand, 'none') },
    { text: 'Saw Game', onPress: () => logHunt(stand, 'saw-game') },
    { text: 'Harvest', onPress: () => logHunt(stand, 'harvest') },
  ]);
}

/** Nudges the hunter to log a hunt after they return from a long-enough absence with a
 * stand active — nothing else creates a HuntLogEntry automatically (see HuntLogModal),
 * so this is the backstop against undercounting the cooldown tracker and season report
 * both depend on. Detects "away" via app background/foreground transitions rather than
 * anything more invasive; `backgroundedAtMs` persists so a hunt where the OS killed the
 * app while backgrounded still gets caught on the next cold start. Mounted once at the
 * app root, same as the other device/alert hooks. */
export function useHuntLogReminder() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const checkAndMaybePrompt = () => {
      const state = useAppStore.getState();
      const backgroundedAtMs = state.backgroundedAtMs;
      if (backgroundedAtMs == null) return;

      // Consumed either way — a stale gap should never carry into a later check.
      state.setBackgroundedAtMs(null);
      if (!state.huntLogReminderOn) return;

      const awayMs = Date.now() - backgroundedAtMs;
      if (awayMs < MIN_AWAY_MS) return;

      const activeStand = state.stands.find((s) => s.id === state.activeStandId) ?? null;
      if (!activeStand) return;

      const alreadyLogged = state.huntLog.some(
        (e) => e.standId === activeStand.id && e.timestamp >= backgroundedAtMs,
      );
      if (alreadyLogged) return;

      Alert.alert('Log your hunt?', `Looks like you were out a while with ${activeStand.name} active.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Log Hunt', onPress: () => promptSighting(activeStand) },
      ]);
    };

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      if (prev === 'active' && next !== 'active') {
        useAppStore.getState().setBackgroundedAtMs(Date.now());
      } else if (prev !== 'active' && next === 'active') {
        checkAndMaybePrompt();
      }
      appStateRef.current = next;
    });

    // Cold start: a prior session may have persisted `backgroundedAtMs` before the OS
    // killed the app, which the AppState listener above has no transition to catch.
    checkAndMaybePrompt();

    return () => sub.remove();
  }, []);
}
