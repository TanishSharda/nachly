-- Create table for resumable upload sessions
create table if not exists upload_sessions (
  id serial primary key,
  session_id uuid not null unique,
  user_id uuid,
  status text not null default 'started',
  file_path text,
  file_size bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists upload_sessions_session_id_idx on upload_sessions(session_id);
