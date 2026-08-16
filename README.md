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
- `react-native-maps` for the interactive Google Map on the Stand screen and — reusing
  the same map component — as a background layer on the Home screen (dev-client/EAS
  build only — see "Google Maps setup" below)
- `react-native-gesture-handler` + `react-native-reanimated` (+ its `react-native-worklets`
  peer) for the Home screen's map expand/collapse animation and swipe-down-to-collapse
  gesture — see "Home screen map layer" below
- `expo-location` for GPS capture + Open-Meteo's free Elevation API for stand elevation
- `lucide-react-native` for icons, matching the prototype's icon set
- `@supabase/supabase-js` for cloud sync (hunt log / thermal log backup + the opt-in
  anonymized training dataset) — degrades to local-only when unconfigured, see "Cloud
  sync setup" below

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

### Cloud sync setup

`src/services/supabase/client.ts` needs a Supabase project — Expo Go and web both run
fine without one (cloud sync just silently stays off, same pattern as the Maps/BLE
fallbacks), but nothing syncs anywhere until it's configured.

**1. Create the project and run the schema.**

- Create a free project at [supabase.com](https://supabase.com).
- Project Settings → API: copy the **Project URL** and the **anon / public key** (not the
  service-role key — that one must never end up in the client).
- Database → SQL Editor → New query: paste in the contents of `supabase/schema.sql` from
  this repo and run it. That creates `hunt_log_entries`, `thermal_log_entries`, and
  `thermal_training_contributions` with row-level security already wired up — see the
  comments at the top of that file for exactly what each table's access boundary is.
- Authentication → Providers: **Email** is on by default, which is all this app uses (no
  password — see "Cloud sync notes" below). Nothing else to configure there.

**2. Give the app the URL/key — never commit them:**

```bash
cp .env.example .env
# edit .env, set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Unlike `GOOGLE_MAPS_API_KEY` (which has to be baked into native config via a plugin),
these are read directly from `process.env` at runtime — Expo's Metro bundler inlines any
`EXPO_PUBLIC_`-prefixed variable automatically, no `app.config.js` wiring needed, and no
rebuild required after changing them (a dev-server restart is enough).

For EAS cloud builds, set both as secrets instead of relying on a local `.env`:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <your url> --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <your anon key> --type string
```

### Home screen map layer

The Home screen shows the map as a background layer behind the compass dial (tightly
zoomed on the active stand, dial/banner over a dark scrim) — tap it to expand into the
same all-stands view `AllStandsMapView` shows on the Stand tab's Map segment, animating
the card's size and the map's own region together; collapse back via the header's button
or an interactive swipe-down on its grabber handle (`HomeMapReveal.tsx`).

This inherits `react-native-maps`' dev-client-only requirement (see "Google Maps setup"
above) — in Expo Go or on web, the Home screen falls back to exactly its old plain
scrollable layout (`HomeScreen.tsx` checks `loadMaps() != null` before rendering the map
card at all), so there's no dead card or broken tap target where the map can't run.

**Untested in this environment:** the size/opacity animation, the region pan/zoom, and
the swipe-down gesture were all written against the installed package's actual type
definitions and API signatures (checked directly in `node_modules`, since network access
to the Expo docs was blocked here) and the whole app typechecks and bundles cleanly, but
none of it has been run interactively — that needs a dev-client build on a real device or
simulator, which this sandboxed session can't produce. Sanity-check the feel (timing,
commit threshold, grabber hit area) on an actual build before relying on it.

## Architecture

