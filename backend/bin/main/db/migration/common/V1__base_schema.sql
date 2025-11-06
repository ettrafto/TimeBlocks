-- Common portable base schema for Create page and calendar occurrences

-- Types
CREATE TABLE IF NOT EXISTS types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  type_id INTEGER NOT NULL REFERENCES types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS ix_tasks_type ON tasks(type_id);
CREATE INDEX IF NOT EXISTS ix_subtasks_task ON subtasks(task_id);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL,
  library_event_id TEXT,
  type_id TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  tzid TEXT NOT NULL,
  start_utc TEXT NOT NULL,
  end_utc   TEXT NOT NULL,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT,
  created_by TEXT NOT NULL,
  created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
);

CREATE INDEX IF NOT EXISTS idx_events_cal_start ON events(calendar_id, start_utc);
CREATE INDEX IF NOT EXISTS idx_events_cal_end   ON events(calendar_id, end_utc);

-- Event Occurrences
CREATE TABLE IF NOT EXISTS event_occurrences (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  start_utc TEXT NOT NULL,
  end_utc   TEXT NOT NULL,
  tzid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  is_exception INTEGER NOT NULL DEFAULT 0,
  payload_jsonb TEXT NOT NULL DEFAULT '{}'
);

-- Avoid duplicate occurrences for same event window
CREATE UNIQUE INDEX IF NOT EXISTS ux_occ_event_window
  ON event_occurrences(event_id, start_utc, end_utc);


