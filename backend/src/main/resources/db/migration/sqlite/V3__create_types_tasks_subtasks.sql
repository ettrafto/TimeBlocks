-- Create types table (simpler than event_types, for Create page)
CREATE TABLE IF NOT EXISTS types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER NOT NULL REFERENCES types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type_id);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);

-- Seed initial types if table is empty
INSERT INTO types (name, color) 
SELECT 'Work', '#2563eb' 
WHERE NOT EXISTS (SELECT 1 FROM types WHERE name = 'Work');

INSERT INTO types (name, color) 
SELECT 'Personal', '#16a34a' 
WHERE NOT EXISTS (SELECT 1 FROM types WHERE name = 'Personal');

INSERT INTO types (name, color) 
SELECT 'School', '#dc2626' 
WHERE NOT EXISTS (SELECT 1 FROM types WHERE name = 'School');

