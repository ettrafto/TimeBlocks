-- Dev-only seed data (types)
INSERT INTO types (name, color)
SELECT 'Work', '#2563eb'
WHERE NOT EXISTS (SELECT 1 FROM types WHERE name = 'Work');

INSERT INTO types (name, color)
SELECT 'Personal', '#16a34a'
WHERE NOT EXISTS (SELECT 1 FROM types WHERE name = 'Personal');

INSERT INTO types (name, color)
SELECT 'School', '#dc2626'
WHERE NOT EXISTS (SELECT 1 FROM types WHERE name = 'School');


