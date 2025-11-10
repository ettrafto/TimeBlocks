-- Add persistent scheduled flag to tasks (0/1 for portability)
ALTER TABLE tasks ADD COLUMN scheduled INTEGER NOT NULL DEFAULT 0;

-- Backfill: mark tasks that already have schedules
UPDATE tasks
SET scheduled = 1
WHERE id IN (
  SELECT CAST(task_id AS INTEGER) FROM schedules GROUP BY task_id
);


