import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from './src/components/BottomTabBar';
import { TopBar } from './src/components/TopBar';
import { useBadWindAlerts } from './src/hooks/useBadWindAlerts';
import { useCloudSync } from './src/hooks/useCloudSync';
import { useDeviceSync } from './src/hooks/useDeviceSync';
import { useGoodSitWindowCheck } from './src/hooks/useGoodSitWindowCheck';
import { useHuntLogReminder } from './src/hooks/useHuntLogReminder';
import { useSupabaseAuth } from './src/hooks/useSupabaseAuth';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { DeviceScreen } from './src/screens/DeviceScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LogScreen } from './src/screens/LogScreen';
import { MapScreen } from './src/screens/MapScreen';
import { StandScreen } from './src/screens/StandScreen';
import { palette } from './src/theme/palette';
import type { TabId } from './src/types';

const TITLES: Record<TabId, string> = {
  map: 'Your Stands',
  home: 'Live Wind',
  stand: 'Set Your Stand',
  alerts: 'Alert Settings',
  device: 'Bracelet',
  log: 'Hunt Log',
};

function AppShell() {
  const [tab, setTab] = useState<TabId>('map');

  useDeviceSync();
  useBadWindAlerts();
  useGoodSitWindowCheck();
  useHuntLogReminder();
  useSupabaseAuth();
  useCloudSync();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <TopBar title={TITLES[tab]} />
      <View style={styles.screen}>
        {tab === 'map' && <MapScreen />}
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: palette.bg },
  screen: { flex: 1 },
});
