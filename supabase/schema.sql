-- Synthetic Audience Reaction Player — Supabase schema
-- Run this in the Supabase SQL editor (Project -> SQL editor -> New query).
--
-- Model: the server writes sessions/feedback using the service-role key (which
-- bypasses RLS), so those tables have no client write policies. RLS protects
-- READS (public share links + owner access) and gives users full control over
-- their saved audiences.

-- =====================================================================
-- profiles: name + email for each signed-up user (magic-link auth)
-- =====================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile when a user signs up, pulling the name they entered.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- sessions: each generated listening session (track + room + output)
-- =====================================================================
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null, -- null = anonymous
  created_at    timestamptz not null default now(),
  track_title   text not null,
  track_genre   text not null,
  track_vibe    text not null,
  track_duration int  not null,
  room          jsonb not null,   -- the audience config (selected + custom listeners, brutality)
  reactions     jsonb not null,   -- the generated timeline
  summary       jsonb,            -- the verdict (null until the song ends)
  is_public     boolean not null default false  -- powers shareable result links
);

alter table public.sessions enable row level security;

-- Anyone can read a session that's public (share links); owners read their own.
create policy "read public or own sessions"
  on public.sessions for select
  using (is_public = true or auth.uid() = user_id);

-- =====================================================================
-- feedback: real user feedback on a session (comment + feeling)
-- =====================================================================
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.sessions(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  comment     text,          -- free-text comment
  feeling     text           -- a sentiment / emoji label (e.g. "loved", "meh")
);

alter table public.feedback enable row level security;

-- Users can read feedback they submitted (written server-side via service role).
create policy "read own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- =====================================================================
-- audiences: saved custom rooms a logged-in user can reuse
-- =====================================================================
create table if not exists public.audiences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  name        text not null,
  listeners   jsonb not null  -- array of listener definitions
);

alter table public.audiences enable row level security;

-- Owners have full control over their saved audiences (client-side CRUD).
create policy "owners manage their audiences"
  on public.audiences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- leads: waitlist capture (name + email, no verification) — server-written
-- =====================================================================
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text,
  email       text not null
);
alter table public.leads enable row level security;
-- Writes happen server-side via the service role; no public policies needed.

-- Helpful indexes
create index if not exists sessions_user_idx   on public.sessions (user_id, created_at desc);
create index if not exists feedback_session_idx on public.feedback (session_id);
create index if not exists audiences_user_idx   on public.audiences (user_id, created_at desc);
create index if not exists leads_email_idx       on public.leads (email);
