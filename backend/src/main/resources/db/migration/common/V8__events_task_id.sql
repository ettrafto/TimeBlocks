-- Add task_id to events to link calendar entries back to tasks
ALTER TABLE events ADD COLUMN task_id TEXT NULL;


