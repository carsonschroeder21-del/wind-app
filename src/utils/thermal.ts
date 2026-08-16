import type { GameAreaRelativeElevation, ThermalConfidence, ThermalDirection, ThermalObservation } from '../types';
import type { TemperatureTrend } from './temperature';

/** Morning: thermals rise (uphill). Evening: thermals sink (downhill). Everything else is
 * a transition window with no obvious direction from time-of-day alone. */
export function getThermalDirection(hour: number): ThermalDirection {
  const isMorning = hour >= 5 && hour < 11;
  const isEvening = hour >= 16 && hour < 21;
  if (isMorning) return 'rising';
  if (isEvening) return 'sinking';
  return 'transitioning';
}

/** Time-of-day-only fallback for a transition window, used when there's no temperature
 * trend to break the tie. Temps generally keep climbing through early-mid afternoon
 * before falling toward evening, so 11am-3:59pm leans toward the day's still-warming
 * arc (rising); the rest of the transition window (overnight into pre-dawn, and the tail
 * end after evening) leans toward the day's cooling arc (sinking). */
function fallbackTransitionDirection(hour: number): 'rising' | 'sinking' {
  return hour >= 11 && hour < 16 ? 'rising' : 'sinking';
}

export interface ResolvedThermalDirection {
  direction: 'rising' | 'sinking';
  confidence: ThermalConfidence;
}

/** Always resolves to an actual direction — never "transitioning"/unknown. A clear
 * morning or evening window is High confidence. In a transition window, a real
 * temperature trend (rising temp → thermals leaning rising, falling temp → leaning
 * sinking) breaks the tie at Medium confidence; with no trend data (or a flat trend),
 * it falls back to the time-of-day guess at Low confidence. */
export function resolveThermalDirection(hour: number, temperatureTrend: TemperatureTrend | null): ResolvedThermalDirection {
  const period = getThermalDirection(hour);
  if (period !== 'transitioning') {
    return { direction: period, confidence: 'high' };
  }

  if (temperatureTrend === 'rising') return { direction: 'rising', confidence: 'medium' };
  if (temperatureTrend === 'falling') return { direction: 'sinking', confidence: 'medium' };
  return { direction: fallbackTransitionDirection(hour), confidence: 'low' };
}

export interface ThermalAssessment {
  direction: 'rising' | 'sinking';
  confidence: ThermalConfidence;
  /** true = favorable (scent carries away from game), false = unfavorable, null = the
   * game area is roughly level with the stand, so thermal drift doesn't have a clear
   * direction to help or hurt with either way. */
  favorable: boolean | null;
  label: string;
  detail: string;
}

export function assessThermal(
  hour: number,
  relativeElevation: GameAreaRelativeElevation,
  temperatureTrend: TemperatureTrend | null,
): ThermalAssessment {
  const { direction, confidence } = resolveThermalDirection(hour, temperatureTrend);

  if (direction === 'rising') {
    if (relativeElevation === 'above') {
      return {
        direction,
        confidence,
        favorable: false,
        label: 'Rising (uphill)',
        detail: 'Game area is uphill — thermals likely carry your scent to them',
      };
    }
    if (relativeElevation === 'below') {
      return {
        direction,
        confidence,
        favorable: true,
        label: 'Rising (uphill)',
        detail: 'Game area is downhill — thermals likely carry scent away from them',
      };
    }
    return { direction, confidence, favorable: null, label: 'Rising (uphill)', detail: 'Flat terrain between you and game area' };
  }

  // sinking
  if (relativeElevation === 'below') {
    return {
      direction,
      confidence,
      favorable: false,
      label: 'Sinking (downhill)',
      detail: 'Game area is downhill — thermals likely carry your scent to them',
    };
  }
  if (relativeElevation === 'above') {
    return {
      direction,
      confidence,
      favorable: true,
      label: 'Sinking (downhill)',
      detail: 'Game area is uphill — thermals likely carry scent away from them',
    };
  }
  return { direction, confidence, favorable: null, label: 'Sinking (downhill)', detail: 'Flat terrain between you and game area' };
}

export type ThermalComparison = 'match' | 'mismatch' | 'neutral';

/** Compares a predicted thermal direction against what the hunter actually observed in
 * the field. `predicted === 'transitioning'` only occurs on log entries from before
 * predictions always resolved to rising/sinking — kept here so those old entries still
 * compare sensibly instead of reading as a mismatch. Observations of "unsure" carry no
 * strong signal either way, so they're neutral rather than a mismatch too. */
export function compareThermalObservation(
  predicted: ThermalDirection,
  observed: ThermalObservation,
): ThermalComparison {
  if (observed === 'unsure' || predicted === 'transitioning') return 'neutral';
  return predicted === observed ? 'match' : 'mismatch';
}
