import type { HuntLogEntry, ThermalLogEntry } from '../../types';
import { supabase } from './client';

/** Upserts by the entry's own client-generated id, so retrying a push that actually
 * succeeded (e.g. the response was lost after a flaky connection) never double-inserts. */
export async function pushHuntLogEntry(userId: string, entry: HuntLogEntry): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('hunt_log_entries').upsert({
    id: entry.id,
    user_id: userId,
    entry_timestamp: entry.timestamp,
    stand_id: entry.standId,
    stand_name: entry.standName,
    wind_label: entry.windLabel,
    terrain: entry.terrain,
    is_edge: entry.isEdge,
    sighting: entry.sighting,
    note: entry.note,
  });
  if (error) console.warn('[sync] hunt log push failed:', error.message);
  return !error;
}

export async function pushThermalLogEntry(userId: string, entry: ThermalLogEntry): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('thermal_log_entries').upsert({
    id: entry.id,
    user_id: userId,
    entry_timestamp: entry.timestamp,
    stand_id: entry.standId,
    stand_name: entry.standName,
    terrain: entry.terrain,
    relative_elevation: entry.relativeElevation,
    temperature_trend: entry.temperatureTrend,
    predicted: entry.predicted,
    confidence: entry.confidence,
    observed: entry.observed,
    wind_direction_deg: entry.windDirectionDeg,
    wind_speed_mph: entry.windSpeedMph,
  });
  if (error) console.warn('[sync] thermal log push failed:', error.message);
  return !error;
}

/** The anonymized, opt-in copy — deliberately excludes anything that could identify a
 * person or a location (no user id, no stand name, no free-text note), keeping the full
 * set of inputs and outputs a future training pass would actually need: relativeElevation
 * and temperatureTrend are the two inputs resolveThermalDirection() based
 * predicted/confidence on, not just the outcome. Requires a signed-in session to write
 * (RLS: `to authenticated`), which prevents anonymous flooding of the table without
 * linking the row's *content* back to that identity — the row itself carries nothing that
 * maps back to who sent it. */
export async function contributeThermalTrainingRow(entry: ThermalLogEntry): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('thermal_training_contributions').insert({
    entry_hour: new Date(entry.timestamp).getHours(),
    terrain: entry.terrain,
    relative_elevation: entry.relativeElevation,
    temperature_trend: entry.temperatureTrend,
    predicted: entry.predicted,
    confidence: entry.confidence,
    observed: entry.observed,
    wind_direction_deg: entry.windDirectionDeg,
    wind_speed_mph: entry.windSpeedMph,
  });
  if (error) console.warn('[sync] training contribution failed:', error.message);
  return !error;
}
