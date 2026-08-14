import { BedDouble } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import type { StandCooldownStatus } from '../types';

interface StandCooldownBannerProps {
  cooldown: StandCooldownStatus;
}

/** Only meant to be rendered when `cooldown.flagged` — same conditional-render contract
 * as PressureIndicator, since there's nothing worth showing for a stand that isn't due
 * for a rest. */
export function StandCooldownBanner({ cooldown }: StandCooldownBannerProps) {
  return (
    <View style={[styles.container, { backgroundColor: `${palette.amber}22`, borderColor: palette.amber }]}>
      <View style={styles.headerRow}>
        <BedDouble size={15} color={palette.amber} />
        <Text style={[styles.headerText, { color: palette.amber }]}>RESTING RECOMMENDED</Text>
      </View>
      <Text style={styles.detailText}>
        Hunted {cooldown.huntsInWindow}× in the last {cooldown.windowDays} days — overhunting a spot pressures deer
        into avoiding it. Consider giving it a rest.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerText: { fontSize: 12, letterSpacing: 1 },
  detailText: { color: palette.textLo, fontSize: 12, lineHeight: 17 },
});
