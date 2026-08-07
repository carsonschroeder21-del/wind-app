import * as Haptics from 'expo-haptics';

/** Local phone buzz used alongside (or instead of) the bracelet's own vibrate command, so
 * alerts are felt immediately even before real bracelet hardware exists. */
export async function buzzPhone(pattern: 'alert' | 'short' = 'alert') {
  try {
    if (pattern === 'alert') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // Haptics can be unavailable (e.g. web) — safe to ignore.
  }
}
