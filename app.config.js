// Dynamic config (instead of static app.json) so we can inject the Google Maps API key
// from an environment variable at build time — see README.md for how to set it locally
// (.env, gitignored) or for EAS builds (`eas secret:create`). The key itself must never
// be committed to source control.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

if (!googleMapsApiKey) {
  console.warn(
    '[app.config] GOOGLE_MAPS_API_KEY is not set — the Stand screen map will fail to load tiles. ' +
      'See README.md "Google Maps setup" for how to configure it.',
  );
}

module.exports = {
  expo: {
    name: 'Wind Scout',
    slug: 'wind-scout',
    scheme: 'windscout',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#14170f',
    ios: {
      bundleIdentifier: 'com.windscout.app',
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ['bluetooth-central'],
      },
    },
    android: {
      package: 'com.windscout.app',
      adaptiveIcon: {
        backgroundColor: '#14170f',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-dev-client',
      './plugins/withBluetoothPermissions',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Wind Scout uses your location to tag saved stands and look up their elevation.',
        },
      ],
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: googleMapsApiKey,
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
    owner: 'carson6647',
    extra: {
      eas: {
        projectId: '227dcdfe-1221-4c34-b773-507d58a4ee9f',
      },
    },
  },
};
