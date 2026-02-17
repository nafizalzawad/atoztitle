
-- Create events table
create table public.events (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  event_date date not null,
  summary text null,
  followup_details text null,
  connections_count integer default 0,
  created_at timestamp with time zone not null default now(),
  constraint events_pkey primary key (id)
);

-- Enable RLS
alter table public.events enable row level security;

-- Create policies
create policy "Users can view their own events" on public.events
  for select using (auth.uid() = user_id);

create policy "Users can insert their own events" on public.events
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own events" on public.events
  for update using (auth.uid() = user_id);

create policy "Users can delete their own events" on public.events
  for delete using (auth.uid() = user_id);
