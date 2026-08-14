import { Footprints } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/palette';
import type { BestEntryWindow } from '../utils/entryRoute';
import type { EntryRouteAssessment, EntryRiskLevel } from '../types';

const COLOR_BY_LEVEL: Record<EntryRiskLevel, string> = {
  low: palette.good,
  moderate: palette.amber,
  high: palette.bad,
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface EntryRouteRiskProps {
  hasStandLocation: boolean;
  hasParking: boolean;
  assessment: EntryRouteAssessment | null;
  bestWindow: BestEntryWindow | null;
}

export function EntryRouteRisk({ hasStandLocation, hasParking, assessment, bestWindow }: EntryRouteRiskProps) {
  if (!hasStandLocation || !hasParking) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Footprints size={15} color={palette.textLo} />
          <Text style={styles.headerText}>ENTRY ROUTE</Text>
        </View>
        <Text style={styles.emptyText}>
          {hasStandLocation
            ? "Add a parking/entry point to this stand (in the editor) to see walk-in scent risk."
            : "Set the stand's own location first — entry route risk is measured relative to it."}
        </Text>
      </View>
    );
  }

  if (!assessment) return null;

  const color = COLOR_BY_LEVEL[assessment.level];
  const pct = Math.round(assessment.exposedFraction * 100);

  return (
    <View style={[styles.container, { backgroundColor: `${color}22`, borderColor: color }]}>
      <View style={styles.headerRow}>
        <Footprints size={15} color={color} />
        <Text style={[styles.headerText, { color }]}>ENTRY ROUTE — {assessment.level.toUpperCase()} RISK</Text>
      </View>
      <Text style={styles.detailText}>{assessment.label}</Text>
      {assessment.exposedFraction > 0 && (
        <Text style={styles.metaText}>
          ~{pct}% of the walk-in exposed ({Math.round(assessment.exposedFeet)} of {Math.round(assessment.totalFeet)} ft)
        </Text>
      )}
      {assessment.level !== 'low' && bestWindow && bestWindow.assessment.exposedFraction < assessment.exposedFraction ? (
        <Text style={styles.windowText}>
          Best entry window: {formatTime(bestWindow.startMs)}–{formatTime(bestWindow.endMs)} —{' '}
          {bestWindow.assessment.label.replace(/^\w+ risk — /, '')}
        </Text>
      ) : assessment.level !== 'low' && bestWindow ? (
        <Text style={styles.windowText}>No better entry window in the next few hours — current conditions are about as good as it gets.</Text>
      ) : null}
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
    borderColor: palette.line,
    backgroundColor: palette.panel,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerText: { color: palette.textHi, fontSize: 12, letterSpacing: 1 },
  detailText: { color: palette.textLo, fontSize: 12 },
  metaText: { color: palette.textLo, fontSize: 11, marginTop: 4 },
  windowText: { color: palette.textHi, fontSize: 11, marginTop: 8, lineHeight: 15 },
  emptyText: { color: palette.textLo, fontSize: 12, lineHeight: 17 },
});
