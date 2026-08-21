import type RNMapView from 'react-native-maps';
import type { Marker as RNMarker, Polygon as RNPolygon } from 'react-native-maps';

import { isNativeMapsAvailable } from './availability';

export interface MapsModule {
  MapView: typeof RNMapView;
  Marker: typeof RNMarker;
  Polygon: typeof RNPolygon;
  PROVIDER_GOOGLE: 'google';
}

let cached: MapsModule | null | undefined;

/** Lazily requires react-native-maps only where it can actually work — guarded exactly
 * like the BLE service factory, so Expo Go / web never attempt to touch the native
 * module and instead get a null they can render a fallback for. */
export function loadMaps(): MapsModule | null {
  if (cached !== undefined) return cached;

  if (!isNativeMapsAvailable()) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-maps');
    cached = {
      MapView: mod.default,
      Marker: mod.Marker,
      Polygon: mod.Polygon,
      PROVIDER_GOOGLE: mod.PROVIDER_GOOGLE,
    };
  } catch (err) {
    console.warn('[maps] react-native-maps unavailable:', err);
    cached = null;
  }

  return cached;
}
