import { useEffect } from 'react';

import { getBraceletService, getWindSensorService } from '../services/ble/factory';
import { regionalWindEstimator } from '../services/wind/RegionalWindEstimator';
import { useAppStore } from '../state/store';

/**
 * Bridges the device services (bracelet, WINDmeter, regional estimator) into the store.
 * Mounted once at the app root so status/readings keep flowing regardless of which tab
 * is on screen.
 */
export function useDeviceSync() {
  useEffect(() => {
    const bracelet = getBraceletService();
    const windSensor = getWindSensorService();

    const unsubBracelet = bracelet.subscribe((status) => {
      useAppStore.getState().setBraceletStatus(status);
    });

    const unsubSensorStatus = windSensor.subscribe((status) => {
      useAppStore.getState().setWindSensorStatus(status);
    });

    const unsubSensorReading = windSensor.onReading((reading) => {
      if (useAppStore.getState().windSensor.state === 'connected') {
        useAppStore.getState().setWind(reading);
        useAppStore.getState().recordWindHistory(reading, 'live');
      }
    });

    const unsubRegional = regionalWindEstimator.onReading((reading) => {
      if (useAppStore.getState().windSensor.state !== 'connected') {
        useAppStore.getState().setWind(reading);
        useAppStore.getState().recordWindHistory(reading, 'regional');
      }
    });

    return () => {
      unsubBracelet();
      unsubSensorStatus();
      unsubSensorReading();
      unsubRegional();
    };
  }, []);
}
