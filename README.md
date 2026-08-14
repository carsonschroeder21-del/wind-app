# Wind Scout

A React Native (Expo) hunting app: a live wind compass with a wind cone + expected-game
direction line, thermal-drift guidance, named/saveable stands with GPS + elevation and a
recommendation engine that ranks them by current conditions, alert settings, a Bluetooth
Device screen for a wristband + optional WeatherFlow WINDmeter, a Hunt Log, and a
predicted-vs-observed thermal log. Ported from a web prototype, same visual style and
logic, with the state/persistence and device layers a real app needs.

## Stack

- Expo SDK 57 (React Native 0.86, React 19, TypeScript)
- `zustand` + `@react-native-async-storage/async-storage` for state/persistence
- `react-native-svg` for the compass dial (wind cone + dashed game-direction line)
- `react-native-ble-plx` for the real bracelet BLE connection (dev-client/EAS build only)
- `react-native-maps` for the interactive Google Map on the Stand screen (dev-client/EAS
  build only — see "Google Maps setup" below)
- `expo-location` for GPS capture + Open-Meteo's free Elevation API for stand elevation
- `lucide-react-native` for icons, matching the prototype's icon set

## Running it

```bash
npm install
npm run start        # Expo Go — everything works, bracelet/WINDmeter are simulated
```

Scan the QR code with Expo Go (iOS/Android) or press `i` / `a` for a simulator.

### Real Bluetooth (dev client build)

`react-native-ble-plx` needs a native module that Expo Go doesn't have. To test against a
real bracelet:

```bash
npx expo prebuild            # generates ios/ and android/
npx expo run:ios             # or: npx expo run:android
npm run dev-client            # subsequent starts, once the dev client is installed
```

Outside of a dev-client/EAS build, the app automatically falls back to the simulated
bracelet/sensor — this is detected at runtime in `src/services/ble/factory.ts` via
`expo-constants`'s `executionEnvironment`, so no manual toggling is needed.

### Google Maps setup

The Stand screen's interactive map (`src/services/maps/loadMaps.ts`) needs the same kind
of dev-client build as the bracelet — Expo Go and the web preview both show a "requires a
development build" fallback instead of crashing (same detection approach as BLE).

**1. Get an API key configured in Google Cloud Console:**

- Create/select a project, enable **Maps SDK for Android** and **Maps SDK for iOS**
  (Elevation lookups use Open-Meteo's free API, not Google's — you don't need that one).
- Google requires a billing account attached to the project even to stay within the free
  tier — this will not be fine until that's set up.
- **Restrict the key** (APIs & Services → Credentials → your key → Application
  restrictions): add an Android restriction for package name `com.windscout.app` + your
  build's SHA-1 fingerprint (`eas credentials` for an EAS-managed keystore, or
  `keytool -keystore ~/.android/debug.keystore -list -v` for a local debug build — default
  password `android`), and an iOS restriction for bundle ID `com.windscout.app`. Under API
  restrictions, limit the key to just the two Maps SDKs above. This is the real security
  boundary for a Maps key (they're meant to ship inside the compiled app, unlike a backend
  secret) — do this before shipping anywhere.

**2. Give the app the key — never commit it:**

```bash
cp .env.example .env
# edit .env, set GOOGLE_MAPS_API_KEY=<your key>
```

`app.config.js` reads `process.env.GOOGLE_MAPS_API_KEY` and wires it into both platforms
via the `react-native-maps` config plugin (writes `GMSApiKey` into iOS's Info.plist and a
`com.google.android.geo.API_KEY` meta-data entry into AndroidManifest.xml — nothing to
edit by hand). `.env` is gitignored; `.env.example` is the committed placeholder.

For EAS cloud builds, set the same variable as a secret instead of relying on a local
`.env` (which never leaves your machine):

```bash
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <your key> --type string
```

**3. Rebuild the native project** any time you change the key or plugin config —
`expo prebuild` doesn't re-run automatically:

```bash
npx expo prebuild --clean
npx expo run:ios      # or: npx expo run:android
```

## Architecture

