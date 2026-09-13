import { Armchair, Bird, Dog, Feather, House, PawPrint, WavesLadder } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { GAME_SPECIES, STAND_TYPES } from '../types';
import type { GameSpecies, StandType } from '../types';

export type PinCategory = { kind: 'stand'; standType: StandType } | { kind: 'sighting'; species: GameSpecies };

export interface PinCategoryStyle {
  icon: LucideIcon;
  color: string;
  label: string;
}

// Lucide doesn't have species-specific glyphs for most of these (there's one generic
// "bird" icon, not separate turkey/duck/goose ones) — distinctiveness for those three
// comes from color, same as onX's approach when an exact icon doesn't exist.
export const STAND_TYPE_STYLE: Record<StandType, PinCategoryStyle> = {
  'Open Stand': { icon: Armchair, color: '#d1832f', label: 'Open Stand' },
  'Ladder Stand': { icon: WavesLadder, color: '#a0693d', label: 'Ladder Stand' },
  'Box/House Blind': { icon: House, color: '#7d6b9e', label: 'Box/House Blind' },
};

export const GAME_SPECIES_STYLE: Record<GameSpecies, PinCategoryStyle> = {
  Deer: { icon: PawPrint, color: '#c49a6c', label: 'Deer' },
  Turkey: { icon: Bird, color: '#8b4a3f', label: 'Turkey' },
  Duck: { icon: Bird, color: '#4a7a8c', label: 'Duck' },
  Goose: { icon: Bird, color: '#6c7a89', label: 'Goose' },
  Coyote: { icon: Dog, color: '#5c5c52', label: 'Coyote' },
  Dove: { icon: Feather, color: '#9b8fa8', label: 'Dove' },
};

export function standTypeStyle(standType: StandType | null): PinCategoryStyle {
  return STAND_TYPE_STYLE[standType ?? 'Open Stand'];
}

export const STAND_TYPE_CATEGORIES: PinCategory[] = STAND_TYPES.map((standType) => ({ kind: 'stand', standType }));
export const GAME_SIGHTING_CATEGORIES: PinCategory[] = GAME_SPECIES.map((species) => ({ kind: 'sighting', species }));
