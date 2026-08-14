import * as Notifications from 'expo-notifications';

// Local (device-scheduled) notifications, not push — no server, no remote token needed.
// These keep working in Expo Go on both platforms; only *remote* push notifications lost
// Expo Go support on Android in recent SDKs, which doesn't apply here.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Checks (and if needed, prompts for) permission to show local notifications. Resolves
 * to whether the app is actually allowed to present one right now. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Presents a local notification immediately (`trigger: null`) — used for the good-sit
 * window check, which computes its message from a live forecast evaluated in-app, so
 * there's nothing to hand the OS to fire later on its own. */
export async function presentLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
