import { useEffect, useRef } from 'react';

import { ensureNotificationPermission, presentLocalNotification } from '../services/notifications';
import { fetchWeatherSeries } from '../services/weather/openMeteo';
import { useAppStore } from '../state/store';
import type { WeatherPoint } from '../types';
import { findGoodSitWindow, formatGoodSitMessage } from '../utils/sitWindow';

// How often to check whether today's daily evaluation is due. Cheap either way — the
// actual evaluation itself only runs once it's actually due, see `lastGoodSitCheckDateKey`.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Once a day, at/after the configured evening hour (Alerts screen), evaluates every
 * saved stand's 12-18h-out forecast for a genuinely strong wind/thermal/entry-risk
 * alignment (see src/utils/sitWindow.ts) and fires a local notification if one clears the
 * bar. Driven by a periodic in-app check rather than a true OS background task — a
 * notification's content has to be computed from a live forecast, which needs the JS app
 * running, and reliable exact-time background execution needs a custom dev client. So
 * this fires the first time the app is open at/after the configured hour each day, not
 * from fully closed — see README "Good-sit notification notes." Mounted once at the app
 * root, same as useDeviceSync/useBadWindAlerts. */
export function useGoodSitWindowCheck() {
  const runningRef = useRef(false);

  useEffect(() => {
    const runCheckIfDue = async () => {
      if (runningRef.current) return;

      const state = useAppStore.getState();
      if (!state.goodSitNotificationsOn) return;

      const now = new Date();
      if (now.getHours() < state.goodSitCheckHour) return;

      const todayKey = dateKey(now);
      if (state.lastGoodSitCheckDateKey === todayKey) return;

      runningRef.current = true;
      try {
        const standsWithLocation = state.stands.filter((s) => s.latitude != null && s.longitude != null);
        const entries = await Promise.all(
          standsWithLocation.map(
            async (stand) => [stand.id, await fetchWeatherSeries(stand.latitude!, stand.longitude!)] as const,
          ),
        );
        const weatherSeriesByStandId: Record<string, WeatherPoint[] | null> = Object.fromEntries(entries);

        const window = findGoodSitWindow({
          stands: state.stands,
          weatherSeriesByStandId,
          huntLog: state.huntLog,
          cooldownWindowDays: state.cooldownWindowDays,
          cooldownThreshold: state.cooldownThreshold,
          fromMs: now.getTime(),
        });

        if (window) {
          const granted = await ensureNotificationPermission();
          if (granted) {
            await presentLocalNotification('Good Sit Window', formatGoodSitMessage(window, now.getTime()));
          }
        }
      } catch (err) {
        console.warn('[useGoodSitWindowCheck] daily check failed:', err);
      } finally {
        useAppStore.getState().markGoodSitChecked(todayKey);
        runningRef.current = false;
      }
    };

    runCheckIfDue();
    const interval = setInterval(runCheckIfDue, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
