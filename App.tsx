import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from './src/components/BottomTabBar';
import { TopBar } from './src/components/TopBar';
import { useBadWindAlerts } from './src/hooks/useBadWindAlerts';
import { useDeviceSync } from './src/hooks/useDeviceSync';
import { useGoodSitWindowCheck } from './src/hooks/useGoodSitWindowCheck';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { DeviceScreen } from './src/screens/DeviceScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LogScreen } from './src/screens/LogScreen';
import { StandScreen } from './src/screens/StandScreen';
import { palette } from './src/theme/palette';
import type { TabId } from './src/types';

const TITLES: Record<TabId, string> = {
  home: 'Live Wind',
  stand: 'Set Your Stand',
  alerts: 'Alert Settings',
  device: 'Bracelet',
  log: 'Hunt Log',
};

function AppShell() {
  const [tab, setTab] = useState<TabId>('home');

  useDeviceSync();
  useBadWindAlerts();
  useGoodSitWindowCheck();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <TopBar title={TITLES[tab]} />
      <View style={styles.screen}>
        {tab === 'home' && <HomeScreen />}
        {tab === 'stand' && <StandScreen />}
        {tab === 'alerts' && <AlertsScreen />}
        {tab === 'device' && <DeviceScreen />}
        {tab === 'log' && <LogScreen />}
      </View>
      <BottomTabBar tab={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.bg },
  screen: { flex: 1 },
});
