-- Schedules model (portable: SQLite & Postgres-compatible types)

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  start_ts_utc INTEGER NOT NULL,
  end_ts_utc   INTEGER NOT NULL,
  timezone TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  lane_id TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  recurrence_rule TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);

CREATE INDEX IF NOT EXISTS ix_schedules_task ON schedules(task_id);
CREATE INDEX IF NOT EXISTS ix_schedules_start ON schedules(start_ts_utc);
CREATE INDEX IF NOT EXISTS ix_schedules_end   ON schedules(end_ts_utc);
CREATE INDEX IF NOT EXISTS ix_schedules_lane  ON schedules(lane_id);

CREATE TRIGGER IF NOT EXISTS trg_schedules_updated
AFTER UPDATE ON schedules
FOR EACH ROW
BEGIN
  UPDATE schedules SET updated_at = (CAST(strftime('%s','now') AS INTEGER) * 1000) WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  ex_date_utc INTEGER NOT NULL,
  change_start_ts_utc INTEGER,
  change_end_ts_utc   INTEGER,
  change_lane_id TEXT,
  change_status TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);

CREATE INDEX IF NOT EXISTS ix_sched_ex_sched ON schedule_exceptions(schedule_id);
CREATE INDEX IF NOT EXISTS ix_sched_ex_date  ON schedule_exceptions(ex_date_utc);

-- Optional cache
CREATE TABLE IF NOT EXISTS schedule_occurrences_cache (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  occ_start_utc INTEGER NOT NULL,
  occ_end_utc   INTEGER NOT NULL,
  lane_id TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  meta TEXT,
  tz TEXT NOT NULL,
  generated_window TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);

CREATE INDEX IF NOT EXISTS ix_occ_cache_start ON schedule_occurrences_cache(occ_start_utc);
CREATE INDEX IF NOT EXISTS ix_occ_cache_end   ON schedule_occurrences_cache(occ_end_utc);
CREATE INDEX IF NOT EXISTS ix_occ_cache_lane  ON schedule_occurrences_cache(lane_id);
CREATE INDEX IF NOT EXISTS ix_occ_cache_sched ON schedule_occurrences_cache(schedule_id);


