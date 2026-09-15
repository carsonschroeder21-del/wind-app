import type { ImageRequireSource } from 'react-native';

import type { GameSpecies, StandType } from '../types';

// Static bundled badge images for map markers — react-native-maps' Marker `icon` prop
// draws these as native bitmaps directly, sidestepping the Fabric bug where a Marker's
// custom View `children` silently fail to render on both Android and iOS (see
// AllStandsMap.tsx for the full explanation). Each is a pre-rendered circular badge
// matching the color + glyph a hunter would see in the pin-category picker; unlike a
// Lucide icon inside a View, these can't be recolored or resized at runtime, so a
// separate "active" (amber-bordered) image exists per stand type instead.
const STAND_TYPE_ICON: Record<StandType, ImageRequireSource> = {
  'Open Stand': require('../../assets/pins/pin_open_stand.png'),
  'Ladder Stand': require('../../assets/pins/pin_ladder_stand.png'),
  'Box/House Blind': require('../../assets/pins/pin_box_blind.png'),
};

const STAND_TYPE_ICON_ACTIVE: Record<StandType, ImageRequireSource> = {
  'Open Stand': require('../../assets/pins/pin_open_stand_active.png'),
  'Ladder Stand': require('../../assets/pins/pin_ladder_stand_active.png'),
  'Box/House Blind': require('../../assets/pins/pin_box_blind_active.png'),
};

const GAME_SPECIES_ICON: Record<GameSpecies, ImageRequireSource> = {
  Deer: require('../../assets/pins/pin_deer.png'),
  Turkey: require('../../assets/pins/pin_turkey.png'),
  Duck: require('../../assets/pins/pin_duck.png'),
  Goose: require('../../assets/pins/pin_goose.png'),
  Coyote: require('../../assets/pins/pin_coyote.png'),
  Dove: require('../../assets/pins/pin_dove.png'),
};

export function standPinIcon(standType: StandType | null, active: boolean): ImageRequireSource {
  const type = standType ?? 'Open Stand';
  return active ? STAND_TYPE_ICON_ACTIVE[type] : STAND_TYPE_ICON[type];
}

export function sightingPinIcon(species: GameSpecies): ImageRequireSource {
  return GAME_SPECIES_ICON[species];
}
