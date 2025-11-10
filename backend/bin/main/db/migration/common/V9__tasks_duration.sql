-- Add duration to tasks; default 30 minutes if unknown
ALTER TABLE tasks ADD COLUMN duration INTEGER;
UPDATE tasks SET duration = 30 WHERE duration IS NULL;


