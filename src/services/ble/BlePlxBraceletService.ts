import { BleError, BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

import type { BraceletStatus } from '../../types';
import { Emitter } from '../Emitter';
import {
  BRACELET_DEVICE_NAME,
  BRACELET_SERVICE_UUID,
  BRACELET_VIBRATE_CHAR_UUID,
  BATTERY_LEVEL_CHAR_UUID,
  BATTERY_SERVICE_UUID,
  COMMAND_BYTE_BASE64,
} from './constants';
import type { BraceletService } from './types';

const SCAN_TIMEOUT_MS = 12_000;

/**
 * Real BLE implementation, built against a real dev-client/EAS build (not Expo Go — it
 * requires react-native-ble-plx's native module). Scans for a device advertising
 * BRACELET_DEVICE_NAME, connects, reads battery over the standard Battery Service, and
 * tracks RSSI for a coarse signal-strength label.
 *
 * TODO(hardware): once real bracelet firmware exists, confirm/replace
 * BRACELET_SERVICE_UUID / BRACELET_VIBRATE_CHAR_UUID and the battery characteristic path
 * in constants.ts — this was written against placeholder UUIDs.
 */
export class BlePlxBraceletService implements BraceletService {
  private manager = new BleManager();
  private device: Device | null = null;
  private status: BraceletStatus = {
    state: 'disconnected',
    deviceName: null,
    batteryPct: null,
    signal: null,
  };
  private statusEmitter = new Emitter<BraceletStatus>();
  private disconnectSubscription: { remove: () => void } | null = null;

  getStatus() {
    return this.status;
  }

  subscribe(listener: (status: BraceletStatus) => void) {
    listener(this.status);
    return this.statusEmitter.subscribe(listener);
  }

  private setStatus(patch: Partial<BraceletStatus>) {
    this.status = { ...this.status, ...patch };
    this.statusEmitter.emit(this.status);
  }

  private async ensurePermissions() {
    if (Platform.OS !== 'android') return;
    if (Platform.Version >= 31) {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    } else {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
  }

  private async waitForPoweredOn() {
    const state = await this.manager.state();
    if (state === State.PoweredOn) return;
    await new Promise<void>((resolve, reject) => {
      const sub = this.manager.onStateChange((next) => {
        if (next === State.PoweredOn) {
          sub.remove();
          resolve();
        } else if (next === State.Unsupported || next === State.Unauthorized) {
          sub.remove();
          reject(new Error(`Bluetooth unavailable: ${next}`));
        }
      }, true);
    });
  }

  async connect() {
    if (this.status.state !== 'disconnected') return;
    this.setStatus({ state: 'connecting' });

    try {
      await this.ensurePermissions();
      await this.waitForPoweredOn();

      const device = await new Promise<Device>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.manager.stopDeviceScan();
          reject(new Error('Bracelet scan timed out'));
        }, SCAN_TIMEOUT_MS);

        this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, found) => {
          if (error) {
            clearTimeout(timeout);
            this.manager.stopDeviceScan();
            reject(error);
            return;
          }
          if (found?.name === BRACELET_DEVICE_NAME || found?.localName === BRACELET_DEVICE_NAME) {
            clearTimeout(timeout);
            this.manager.stopDeviceScan();
            resolve(found);
          }
        });
      });

      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      this.device = connected;

      this.disconnectSubscription = connected.onDisconnected(() => {
        this.device = null;
        this.setStatus({ state: 'disconnected', deviceName: null, batteryPct: null, signal: null });
      });

      const batteryPct = await this.readBatteryLevel(connected);
      const rssi = await connected.readRSSI();

      this.setStatus({
        state: 'connected',
        deviceName: connected.name ?? BRACELET_DEVICE_NAME,
        batteryPct,
        signal: signalFromRssi(rssi.rssi),
      });
    } catch (err) {
      this.setStatus({ state: 'disconnected', deviceName: null, batteryPct: null, signal: null });
      throw err;
    }
  }

  private async readBatteryLevel(device: Device): Promise<number | null> {
    try {
      const char = await device.readCharacteristicForService(BATTERY_SERVICE_UUID, BATTERY_LEVEL_CHAR_UUID);
      if (!char.value) return null;
      // Battery level is a single unsigned byte, base64-encoded. Hermes has no built-in
      // atob, so decode the one byte we need by hand rather than pulling in a polyfill.
      return decodeFirstBase64Byte(char.value);
    } catch {
      return null;
    }
  }

  async disconnect() {
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    if (this.device) {
      await this.device.cancelConnection().catch(() => {});
      this.device = null;
    }
    this.setStatus({ state: 'disconnected', deviceName: null, batteryPct: null, signal: null });
  }

  async vibrate(pattern: 'alert' | 'short' = 'alert') {
    if (!this.device || this.status.state !== 'connected') return;
    const payload = pattern === 'alert' ? COMMAND_BYTE_BASE64.vibrateAlert : COMMAND_BYTE_BASE64.vibrateShort;
    try {
      await this.device.writeCharacteristicWithResponseForService(
        BRACELET_SERVICE_UUID,
        BRACELET_VIBRATE_CHAR_UUID,
        payload,
      );
    } catch (err) {
      console.warn('[BlePlxBraceletService] vibrate write failed:', (err as BleError).message ?? err);
    }
  }
}

function signalFromRssi(rssi: number | null): 'Strong' | 'Weak' | null {
  if (rssi == null) return null;
  return rssi >= -70 ? 'Strong' : 'Weak';
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodes just the first byte of a base64 string — enough for single-byte characteristics. */
function decodeFirstBase64Byte(base64: string): number | null {
  if (base64.length < 2) return null;
  const a = BASE64_CHARS.indexOf(base64[0]);
  const b = BASE64_CHARS.indexOf(base64[1]);
  if (a < 0 || b < 0) return null;
  return ((a << 2) | (b >> 4)) & 0xff;
}
