-- Wind Scout cloud sync schema.
--
-- Run this once in your Supabase project's SQL editor (Database > SQL Editor > New
-- query) after creating the project. See README.md "Cloud sync setup" for the full
-- setup flow, including where to get the project URL/anon key the app needs.
--
-- Two separate trust boundaries by design:
--   1. hunt_log_entries / thermal_log_entries — a hunter's own private data. RLS
--      restricts every operation to auth.uid() = user_id, so nobody (including other
--      signed-in users) can read or write another account's rows via the client API.
--   2. thermal_training_contributions — the separate, opt-in anonymized dataset. No
--      user_id column at all, and no free-text fields that could identify a person or a
--      location (stand name, notes are deliberately never included) — this is genuine
--      anonymization at the schema level, not just an access restriction on data that's
--      still personally identifiable. The client can only INSERT into it, never read,
--      update, or delete — only the project owner (via the dashboard or a service-role
--      key) can query it.

create table if not exists public.hunt_log_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_timestamp bigint not null,
  stand_id text,
  stand_name text not null default '',
  wind_label text not null,
  terrain text not null,
  is_edge boolean not null,
  sighting text not null,
  note text not null default '',
  synced_at timestamptz not null default now()
);

create table if not exists public.thermal_log_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_timestamp bigint not null,
  stand_id text not null,
  stand_name text not null,
  terrain text not null,
  predicted text not null,
  confidence text not null,
  observed text not null,
  wind_direction_deg integer not null,
  wind_speed_mph integer not null,
  synced_at timestamptz not null default now()
);

create index if not exists hunt_log_entries_user_id_idx on public.hunt_log_entries(user_id);
create index if not exists thermal_log_entries_user_id_idx on public.thermal_log_entries(user_id);

alter table public.hunt_log_entries enable row level security;
alter table public.thermal_log_entries enable row level security;

create policy "Individuals can manage their own hunt log entries"
  on public.hunt_log_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Individuals can manage their own thermal log entries"
  on public.thermal_log_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anonymized, opt-in shared training dataset — thermal predictions only, since those are
-- the entries with a predicted/confidence/observed triple worth evaluating a model
-- against. Deliberately excludes hunt_log_entries (sightings/harvests): nothing in this
-- app's current data model ties a sighting to a predicted outcome the way a thermal
-- prediction does, so there's nothing meaningful yet to aggregate from that table.
create table if not exists public.thermal_training_contributions (
  id bigint generated always as identity primary key,
  entry_hour integer not null check (entry_hour >= 0 and entry_hour <= 23),
  terrain text not null,
  predicted text not null,
  confidence text not null,
  observed text not null,
  wind_direction_deg integer not null,
  wind_speed_mph integer not null,
  contributed_at timestamptz not null default now()
);

alter table public.thermal_training_contributions enable row level security;

create policy "Signed-in users can contribute anonymized rows"
  on public.thermal_training_contributions for insert
  to authenticated
  with check (true);

-- No select/update/delete policy for the authenticated role on purpose — the table is
-- write-only from the client. Query it from the Supabase dashboard or with a
-- service-role key when it's actually time to train against it.
