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
    StandEditor.tsx          Name, terrain/edge, facing slider, GPS capture + elevation
                             lookup, game-area relative elevation
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
    haptics.ts                On-phone buzz via expo-haptics, alongside the bracelet's
                               own vibrate command
  utils/
    thermal.ts                 Shared rising/sinking/transitioning + favorability logic,
                               used by the indicator, the recommendation engine, and
                               thermal logging
    recommendation.ts          Scores each saved stand against current wind + thermal
                               conditions
  hooks/
    useDeviceSync.ts           Subscribes device services into the store (mounted once,
                               at the root)
    useBadWindAlerts.ts        Buzzes the bracelet + phone when wind turns unfavorable,
                               respecting the Alerts screen's buzz/sensitivity/quiet-hours
plugins/withBluetoothPermissions.js  Expo config plugin adding the iOS Info.plist keys and
                                      Android manifest permissions BLE scanning needs
```

### Stand data model notes

Each saved stand carries a `gameAreaRelativeElevation: 'above' | 'level' | 'below'`
instead of a second GPS elevation lookup for ground the hunter hasn't scouted — it's a
call most hunters can make intuitively ("I'm on a ridge over a creek bottom" = below),
and it's what the thermal favorability logic and the recommendation engine key off of.
The stand's own elevation (from Open-Meteo) is captured separately and shown for
reference. Location is captured via "Use Current Location" (device GPS) at save time
rather than an interactive map picker.

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
