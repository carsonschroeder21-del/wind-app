import { Battery, Bluetooth, Check, Signal, Wind } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { getBraceletService, getWindSensorService } from '../services/ble/factory';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';

export function DeviceScreen() {
  const bracelet = useAppStore((s) => s.bracelet);
  const windSensor = useAppStore((s) => s.windSensor);
  const [braceletBusy, setBraceletBusy] = useState(false);
  const [sensorBusy, setSensorBusy] = useState(false);

  const braceletConnected = bracelet.state === 'connected';
  const sensorConnected = windSensor.state === 'connected';

  const toggleBracelet = async () => {
    setBraceletBusy(true);
    try {
      const svc = getBraceletService();
      if (braceletConnected) await svc.disconnect();
      else await svc.connect();
    } catch (err) {
      console.warn('[DeviceScreen] bracelet action failed:', err);
    } finally {
      setBraceletBusy(false);
    }
  };

  const toggleSensor = async () => {
    setSensorBusy(true);
    try {
      const svc = getWindSensorService();
      if (sensorConnected) await svc.disconnect();
      else await svc.connect();
    } catch (err) {
      console.warn('[DeviceScreen] sensor action failed:', err);
    } finally {
      setSensorBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { borderColor: braceletConnected ? palette.good : palette.line }]}>
            <Bluetooth size={20} color={braceletConnected ? palette.good : palette.textLo} />
          </View>
          <View>
            <Text style={styles.deviceName}>Wind Scout Bracelet</Text>
            <Text style={styles.deviceStatus}>
              {bracelet.state === 'connecting' ? 'Connecting…' : braceletConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
        </View>

        {braceletConnected && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Battery size={14} color={palette.textLo} />
              <Text style={styles.statText}>{bracelet.batteryPct}%</Text>
            </View>
            <View style={styles.statItem}>
              <Signal size={14} color={palette.textLo} />
              <Text style={styles.statText}>{bracelet.signal}</Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={toggleBracelet}
          disabled={braceletBusy || bracelet.state === 'connecting'}
          style={[styles.actionButton, braceletConnected ? styles.actionButtonGhost : styles.actionButtonPrimary]}
        >
          {braceletBusy || bracelet.state === 'connecting' ? (
            <ActivityIndicator size="small" color={braceletConnected ? palette.textHi : palette.onAmber} />
          ) : (
            <>
              {braceletConnected && <Check size={13} color={palette.textHi} />}
              <Text style={[styles.actionButtonText, { color: braceletConnected ? palette.textHi : palette.onAmber }]}>
                {braceletConnected ? 'Disconnect' : 'Connect Bracelet'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { borderColor: sensorConnected ? palette.good : palette.line }]}>
            <Wind size={20} color={sensorConnected ? palette.good : palette.textLo} />
          </View>
          <View>
            <Text style={styles.deviceName}>WeatherFlow WINDmeter</Text>
            <Text style={styles.deviceStatus}>
              {windSensor.state === 'connecting'
                ? 'Connecting…'
                : sensorConnected
                  ? 'Connected — live data'
                  : 'Not connected — using regional estimate'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={toggleSensor}
          disabled={sensorBusy || windSensor.state === 'connecting'}
          style={[styles.actionButton, sensorConnected ? styles.actionButtonGhost : styles.actionButtonPrimary]}
        >
          {sensorBusy || windSensor.state === 'connecting' ? (
            <ActivityIndicator size="small" color={sensorConnected ? palette.textHi : palette.onAmber} />
          ) : (
            <>
              {sensorConnected && <Check size={13} color={palette.textHi} />}
              <Text style={[styles.actionButtonText, { color: sensorConnected ? palette.textHi : palette.onAmber }]}>
                {sensorConnected ? 'Disconnect Sensor' : 'Connect Sensor (optional)'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        The bracelet and sensor each connect to your phone independently — they don&apos;t talk to each other
        directly. Connecting the WINDmeter switches your wind reading from Regional to Live automatically.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20, gap: 20 },
  card: { borderRadius: 8, padding: 16, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bgAlt,
    borderWidth: 2,
  },
  deviceName: { color: palette.textHi, fontSize: 14 },
  deviceStatus: { color: palette.textLo, fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: palette.textLo, fontSize: 12 },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonPrimary: { backgroundColor: palette.amber },
  actionButtonGhost: { backgroundColor: palette.bgAlt, borderWidth: 1, borderColor: palette.line },
  actionButtonText: { fontSize: 12 },
  footnote: { color: palette.textLo, fontSize: 11, lineHeight: 16 },
});
