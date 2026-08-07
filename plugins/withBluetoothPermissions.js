const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins');

const BLUETOOTH_ALWAYS_USAGE =
  'Wind Scout uses Bluetooth to connect to your wristband and optional WeatherFlow WINDmeter sensor.';
const BLUETOOTH_PERIPHERAL_USAGE =
  'Wind Scout uses Bluetooth to connect to your wristband and optional WeatherFlow WINDmeter sensor.';

/**
 * Adds the native Bluetooth LE permissions Wind Scout needs for the bracelet/WINDmeter
 * integration (react-native-ble-plx), for both iOS (Info.plist) and Android (manifest).
 * Written by hand instead of pulling in @config-plugins/react-native-ble-plx so we're not
 * pinned to that package's `expo: ^49` peer range while still targeting current Expo SDKs.
 */
function withBluetoothPermissions(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.NSBluetoothAlwaysUsageDescription = BLUETOOTH_ALWAYS_USAGE;
    config.modResults.NSBluetoothPeripheralUsageDescription = BLUETOOTH_PERIPHERAL_USAGE;
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;

    manifest['uses-feature'] = manifest['uses-feature'] || [];
    manifest['uses-feature'].push({
      $: { 'android:name': 'android.hardware.bluetooth_le', 'android:required': 'true' },
    });

    const permissions = [
      // Android 12+ (API 31+) runtime BLE permissions.
      { name: 'android.permission.BLUETOOTH_SCAN', neverForLocation: true },
      { name: 'android.permission.BLUETOOTH_CONNECT' },
      { name: 'android.permission.BLUETOOTH_ADVERTISE' },
      // Pre-12 fallback: BLE scanning required location permission.
      { name: 'android.permission.ACCESS_FINE_LOCATION', maxSdkVersion: 30 },
      { name: 'android.permission.BLUETOOTH', maxSdkVersion: 30 },
      { name: 'android.permission.BLUETOOTH_ADMIN', maxSdkVersion: 30 },
    ];

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const permission of permissions) {
      const attrs = { 'android:name': permission.name };
      if (permission.maxSdkVersion) attrs['android:maxSdkVersion'] = String(permission.maxSdkVersion);
      if (permission.neverForLocation) attrs['android:usesPermissionFlags'] = 'neverForLocation';

      const alreadyPresent = manifest['uses-permission'].some((p) => p.$['android:name'] === permission.name);
      if (!alreadyPresent) {
        manifest['uses-permission'].push({ $: attrs });
      }
    }

    return config;
  });

  return config;
}

module.exports = withBluetoothPermissions;
