import type { WindReading } from '../../types';
import { Emitter } from '../Emitter';

const DRIFT_INTERVAL_MS = 2200;

/**
 * Synthetic "regional" wind estimate — same drift model as the web prototype's demo data.
 * Stands in for a real regional weather API (e.g. NWS/OpenWeather point forecast) lookup
 * keyed on GPS location, which is the natural real-data source for this path later.
 */
export class RegionalWindEstimator {
  private reading: WindReading = { directionDeg: 300, speedMph: 6, updatedAt: Date.now() };
  private readingEmitter = new Emitter<WindReading>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private subscriberCount = 0;

  getReading() {
    return this.reading;
  }

  onReading(listener: (reading: WindReading) => void): () => void {
    listener(this.reading);
    this.subscriberCount += 1;
    if (this.subscriberCount === 1) this.start();

    const unsubscribe = this.readingEmitter.subscribe(listener);
    return () => {
      unsubscribe();
      this.subscriberCount -= 1;
      if (this.subscriberCount <= 0) this.stop();
    };
  }

  private start() {
    if (this.intervalId != null) return;
    this.intervalId = setInterval(() => {
      const directionDeg = (this.reading.directionDeg + (Math.random() * 10 - 5) + 360) % 360;
      const speedMph = Math.max(1, Math.min(18, Math.round(this.reading.speedMph + (Math.random() * 2 - 1))));
      this.reading = { directionDeg, speedMph, updatedAt: Date.now() };
      this.readingEmitter.emit(this.reading);
    }, DRIFT_INTERVAL_MS);
  }

  private stop() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const regionalWindEstimator = new RegionalWindEstimator();
