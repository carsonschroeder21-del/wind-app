import { useEffect, useRef } from 'react';

import { getBraceletService } from '../services/ble/factory';
import { buzzPhone } from '../services/haptics';
import { useAppStore } from '../state/store';
import { angularDiff, isWindUnfavorable } from '../utils/compass';
import type { AlertSensitivity } from '../types';

// How much the wind direction has to move before we re-alert on a wind that's still bad,
// keyed by the Alerts screen's sensitivity setting.
const SENSITIVITY_THRESHOLD_DEG: Record<AlertSensitivity, number> = {
  0: 25, // Major shifts only
  1: 12, // Balanced
  2: 0, // Any shift
};

function isQuietHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 23 || hour < 5;
}

/** Fires the bracelet buzz + a local haptic whenever wind turns unfavorable, respecting
 * the Alerts screen's buzz/sensitivity/quiet-hours settings. Mounted once at the app root. */
export function useBadWindAlerts() {
  const wind = useAppStore((s) => s.wind);
  const standFacingDeg = useAppStore((s) => s.standFacingDeg);
  const buzzOn = useAppStore((s) => s.buzzOn);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const quietHoursOn = useAppStore((s) => s.quietHoursOn);
  const braceletConnected = useAppStore((s) => s.bracelet.state === 'connected');

  const wasBadRef = useRef(false);
  const lastAlertDirRef = useRef<number | null>(null);

  useEffect(() => {
    const isBad = isWindUnfavorable(wind.directionDeg, standFacingDeg);

    if (!isBad) {
      wasBadRef.current = false;
      lastAlertDirRef.current = null;
      return;
    }

    if (!buzzOn || (quietHoursOn && isQuietHours(new Date()))) return;

    const threshold = SENSITIVITY_THRESHOLD_DEG[sensitivity];
    const shouldAlert =
      !wasBadRef.current ||
      lastAlertDirRef.current == null ||
      angularDiff(wind.directionDeg, lastAlertDirRef.current) > threshold;

    if (!shouldAlert) return;

    wasBadRef.current = true;
    lastAlertDirRef.current = wind.directionDeg;

    buzzPhone('alert');
    if (braceletConnected) {
      getBraceletService().vibrate('alert');
    }
  }, [wind, standFacingDeg, buzzOn, sensitivity, quietHoursOn, braceletConnected]);
}
