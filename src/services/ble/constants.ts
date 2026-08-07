export const BRACELET_DEVICE_NAME = 'Wind Scout Bracelet';

// TODO(hardware): replace with the real bracelet firmware's GATT UUIDs once a prototype
// board exists. These are placeholders in the Bluetooth SIG "custom" range.
export const BRACELET_SERVICE_UUID = '0000fe00-0000-1000-8000-00805f9b34fb';
export const BRACELET_VIBRATE_CHAR_UUID = '0000fe02-0000-1000-8000-00805f9b34fb';

// Standard BLE Battery Service — a reasonable bet that off-the-shelf wearable firmware
// (e.g. Nordic/Zephyr based boards) exposes battery level through this, rather than a
// custom characteristic.
export const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL_CHAR_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

// Base64 payloads for single-byte command writes, precomputed so we don't need a Buffer
// polyfill just to talk to the bracelet.
export const COMMAND_BYTE_BASE64 = {
  vibrateAlert: 'Ag==', // 0x02
  vibrateShort: 'AQ==', // 0x01
} as const;

// NOTE: the real WeatherFlow WINDmeter/Tempest hardware reports over UDP broadcast on the
// local Wi-Fi network, not BLE — it only uses Bluetooth for initial provisioning. A real
// integration should implement WindSensorService against WeatherFlow's UDP API rather than
// react-native-ble-plx. This name is only used for the mock/demo status label.
export const WINDMETER_DEVICE_NAME = 'WeatherFlow WINDmeter';
