insert into workspaces(id, name) values ('ws_dev', 'Dev Workspace');
insert into users(id, email, name) values ('u_dev', 'dev@example.com', 'Dev User');
insert into memberships(user_id, workspace_id, role) values ('u_dev', 'ws_dev', 'owner');

insert into calendars(id, workspace_id, name, is_default) values ('cal_main','ws_dev','Main',1);

insert into event_types(id, workspace_id, name, color, icon, defaults_jsonb) values
('type_deep','ws_dev','Deep Work','#2563eb','focus','{"defaultDurationMin":90}'),
('type_gym','ws_dev','Workout','#16a34a','dumbbell','{"defaultDurationMin":60}');

insert into library_events(id, workspace_id, type_id, name, default_duration_min, color, notes) values
('lib_deep','ws_dev','type_deep','Deep Work',90,'#2563eb','Noise-cancelling on'),
('lib_stretch','ws_dev','type_gym','Stretch',30,'#16a34a','Post-leg day');

insert into events(id, calendar_id, type_id, title, tzid, start_utc, end_utc, created_by)
values ('evt_single','cal_main','type_deep','Deep Work Block','America/Toronto','2025-10-15T14:00:00Z','2025-10-15T15:30:00Z','u_dev');

insert into events(id, calendar_id, type_id, title, tzid, start_utc, end_utc, recurrence_rule, created_by)
values ('evt_rrule','cal_main','type_gym','Gym','America/Toronto','2025-10-13T12:00:00Z','2025-10-13T13:00:00Z','FREQ=WEEKLY;BYDAY=MO,WE,FR','u_dev');

