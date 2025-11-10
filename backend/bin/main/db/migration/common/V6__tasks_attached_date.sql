-- Add attached_date for tasks (stores YYYY-MM-DD as TEXT for SQLite portability)
ALTER TABLE tasks ADD COLUMN attached_date TEXT NULL;


