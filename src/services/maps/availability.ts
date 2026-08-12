import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** react-native-maps needs a native module that's only present in a dev-client/EAS
 * build — never in Expo Go, and there's no real map on web (its own web entry is just
 * react-native-web's UnimplementedView). Same detection approach as the BLE factory. */
export function isNativeMapsAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}
