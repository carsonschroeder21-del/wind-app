import type { GameAreaRelativeElevation, ThermalDirection, ThermalObservation } from '../types';

/** Morning: thermals rise (uphill). Evening: thermals sink (downhill). Midday: unstable. */
export function getThermalDirection(hour: number): ThermalDirection {
  const isMorning = hour >= 5 && hour < 11;
  const isEvening = hour >= 16 && hour < 21;
  if (isMorning) return 'rising';
  if (isEvening) return 'sinking';
  return 'transitioning';
}

export interface ThermalAssessment {
  direction: ThermalDirection;
  /** true = favorable (scent carries away from game), false = unfavorable, null = no
   * strong signal (midday, or the game area is roughly level with the stand). */
  favorable: boolean | null;
  label: string;
  detail: string;
}

export function assessThermal(hour: number, relativeElevation: GameAreaRelativeElevation): ThermalAssessment {
  const direction = getThermalDirection(hour);

  if (direction === 'transitioning') {
    return {
      direction,
      favorable: null,
      label: 'Midday — thermals unstable',
      detail: 'Switching direction, hardest time to predict',
    };
  }

  if (direction === 'rising') {
    if (relativeElevation === 'above') {
      return {
        direction,
        favorable: false,
        label: 'Rising (uphill)',
        detail: 'Game area is uphill — thermals likely carry your scent to them',
      };
    }
    if (relativeElevation === 'below') {
      return {
        direction,
        favorable: true,
        label: 'Rising (uphill)',
        detail: 'Game area is downhill — thermals likely carry scent away from them',
      };
    }
    return { direction, favorable: null, label: 'Rising (uphill)', detail: 'Flat terrain between you and game area' };
  }

  // sinking
  if (relativeElevation === 'below') {
    return {
      direction,
      favorable: false,
      label: 'Sinking (downhill)',
      detail: 'Game area is downhill — thermals likely carry your scent to them',
    };
  }
  if (relativeElevation === 'above') {
    return {
      direction,
      favorable: true,
      label: 'Sinking (downhill)',
      detail: 'Game area is uphill — thermals likely carry scent away from them',
    };
  }
  return { direction, favorable: null, label: 'Sinking (downhill)', detail: 'Flat terrain between you and game area' };
}

export type ThermalComparison = 'match' | 'mismatch' | 'neutral';

/** Compares a predicted thermal direction against what the hunter actually observed in
 * the field. Predictions of "transitioning" (midday) and observations of "unsure" carry
 * no strong signal either way, so they're neutral rather than a mismatch. */
export function compareThermalObservation(
  predicted: ThermalDirection,
  observed: ThermalObservation,
): ThermalComparison {
  if (observed === 'unsure' || predicted === 'transitioning') return 'neutral';
  return predicted === observed ? 'match' : 'mismatch';
}
