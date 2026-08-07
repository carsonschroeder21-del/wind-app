import type { WindReading, WindSensorStatus } from '../../types';
import { Emitter } from '../Emitter';
import { WINDMETER_DEVICE_NAME } from './constants';
import type { WindSensorService } from './types';

const CONNECT_DELAY_MS = 700;
const READING_INTERVAL_MS = 1200;

/** Simulated WeatherFlow WINDmeter feed — same random-walk shape as the web prototype's
 * regional estimate, just on a tighter cadence to feel like a live sensor. */
export class MockWindSensorService implements WindSensorService {
  private status: WindSensorStatus = { state: 'disconnected', deviceName: null };
  private statusEmitter = new Emitter<WindSensorStatus>();
  private readingEmitter = new Emitter<WindReading>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private reading: WindReading = { directionDeg: 300, speedMph: 6, updatedAt: Date.now() };

  getStatus() {
    return this.status;
  }

  subscribe(listener: (status: WindSensorStatus) => void) {
    listener(this.status);
    return this.statusEmitter.subscribe(listener);
  }

  onReading(listener: (reading: WindReading) => void) {
    return this.readingEmitter.subscribe(listener);
  }

  private setStatus(patch: Partial<WindSensorStatus>) {
    this.status = { ...this.status, ...patch };
    this.statusEmitter.emit(this.status);
  }

  private startFeed() {
    this.stopFeed();
    this.intervalId = setInterval(() => {
      const directionDeg = (this.reading.directionDeg + (Math.random() * 8 - 4) + 360) % 360;
      const speedMph = Math.max(1, Math.min(22, Math.round(this.reading.speedMph + (Math.random() * 2 - 1))));
      this.reading = { directionDeg, speedMph, updatedAt: Date.now() };
      this.readingEmitter.emit(this.reading);
    }, READING_INTERVAL_MS);
  }

  private stopFeed() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async connect() {
    if (this.status.state !== 'disconnected') return;
    this.setStatus({ state: 'connecting' });
    await new Promise((resolve) => setTimeout(resolve, CONNECT_DELAY_MS));
    this.setStatus({ state: 'connected', deviceName: WINDMETER_DEVICE_NAME });
    this.readingEmitter.emit(this.reading);
    this.startFeed();
  }

  async disconnect() {
    this.stopFeed();
    this.setStatus({ state: 'disconnected', deviceName: null });
  }
}
