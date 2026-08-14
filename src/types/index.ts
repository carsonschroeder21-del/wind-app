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

/** How the elevation where the hunter expects game relates to the stand's own elevation.
 * Captured as a relative call rather than a second GPS lookup, since a hunter usually
 * knows this intuitively (e.g. "I'm on a ridge over a creek bottom") even for ground
 * they haven't pinned. */
export const GAME_AREA_RELATIVE_ELEVATIONS = ['above', 'level', 'below'] as const;
export type GameAreaRelativeElevation = (typeof GAME_AREA_RELATIVE_ELEVATIONS)[number];

export interface Stand {
  id: string;
  name: string;
  terrain: Terrain;
  isEdge: boolean;
  /** Direction the hunter expects game to come from, in degrees. */
  facingDeg: number;
  latitude: number | null;
  longitude: number | null;
  elevationFt: number | null;
  gameAreaRelativeElevation: GameAreaRelativeElevation;
  createdAt: number;
  updatedAt: number;
}

export type ThermalDirection = 'rising' | 'sinking' | 'transitioning';
export type ThermalObservation = 'rising' | 'sinking' | 'unsure';

export interface ThermalLogEntry {
  id: string;
  timestamp: number;
  standId: string;
  standName: string;
  terrain: Terrain;
  predicted: ThermalDirection;
  observed: ThermalObservation;
  windDirectionDeg: number;
  windSpeedMph: number;
}

/** A recorded wind reading, tagged with which source produced it at the time — the
 * historical half of the stand detail time slider can only trust a reading as "sensor
 * data" if it was actually logged while the WeatherFlow was connected. */
export interface WindHistoryEntry extends WindReading {
  source: WindSource;
}

/** A single hourly wind point from the weather API's forecast (which also serves recent
 * past hours via `past_days`), used for the historical-estimate and forecast portions of
 * the time slider. */
export interface WeatherPoint {
  timestampMs: number;
  directionDeg: number;
  speedMph: number;
}

/** What's actually feeding the conditions shown at the time slider's current position. */
export type ConditionsSource =
  | 'live'
  | 'regional'
  | 'historical-sensor'
  | 'historical-estimate'
  | 'forecast'
  | 'no-data';

export interface ResolvedConditions {
  source: ConditionsSource;
  wind: WindReading | null;
  label: string;
}
