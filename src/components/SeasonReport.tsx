import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import type { BucketStat, SeasonReport as SeasonReportData, StandStat } from '../utils/seasonReport';

function successDetail(stat: StandStat | BucketStat): string {
  const parts: string[] = [];
  if (stat.harvests > 0) parts.push(`${stat.harvests} harvest${stat.harvests === 1 ? '' : 's'}`);
  if (stat.sightings > 0) parts.push(`${stat.sightings} sighting${stat.sightings === 1 ? '' : 's'}`);
  return `${parts.join(', ')} (of ${stat.hunts} hunt${stat.hunts === 1 ? '' : 's'})`;
}

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
}

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue} numberOfLines={1}>
        {value}
      </Text>
      {detail && <Text style={styles.cardDetail}>{detail}</Text>}
    </View>
  );
}

function EmptyStatCard({ label }: { label: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.emptyText}>Not enough data yet</Text>
    </View>
  );
}

interface SeasonReportProps {
  report: SeasonReportData;
}

export function SeasonReport({ report }: SeasonReportProps) {
  if (report.totalSits === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyBannerText}>
          No hunts logged yet — use "Log This Hunt" on the Wind tab after a sit to start building your season
          report.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroValue}>{report.totalSits}</Text>
        <Text style={styles.heroLabel}>TOTAL SITS LOGGED</Text>
      </View>

      <View style={styles.row}>
        {report.mostHuntedStand ? (
          <StatCard
            label="MOST HUNTED STAND"
            value={report.mostHuntedStand.standName}
            detail={`${report.mostHuntedStand.hunts} sits`}
          />
        ) : (
          <EmptyStatCard label="MOST HUNTED STAND" />
        )}
        {report.mostSuccessfulStand ? (
          <StatCard
            label="MOST SUCCESSFUL STAND"
            value={report.mostSuccessfulStand.standName}
            detail={successDetail(report.mostSuccessfulStand)}
          />
        ) : (
          <EmptyStatCard label="MOST SUCCESSFUL STAND" />
        )}
      </View>

      <View style={styles.row}>
        {report.bestWindDirection ? (
          <StatCard
            label="BEST WIND DIRECTION"
            value={report.bestWindDirection.label}
            detail={successDetail(report.bestWindDirection)}
          />
        ) : (
          <EmptyStatCard label="BEST WIND DIRECTION" />
        )}
        {report.bestTimeOfDay ? (
          <StatCard
            label="BEST TIME OF DAY"
            value={report.bestTimeOfDay.label}
            detail={successDetail(report.bestTimeOfDay)}
          />
        ) : (
          <EmptyStatCard label="BEST TIME OF DAY" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
  emptyBannerText: { color: palette.textLo, fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 18 },
  heroCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    paddingVertical: 20,
    alignItems: 'center',
  },
  heroValue: { color: palette.amber, fontSize: 36, fontFamily: mono, fontWeight: '700' },
  heroLabel: { color: palette.textLo, fontSize: 11, letterSpacing: 1, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    padding: 12,
  },
  cardLabel: { color: palette.textLo, fontSize: 10, letterSpacing: 1 },
  cardValue: { color: palette.textHi, fontSize: 16, fontFamily: mono, marginTop: 4 },
  cardDetail: { color: palette.textLo, fontSize: 11, marginTop: 4, lineHeight: 15 },
  emptyText: { color: palette.textLo, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});
