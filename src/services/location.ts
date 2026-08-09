import * as Location from 'expo-location';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
}

export type LocationResult =
  | { ok: true; location: DeviceLocation }
  | { ok: false; reason: 'permission-denied' | 'unavailable' };

/** Grabs the device's current GPS position, for tagging a stand while standing at it. */
export async function getCurrentLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, reason: 'permission-denied' };
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      ok: true,
      location: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    };
  } catch (err) {
    console.warn('[location] getCurrentLocation failed:', err);
    return { ok: false, reason: 'unavailable' };
  }
}
