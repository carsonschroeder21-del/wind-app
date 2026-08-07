export type TabId = 'home' | 'stand' | 'alerts' | 'device' | 'log';

export const TERRAIN_TYPES = ['Timber', 'Field', 'Water', 'Ridge', 'Creek Bottom'] as const;
export type Terrain = (typeof TERRAIN_TYPES)[number];

export type WindSource = 'live' | 'regional';

export type AlertSensitivity = 0 | 1 | 2;

export interface HuntLogEntry {
  id: string;
  date: string;
  time: string;
  windLabel: string;
  terrain: Terrain;
  isEdge: boolean;
  note: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface BraceletStatus {
  state: ConnectionState;
  deviceName: string | null;
  batteryPct: number | null;
  signal: 'Strong' | 'Weak' | null;
}

export interface WindSensorStatus {
  state: ConnectionState;
  deviceName: string | null;
}

export interface WindReading {
  directionDeg: number;
  speedMph: number;
  updatedAt: number;
}
