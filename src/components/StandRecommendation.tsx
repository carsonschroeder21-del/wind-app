import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { StandRanking } from '../utils/recommendation';

interface StandRecommendationProps {
  rankings: StandRanking[];
  activeStandId: string | null;
  onSelect: (id: string) => void;
}

export function StandRecommendation({ rankings, activeStandId, onSelect }: StandRecommendationProps) {
  if (rankings.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>STAND RECOMMENDATION</Text>
      {rankings.map((ranking, index) => {
        const isTop = index === 0;
        const isActive = ranking.stand.id === activeStandId;
        return (
          <View key={ranking.stand.id} style={[styles.row, isTop && styles.rowTop]}>
            <View style={styles.rowLeft}>
              {isTop && <Text style={styles.topLabel}>BEST RIGHT NOW</Text>}
              <Text style={styles.standName}>{ranking.stand.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.dot, { backgroundColor: ranking.windFavorable ? palette.good : palette.bad }]} />
                <Text style={styles.badgeText}>Wind {ranking.windFavorable ? 'favorable' : 'unfavorable'}</Text>
                {ranking.thermalFavorable != null && (
                  <>
                    <View
                      style={[styles.dot, { backgroundColor: ranking.thermalFavorable ? palette.good : palette.bad }]}
                    />
                    <Text style={styles.badgeText}>
                      Thermal {ranking.thermalFavorable ? 'favorable' : 'unfavorable'}
                    </Text>
                  </>
                )}
              </View>
            </View>
            {isActive ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            ) : (
              <Pressable onPress={() => onSelect(ranking.stand.id)} style={styles.switchButton}>
                <Text style={styles.switchButtonText}>Switch</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    padding: 14,
  },
  title: { color: palette.textHi, fontSize: 12, letterSpacing: 1, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  rowTop: { borderTopWidth: 0, paddingTop: 0 },
  rowLeft: { flex: 1, paddingRight: 12 },
  topLabel: { color: palette.amber, fontSize: 9, letterSpacing: 1, fontFamily: mono, marginBottom: 2 },
  standName: { color: palette.textHi, fontSize: 14 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { color: palette.textLo, fontSize: 11, marginRight: 4 },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(209,131,47,0.15)',
    borderWidth: 1,
    borderColor: palette.amber,
  },
  activePillText: { color: palette.amber, fontSize: 9, letterSpacing: 0.5, fontFamily: mono },
  switchButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: palette.line,
  },
  switchButtonText: { color: palette.textHi, fontSize: 11 },
});
