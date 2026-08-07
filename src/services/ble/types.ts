import type { BraceletStatus, WindReading, WindSensorStatus } from '../../types';

export interface BraceletService {
  getStatus(): BraceletStatus;
  /** Fires immediately with the current status, then on every change. Returns an unsubscribe fn. */
  subscribe(listener: (status: BraceletStatus) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Sends a buzz command to the wristband. No-ops if not connected. */
  vibrate(pattern?: 'alert' | 'short'): Promise<void>;
}

export interface WindSensorService {
  getStatus(): WindSensorStatus;
  subscribe(listener: (status: WindSensorStatus) => void): () => void;
  /** Live wind readings, only emitted while connected. Returns an unsubscribe fn. */
  onReading(listener: (reading: WindReading) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
