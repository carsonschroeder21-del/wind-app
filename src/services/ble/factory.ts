import Constants, { ExecutionEnvironment } from 'expo-constants';

import { MockBraceletService } from './MockBraceletService';
import { MockWindSensorService } from './MockWindSensorService';
import type { BraceletService, WindSensorService } from './types';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let braceletService: BraceletService | null = null;
let windSensorService: WindSensorService | null = null;

/**
 * react-native-ble-plx needs its native module, which only exists in a dev-client/EAS
 * build — never in Expo Go. We detect that at runtime and fall back to the mock so the
 * app still runs (with simulated data) everywhere, and picks up real hardware
 * automatically the moment it's built with the dev client.
 */
export function getBraceletService(): BraceletService {
  if (braceletService) return braceletService;

  if (!isExpoGo) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const RealModule = require('./BlePlxBraceletService') as { BlePlxBraceletService: new () => BraceletService };
      const instance = new RealModule.BlePlxBraceletService();
      braceletService = instance;
      return instance;
    } catch (err) {
      console.warn('[ble] native BLE module unavailable, using MockBraceletService:', err);
    }
  }

  const mock = new MockBraceletService();
  braceletService = mock;
  return mock;
}

// TODO: swap for a real WeatherFlow integration (UDP over local Wi-Fi, see constants.ts)
// once that transport is implemented — keep this factory as the single call site so
// screens/store code never needs to change.
export function getWindSensorService(): WindSensorService {
  if (!windSensorService) {
    windSensorService = new MockWindSensorService();
  }
  return windSensorService;
}