```
App.tsx                     Root shell: TopBar + tab switch + BottomTabBar, wires up
                             the device-sync and bad-wind-alert hooks.
src/
  screens/                  HomeScreen, StandScreen (list + editor), AlertsScreen,
                             DeviceScreen, LogScreen (Hunts / Thermal Log toggle)
  components/
    CompassDial.tsx          Wind cone (wedge, narrow at center → wide in the travel
                             direction) + dashed line for the active stand's facing
    ThermalIndicator.tsx     Rising/sinking/unstable, driven by src/utils/thermal.ts
    StandEditor.tsx          Name, terrain/edge, facing slider (fallback), interactive
                             map (or GPS button) + elevation lookup, game-area pin,
                             game-area relative elevation
    StandMapPicker.tsx       Single-pin Google Map for the editor — tap/drag to set a
                             stand's coordinates
    AllStandsMap.tsx         Every saved stand as a pin, tap one to open its editor
    StandRecommendation.tsx  Ranked stand list (src/utils/recommendation.ts) with
                             one-tap "switch active stand"
    ThermalLogModal.tsx      Rising/sinking/unsure prompt for predicted-vs-observed
                             logging
    TopBar, BottomTabBar, ToggleRow/ToggleSwitch, StatusBadge
  state/store.ts             zustand store — wind reading, stands[] + activeStandId,
                             alert settings, device status, hunt log, thermal logs.
                             Everything but live wind/device state persists to
                             AsyncStorage.
  services/
    ble/
      types.ts               BraceletService / WindSensorService interfaces
      MockBraceletService.ts  Simulated bracelet (Expo Go + fallback)
      MockWindSensorService.ts Simulated WINDmeter feed
      BlePlxBraceletService.ts Real BLE implementation (react-native-ble-plx)
      factory.ts              Picks real vs. mock at runtime
      constants.ts             Device names + GATT UUIDs (placeholders — see below)
    wind/RegionalWindEstimator.ts  Synthetic regional wind estimate (stand-in for a real
                                    weather API call keyed on GPS position)
    location.ts               GPS capture via expo-location
    elevation.ts               Open-Meteo Elevation API lookup
    maps/
      availability.ts          Same Expo-Go/web detection pattern as the BLE factory
      loadMaps.ts               Guarded lazy require() of react-native-maps
    haptics.ts                On-phone buzz via expo-haptics, alongside the bracelet's
                               own vibrate command
  utils/
    thermal.ts                 Shared rising/sinking/transitioning + favorability logic,
                               used by the indicator, the recommendation engine, and
                               thermal logging
    gameArea.ts                 Resolves the bearing/point to treat as "the game area" —
                               the real dropped pin when set, else the stand's facing
                               angle. Everything that used to read `stand.facingDeg`
                               directly (bad wind alerts, the compass dial, stand
                               recommendations, entry-route risk) goes through this now
    recommendation.ts          Scores each saved stand against current wind + thermal
                               conditions
  hooks/
    useDeviceSync.ts           Subscribes device services into the store (mounted once,
                               at the root)
    useBadWindAlerts.ts        Buzzes the bracelet + phone when wind turns unfavorable,
                               respecting the Alerts screen's buzz/sensitivity/quiet-hours
plugins/withBluetoothPermissions.js  Expo config plugin adding the iOS Info.plist keys and
                                      Android manifest permissions BLE scanning needs
app.config.js                Dynamic config (replaces app.json) — injects the Google Maps
                              API key from process.env at build time
```

### Stand data model notes

Each saved stand carries a `gameAreaRelativeElevation: 'above' | 'level' | 'below'`
instead of a second GPS elevation lookup for ground the hunter hasn't scouted — it's a
call most hunters can make intuitively ("I'm on a ridge over a creek bottom" = below),
and it's what the thermal favorability logic and the recommendation engine key off of.
The stand's own elevation (from Open-Meteo) is captured separately and shown for
reference, refreshed automatically any time the pin moves — by tap, drag, or the "Use
Current Location" GPS button.

Where the hunter expects game can be a real dropped pin (`gameAreaLatitude` /
`gameAreaLongitude`) or, for stands with no pin yet — including every stand saved before
this field existed — a facing angle (`facingDeg`) treated as a bearing from the stand.
`src/utils/gameArea.ts` is the single place that resolves which one applies; every
feature that reasons about "which way is the game" (bad wind alerts, the compass dial,
stand recommendations, entry-route risk) goes through it rather than reading either field
directly.

## Connecting a real bracelet later

`src/services/ble/BlePlxBraceletService.ts` is a working skeleton: it scans for a device
named `"Wind Scout Bracelet"`, connects, reads battery over the standard BLE Battery
Service, and writes a vibrate command to a placeholder custom characteristic. Once real
firmware exists:

1. Update `BRACELET_SERVICE_UUID` / `BRACELET_VIBRATE_CHAR_UUID` in
   `src/services/ble/constants.ts` to match the real GATT profile.
2. If battery isn't exposed via the standard Battery Service (`0x180F`/`0x2A19`), point
   `readBatteryLevel` at the real characteristic.
3. Everything else — the store, the alert logic, the Device screen — needs no changes,
   since they only talk to the `BraceletService` interface.

Note: the real WeatherFlow WINDmeter/Tempest hardware reports over UDP broadcast on the
local Wi-Fi network, not BLE (BLE is only used for provisioning) — a real integration
should implement `WindSensorService` against that UDP API rather than
`react-native-ble-plx`; `getWindSensorService()` in `factory.ts` is the single place to
swap it in.
