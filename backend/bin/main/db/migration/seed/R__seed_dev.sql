-- Dev-only seed data (types) gated by placeholder (0 by default)
INSERT INTO types (name, color)
SELECT 'Work', '#2563eb'
WHERE ${seed_default_types} = 1
  AND NOT EXISTS (SELECT 1 FROM types WHERE name = 'Work');

INSERT INTO types (name, color)
SELECT 'Personal', '#16a34a'
WHERE ${seed_default_types} = 1
  AND NOT EXISTS (SELECT 1 FROM types WHERE name = 'Personal');

INSERT INTO types (name, color)
SELECT 'School', '#dc2626'
WHERE ${seed_default_types} = 1
  AND NOT EXISTS (SELECT 1 FROM types WHERE name = 'School');


