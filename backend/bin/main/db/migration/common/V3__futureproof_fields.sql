-- Future-proof fields and helper tables

-- Stable public IDs (uid), workspace, lifecycle, versioning
ALTER TABLE types    ADD COLUMN uid TEXT;
ALTER TABLE tasks    ADD COLUMN uid TEXT;
ALTER TABLE subtasks ADD COLUMN uid TEXT;

-- Enforce uniqueness via indexes (SQLite cannot add a UNIQUE column directly)
CREATE UNIQUE INDEX IF NOT EXISTS ux_types_uid    ON types(uid)    WHERE uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tasks_uid    ON tasks(uid)    WHERE uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_subtasks_uid ON subtasks(uid) WHERE uid IS NOT NULL;

ALTER TABLE types    ADD COLUMN workspace_id INTEGER;
ALTER TABLE tasks    ADD COLUMN workspace_id INTEGER;
ALTER TABLE subtasks ADD COLUMN workspace_id INTEGER;

ALTER TABLE types    ADD COLUMN archived_at TIMESTAMP NULL;
ALTER TABLE tasks    ADD COLUMN archived_at TIMESTAMP NULL;
ALTER TABLE subtasks ADD COLUMN archived_at TIMESTAMP NULL;

ALTER TABLE types    ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE tasks    ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE subtasks ADD COLUMN deleted_at TIMESTAMP NULL;

ALTER TABLE types    ADD COLUMN version INTEGER DEFAULT 0;
ALTER TABLE tasks    ADD COLUMN version INTEGER DEFAULT 0;
ALTER TABLE subtasks ADD COLUMN version INTEGER DEFAULT 0;

-- types extras
ALTER TABLE types ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_types_slug ON types(slug);
ALTER TABLE types ADD COLUMN icon TEXT;
ALTER TABLE types ADD COLUMN sort_index INTEGER DEFAULT 0;
ALTER TABLE types ADD COLUMN settings TEXT;

-- tasks extras
ALTER TABLE tasks ADD COLUMN assignee_id INTEGER;
ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'normal';
ALTER TABLE tasks ADD COLUMN due_at TIMESTAMP NULL;
ALTER TABLE tasks ADD COLUMN start_at TIMESTAMP NULL;
ALTER TABLE tasks ADD COLUMN end_at TIMESTAMP NULL;
ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER NULL;
ALTER TABLE tasks ADD COLUMN actual_minutes INTEGER NULL;
ALTER TABLE tasks ADD COLUMN points INTEGER NULL;
ALTER TABLE tasks ADD COLUMN sort_index INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT NULL;
ALTER TABLE tasks ADD COLUMN reminder_minutes_before TEXT NULL;
ALTER TABLE tasks ADD COLUMN tags_cache TEXT NULL;
ALTER TABLE tasks ADD COLUMN meta TEXT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_type_sort ON tasks(type_id, sort_index);
CREATE INDEX IF NOT EXISTS ix_tasks_due       ON tasks(due_at);
CREATE INDEX IF NOT EXISTS ix_tasks_status    ON tasks(status);

-- subtasks extras
ALTER TABLE subtasks ADD COLUMN assignee_id INTEGER NULL;
ALTER TABLE subtasks ADD COLUMN due_at TIMESTAMP NULL;
ALTER TABLE subtasks ADD COLUMN sort_index INTEGER DEFAULT 0;
ALTER TABLE subtasks ADD COLUMN meta TEXT NULL;

CREATE INDEX IF NOT EXISTS ix_subtasks_task_sort ON subtasks(task_id, sort_index);

-- tags + many-to-many
CREATE TABLE IF NOT EXISTS tags(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NULL
);
CREATE TABLE IF NOT EXISTS task_tags(
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY(task_id, tag_id)
);
CREATE INDEX IF NOT EXISTS ix_task_tags_tag  ON task_tags(tag_id);
CREATE INDEX IF NOT EXISTS ix_task_tags_task ON task_tags(task_id);


