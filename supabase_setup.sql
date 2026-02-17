
-- 1. Create the 'events' table if it doesn't exist
create table if not exists public.events (
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

-- 2. Enable Row Level Security (RLS)
alter table public.events enable row level security;

-- 3. Create Access Policies (so you can read/write your own events)

-- Policy: Users can view their own events
create policy "Users can view their own events" on public.events
  for select using (auth.uid() = user_id);

-- Policy: Users can insert their own events
create policy "Users can insert their own events" on public.events
  for insert with check (auth.uid() = user_id);

-- Policy: Users can update their own events
create policy "Users can update their own events" on public.events
  for update using (auth.uid() = user_id);

-- Policy: Users can delete their own events
create policy "Users can delete their own events" on public.events
  for delete using (auth.uid() = user_id);

-- 4. Verify other tables exist (Optional helpful output)
do $$
begin
  if not exists (select from pg_tables where schemaname = 'public' and tablename = 'contacts') then
    raise notice 'Table "contacts" is missing!';
  end if;
  if not exists (select from pg_tables where schemaname = 'public' and tablename = 'follow_ups') then
    raise notice 'Table "follow_ups" is missing!';
  end if;
end $$;
