PRAGMA foreign_keys = ON;

create table workspaces (
  id text primary key,
  name text not null,
  plan text not null default 'free',
  created_at_utc text not null default (strftime('%Y-%m-%dT%H:%M:%fZ'))
);

create table users (
  id text primary key,
  email text not null unique,
  name text
);

create table memberships (
  user_id text not null references users(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  role text not null default 'member',
  primary key (user_id, workspace_id)
);

create table calendars (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  color text,
  is_default integer not null default 0
);
create index idx_cal_ws on calendars(workspace_id);

create table event_types (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  defaults_jsonb text not null default '{}'
);
create index idx_types_ws on event_types(workspace_id);

create table library_events (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  type_id text references event_types(id),
  name text not null,
  default_duration_min integer not null,
  color text,
  notes text
);
create index idx_lib_ws on library_events(workspace_id);

create table events (
  id text primary key,
  calendar_id text not null references calendars(id) on delete cascade,
  library_event_id text references library_events(id),
  type_id text references event_types(id),
  title text not null,
  notes text,
  tzid text not null,
  start_utc text not null,
  end_utc text not null,
  is_all_day integer not null default 0,
  recurrence_rule text,
  created_by text not null references users(id),
  created_at_utc text not null default (strftime('%Y-%m-%dT%H:%M:%fZ'))
);
create index idx_events_cal_start on events(calendar_id, start_utc);
create index idx_events_cal_end on events(calendar_id, end_utc);

create table event_exceptions (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  original_start_utc text not null,
  new_start_utc text,
  new_end_utc text,
  canceled integer not null default 0,
  patch_jsonb text not null default '{}'
);
create unique index uq_exception_instance on event_exceptions(event_id, original_start_utc);

create table event_occurrences (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  start_utc text not null,
  end_utc text not null,
  tzid text not null,
  status text not null default 'confirmed',
  is_exception integer not null default 0,
  payload_jsonb text not null default '{}'
);
create index idx_occ_event_start on event_occurrences(event_id, start_utc);
create index idx_occ_start on event_occurrences(start_utc);

create table notifications (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  channel text not null,
  payload_jsonb text not null default '{}',
  scheduled_for_utc text not null,
  status text not null default 'pending'
);
create index idx_notifications_due on notifications(scheduled_for_utc, status);

