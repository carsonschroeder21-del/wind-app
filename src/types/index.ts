export type TabId = 'map' | 'home' | 'stand' | 'alerts' | 'device' | 'log';

export const TERRAIN_TYPES = ['Timber', 'Field', 'Water', 'Ridge', 'Creek Bottom'] as const;
export type Terrain = (typeof TERRAIN_TYPES)[number];

export type WindSource = 'live' | 'regional';

export type AlertSensitivity = 0 | 1 | 2;

export const SIGHTING_OUTCOMES = ['none', 'saw-game', 'harvest'] as const;
export type SightingOutcome = (typeof SIGHTING_OUTCOMES)[number];

export interface HuntLogEntry {
  id: string;
  timestamp: number;
  /** Null for hunts logged before per-stand tracking existed, or against a stand that's
   * since been deleted — the cooldown tracker and recommendation engine simply skip
   * these when counting hunts against a specific stand. */
  standId: string | null;
  /** Snapshot of the stand's name at log time (same denormalization ThermalLogEntry
   * already uses), so the entry still reads sensibly if the stand is later renamed or
   * deleted. Empty string when `standId` is null. */
  standName: string;
  windLabel: string;
  terrain: Terrain;
  isEdge: boolean;
  sighting: SightingOutcome;
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

export type StandMediaType = 'photo360' | 'video360';

export interface StandMedia {
  type: StandMediaType;
  /** Local file:// URI of the persisted copy (copied out of the picker's cache location
   * so it survives independently of the OS's temp-file cleanup). */
  uri: string;
  /** Yaw offset (degrees) that aligns the panorama's own coordinate space with true
   * north, set via the in-viewer calibration step. Null until calibrated — photo360
   * media can't be shown with direction markers until then. Not applicable to video360
   * (rendered as a flat preview, not panoramically, so there's nothing to calibrate). */
  northOffsetDeg: number | null;
  createdAt: number;
}

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
  media: StandMedia | null;
  /** Real pin marking where the hunter expects game, dropped on the map for precise
   * distance/bearing calculations. Null until dropped — stands fall back to `facingDeg`
   * as a rough bearing until then, including stands saved before this field existed. */
  gameAreaLatitude: number | null;
  gameAreaLongitude: number | null;
  /** Where the hunter parks / starts their walk-in, for the entry-route risk feature.
   * Null until set — most hunts don't need this, so it's opt-in rather than required. */
  parkingLatitude: number | null;
  parkingLongitude: number | null;
  createdAt: number;
  updatedAt: number;
}

export type EntryRiskLevel = 'low' | 'moderate' | 'high';

export interface EntryRouteAssessment {
  level: EntryRiskLevel;
  /** Fraction (0-1) of the walk-in that's exposed to scent carrying toward the game area. */
  exposedFraction: number;
  exposedFeet: number;
  totalFeet: number;
  label: string;
}

export interface StandCooldownStatus {
  /** True once `huntsInWindow` reaches `threshold` — overhunting a spot pressures deer
   * into avoiding it, so a flagged stand should rest before it's hunted again. */
  flagged: boolean;
  huntsInWindow: number;
  windowDays: number;
  threshold: number;
}

export type ThermalDirection = 'rising' | 'sinking' | 'transitioning';
export type ThermalObservation = 'rising' | 'sinking' | 'unsure';

/** How clear-cut a thermal prediction is: High for a clear morning/evening window, Medium
 * when a real temperature trend broke a midday/transition tie, Low when the tie had to
 * fall back to a time-of-day guess with no temperature signal to go on. */
export type ThermalConfidence = 'high' | 'medium' | 'low';

export interface ThermalLogEntry {
  id: string;
  timestamp: number;
  standId: string;
  standName: string;
  terrain: Terrain;
  /** The stand's game-area relative elevation at the moment of prediction — one of the
   * two inputs (alongside temperatureTrend) that decided `predicted`/`confidence`.
   * Snapshotted rather than looked up later, since a stand's saved value can change
   * after the fact and would otherwise silently rewrite what this entry meant. */
  relativeElevation: GameAreaRelativeElevation;
  /** The temperature trend `resolveThermalDirection()` had to work with — null means no
   * trend data was available at prediction time (so the prediction fell back to a
   * time-of-day-only guess), not that the trend was flat; a real "flat" reads as `'flat'`. */
  temperatureTrend: TemperatureTrend | null;
  predicted: ThermalDirection;
  /** Confidence the prediction had at the moment it was logged — preserved so a future
   * model-evaluation pass can see which conditions the rule-based predictor was least
   * sure about, not just where it was outright wrong. */
  confidence: ThermalConfidence;
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

/** A single hourly weather point from the weather API's forecast (which also serves
 * recent past hours via `past_days`), used for the historical-estimate and forecast
 * portions of the time slider, and for the barometric pressure trend tracker. */
export interface WeatherPoint {
  timestampMs: number;
  directionDeg: number;
  speedMph: number;
  pressureHpa: number;
  temperatureF: number;
}

export type PressureTrend = 'rising' | 'falling' | 'steady';

/** Rising/falling/flat trend used as the thermal-prediction tiebreaker during
 * midday/transition windows — see src/utils/temperature.ts. */
export type TemperatureTrend = 'rising' | 'falling' | 'flat';

export interface PressureAssessment {
  trend: PressureTrend;
  currentHpa: number;
  /** Change over the lookback window, current minus past — negative means falling. */
  changeHpa: number;
  label: string;
  detail: string;
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
