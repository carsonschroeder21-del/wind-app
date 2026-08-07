import type { BraceletStatus } from '../../types';
import { Emitter } from '../Emitter';
import { BRACELET_DEVICE_NAME } from './constants';
import type { BraceletService } from './types';

const CONNECT_DELAY_MS = 900;

/**
 * Simulated bracelet, used in Expo Go and as the fallback when no dev-client BLE build is
 * available. Mirrors the connect/disconnect + battery/signal behavior from the web
 * prototype so the Device screen behaves identically until real hardware exists.
 */
export class MockBraceletService implements BraceletService {
  private status: BraceletStatus = {
    state: 'disconnected',
    deviceName: null,
    batteryPct: null,
    signal: null,
  };
  private statusEmitter = new Emitter<BraceletStatus>();

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

  async connect() {
    if (this.status.state !== 'disconnected') return;
    this.setStatus({ state: 'connecting' });
    await new Promise((resolve) => setTimeout(resolve, CONNECT_DELAY_MS));
    this.setStatus({
      state: 'connected',
      deviceName: BRACELET_DEVICE_NAME,
      batteryPct: 82,
      signal: 'Strong',
    });
  }

  async disconnect() {
    this.setStatus({ state: 'disconnected', deviceName: null, batteryPct: null, signal: null });
  }

  async vibrate(pattern: 'alert' | 'short' = 'alert') {
    if (this.status.state !== 'connected') return;
    console.log(`[MockBraceletService] would send "${pattern}" vibrate command to ${this.status.deviceName}`);
  }
}