```
App.tsx                     Root shell: TopBar + tab switch + BottomTabBar, wires up
                             the device-sync and bad-wind-alert hooks.
src/
  screens/                  HomeScreen, StandScreen (list + editor), AlertsScreen,
                             DeviceScreen, LogScreen (Hunts / Thermal Log / Season
                             Report toggle)
  components/
    CompassDial.tsx          Wind cone (wedge, narrow at center → wide in the travel
                             direction) + dashed line for the active stand's facing
    ThermalIndicator.tsx     Always-resolved rising/sinking + a High/Medium/Low
                             confidence label, driven by src/utils/thermal.ts
    PressureIndicator.tsx    Rising/falling/steady barometric trend, driven by
                             src/utils/pressure.ts
    StandEditor.tsx          Name, terrain/edge, facing slider (fallback), interactive
                             map (or GPS button) + elevation lookup, game-area pin,
                             game-area relative elevation
    StandMapPicker.tsx       Single-pin Google Map for the editor — tap/drag to set a
                             stand's coordinates
    AllStandsMap.tsx         Every saved stand as a pin, tap one to open its editor.
                             Also exports AllStandsMapView (bare map + pins, ref-forwarded)
                             and regionForStands() — the real map-rendering + bounds-fit
                             logic both this and HomeMapReveal share
    HomeMapReveal.tsx         Home screen's collapsed-card/full-screen map layer — see
                             "Home screen map layer" below
    StandRecommendation.tsx  Ranked stand list (src/utils/recommendation.ts) with
                             one-tap "switch active stand"
    ThermalLogModal.tsx      Rising/sinking/unsure prompt for predicted-vs-observed
                             logging
    HuntLogModal.tsx          Sighting (none/saw-game/harvest) + note prompt, saved
                             against the active stand — src/utils/cooldown.ts reads these
    StandCooldownBanner.tsx   "Resting recommended" card for the stand detail screen, only
                             rendered when the stand is flagged (see cooldown.ts)
    SeasonReport.tsx           Plain stat cards (src/utils/seasonReport.ts) — total sits,
                             most-hunted/most-successful stand, best wind direction/time
                             of day. Lives in LogScreen's third segment
    AccountSyncSection.tsx     Email/code sign-in + sync status, and the separate
                             opt-in-to-training toggle — see "Cloud sync notes" below.
                             Lives on the Alerts screen (the app's de facto Settings)
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
    weather/openMeteo.ts       fetchWeatherSeries() — hourly wind + barometric pressure,
                               recent history through multi-day forecast, cached per
                               rounded coordinate
    maps/
      availability.ts          Same Expo-Go/web detection pattern as the BLE factory
      loadMaps.ts               Guarded lazy require() of react-native-maps
    haptics.ts                On-phone buzz via expo-haptics, alongside the bracelet's
                               own vibrate command
    notifications.ts           Local (device-scheduled, no server) notification wrapper —
                               permission check/request + present-immediately. Only
                               *remote* push lost Expo Go support on Android in recent
                               SDKs; this doesn't use that path
    supabase/
      client.ts                 Null when EXPO_PUBLIC_SUPABASE_URL/ANON_KEY aren't set —
                               same detect-and-fall-back shape as maps/BLE. AsyncStorage-
                               backed session persistence (Supabase's own, not zustand's)
      auth.ts                   Email + 6-digit code sign-in (no password) —
                               requestEmailCode() / verifyEmailCode() / signOut()
      sync.ts                   pushHuntLogEntry() / pushThermalLogEntry() (private,
                               per-account) and contributeThermalTrainingRow() (the
                               anonymized opt-in copy) — see "Cloud sync notes" below
  utils/
    thermal.ts                 resolveThermalDirection() always resolves rising/sinking
                               (High confidence in a clear morning/evening window; a
                               midday/transition tie goes to the temperature trend at
                               Medium, or a time-of-day-only guess at Low) — see "Thermal
                               prediction notes" below. assessThermal() layers the
                               above/below/level favorability on top; used by the
                               indicator, the recommendation engine, and thermal logging
    temperature.ts               assessTemperatureTrend() — same shape as pressure.ts's
                               trend check, but over temperature; thermal.ts's tiebreaker
    pressure.ts                 assessPressureTrend() — compares current vs. ~3h-ago
                               pressure from the weather series to call rising/falling/
                               steady; falling is framed as favorable (more deer movement)
    cooldown.ts                 assessStandCooldown() — counts a stand's HuntLogEntry rows
                               within a rolling window (Alerts screen: window days +
                               threshold, default 7 days / 3 hunts) and flags it once the
                               threshold's hit; feeds the stand list badge, the stand
                               detail banner, and a score penalty in the recommendation
                               engine
    gameArea.ts                 Resolves the bearing/point to treat as "the game area" —
                               the real dropped pin when set, else the stand's facing
                               angle. Everything that used to read `stand.facingDeg`
                               directly (bad wind alerts, the compass dial, stand
                               recommendations, entry-route risk) goes through this now
    recommendation.ts          Scores each saved stand against current wind + thermal
                               conditions
    sitWindow.ts                findGoodSitWindow() — scans each stand's 12-18h-out
                               forecast for an hour where wind, thermal, and (if a parking
                               pin's set) entry risk are all favorable at once; skips
                               cooldown-flagged stands. High bar on purpose — see hook below
    seasonReport.ts              buildSeasonReport() — tallies HuntLogEntry rows by stand,
                               wind-direction bucket (parsed from windLabel), and
                               time-of-day bucket, weighting harvest > sighting > blank to
                               pick a "best" of each; "best" fields are null until
                               something in the log actually has a sighting or harvest
  hooks/
    useDeviceSync.ts           Subscribes device services into the store (mounted once,
                               at the root)
    useBadWindAlerts.ts        Buzzes the bracelet + phone when wind turns unfavorable,
                               respecting the Alerts screen's buzz/sensitivity/quiet-hours
    useGoodSitWindowCheck.ts    Once-daily (Alerts screen: on/off + hour) check that runs
                               sitWindow.ts across all stands and fires a local
                               notification if something clears the bar — see "Good-sit
                               notification notes" below
    useHuntLogReminder.ts       Prompts to log a hunt (native Alert, two-step: confirm,
                               then pick a sighting) after a 2h+ app background/foreground
                               gap with a stand active — see "Hunt log notes" below
    useSupabaseAuth.ts           Mirrors Supabase's own session into the store (a live
                               copy for synchronous reads elsewhere, not a second copy of
                               the persistence — Supabase's client already persists it)
    useCloudSync.ts              Always-on push of new hunt/thermal log entries once
                               signed in, plus the training-contribution copy when opted
                               in — see "Cloud sync notes" below
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

### Thermal prediction notes

`getThermalDirection(hour)` only ever returns a real direction for a clear morning
(5-11am) or evening (4-9pm) window — everything else is a "transition" period with no
obvious direction from time-of-day alone. Rather than surface that as an unknown/unstable
state, `resolveThermalDirection()` always resolves to `rising` or `sinking`: outside a
transition window it's just that window's direction at High confidence; inside one, a
real temperature trend (from the same hourly weather series `pressure.ts` already reads —
`assessTemperatureTrend()`, ±2°F over ~3h to count as real rather than noise) breaks the
tie at Medium confidence, and with no trend data (or a flat one) it falls back to a
time-of-day-only guess (still-warming early-mid afternoon leans rising, the overnight/
early-morning stretch leans sinking) at Low confidence. `assessThermal()` always calls
this now, so the level-terrain "no favorability either way" case is the only remaining
neutral state — every stand gets a real direction and a real recommendation-engine score
at every hour.

The recommendation engine ranks every stand in one pass but only has a temperature series
on hand for whichever stand is already on-screen — rather than fire a weather fetch per
stand on every ranking pass (wind updates every few seconds), `rankStands()` takes a
single `temperatureTrend` and reuses it as the tiebreaker for every stand. Reasonable for
stands on the same property; less exact for stands far apart. `sitWindow.ts`'s
once-a-day forecast scan doesn't share this limitation — it already has each stand's own
forecast series in hand for every candidate hour, so it computes a real per-stand,
per-hour trend instead of reusing one.

`ThermalLogEntry.confidence` preserves whatever confidence the prediction had at the
exact moment a real observation was logged (`HomeScreen.tsx` logs `thermal.direction` /
`thermal.confidence` from the same `assessThermal()` call the banner displays, not a
separate computation) — intended for a future pass evaluating which conditions this
rule-based model gets wrong most often, once training a better one is next. Shown
alongside the predicted direction in the Log screen's Thermal Log rows.

### Hunt log notes

`HuntLogEntry` carries a real `timestamp` plus `standId`/`standName` (the latter a
snapshot, same denormalization `ThermalLogEntry` already used, so a renamed or deleted
stand doesn't corrupt old rows) and a `sighting: 'none' | 'saw-game' | 'harvest'` outcome.
Entries are created via the "Log This Hunt" button on the Home screen
(`HuntLogModal.tsx`), always against the active stand — `standId` is only `null` for
entries logged before per-stand tracking existed, which the cooldown tracker and
recommendation engine simply skip when counting hunts against a specific stand.

Nothing creates a `HuntLogEntry` automatically — `useHuntLogReminder.ts` is a backstop,
not a second write path. It tracks `backgroundedAtMs` across app background/foreground
transitions (persisted, so it survives the OS killing the app while backgrounded) and,
on return from a 2h+ gap with a stand active and no entry already logged against it since
then, prompts via a native `Alert` — confirm, then pick a sighting — and writes the same
shape `HuntLogModal` does, just with an empty note and the wind reading at the moment you
tap through rather than whenever the actual sit happened. It can't detect "you were
hunting without ever backgrounding the app," and a fresh install won't prompt on its
first-ever open (no prior gap to compare against). Toggle: Alerts screen.

### Good-sit notification notes

A local notification's title/body has to be set at schedule time — it can't be computed
from a live forecast when the OS fires it later unless the JS app is actually running at
that moment. True "fires even from fully closed" scheduling needs a background task
(`expo-task-manager` + `expo-background-fetch`), which needs a custom dev client (won't
run in plain Expo Go) and is opportunistic/not exact-time on iOS regardless — a similar
effort tier to the real BLE bracelet integration below.

`useGoodSitWindowCheck.ts` takes the pragmatic v1 instead: a periodic in-app check (every
5 min, plus on mount) that runs the real evaluation and fires a real local notification
the first time the app is open at/after the configured hour each day
(`lastGoodSitCheckDateKey` tracks "already ran today," so it only fires once). This
doesn't wake the app from fully closed — if the app never opens that day, no notification
fires. Upgrading to true background scheduling later is additive (same evaluation logic
in `sitWindow.ts`, just triggered from a background task instead of a mounted hook).

### Cloud sync notes

Two deliberately separate decisions, matching how they're presented in the Alerts screen
(`AccountSyncSection.tsx`):

- **Personal sync is unconditional.** Once signed in, every `HuntLogEntry` and
  `ThermalLogEntry` pushes to that account's own `hunt_log_entries` /
  `thermal_log_entries` tables — no separate toggle, no way to be signed in and *not*
  backed up. `useCloudSync.ts` upserts by the entry's own client-generated id (so a retry
  after a dropped response never double-inserts) on an effect that re-runs whenever a new
  entry is added, the account changes, or the training toggle flips, plus a 2-minute
  interval as a connectivity-loss retry fallback. `supabase/schema.sql`'s RLS restricts
  every row to `auth.uid() = user_id` — no other account, and no unauthenticated request,
  can read or write it.
- **Training contribution is a separate, off-by-default opt-in.** When on,
  `contributeThermalTrainingRow()` also inserts an anonymized copy of each *thermal* log
  entry (not hunt log entries — those don't have a predicted/observed pair worth
  evaluating a model against) into `thermal_training_contributions`. That table has no
  `user_id` column at all, and drops every free-text/identifying field (stand name, your
  note) — genuine anonymization at the schema level, not data that's merely
  access-restricted. Its only RLS policy is `insert` `to authenticated`: signed-in users
  can add a row (this gates spam, not identity — the row itself carries nothing that
  traces back to who sent it), and nobody can read, update, or delete via the client API.
  Querying it for actual model training happens from the Supabase dashboard or a
  service-role key, outside the app entirely.

**Auth is email + a 6-digit one-time code, not a password.** No password to set, store,
or reset, and no deep-link handling to configure (a code you type is simpler than a
magic-link redirect) — `requestEmailCode()`/`verifyEmailCode()` wrap Supabase's
`signInWithOtp`/`verifyOtp`. First use of a new email creates the account automatically.

**Not provisioned here.** Building this required creating a Supabase account/project,
which needs real credentials this session doesn't have — the client, schema, and sync
logic are complete and typecheck/bundle cleanly, but nothing syncs anywhere until a real
project's URL/anon key are set (see "Cloud sync setup" above) and the schema's been run.

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
