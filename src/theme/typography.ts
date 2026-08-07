import { Platform } from 'react-native';

// The web prototype used 'Courier New'. iOS ships 'Courier' as a true
// monospace face; Android's generic 'monospace' is the closest match there.
export const mono = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});
