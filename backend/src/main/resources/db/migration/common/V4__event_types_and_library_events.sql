-- Event types and library events (portable)

CREATE TABLE IF NOT EXISTS event_types (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  defaults_jsonb TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_types_ws ON event_types(workspace_id);

CREATE TABLE IF NOT EXISTS library_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type_id TEXT REFERENCES event_types(id),
  name TEXT NOT NULL,
  default_duration_min INTEGER NOT NULL,
  color TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lib_ws ON library_events(workspace_id);









