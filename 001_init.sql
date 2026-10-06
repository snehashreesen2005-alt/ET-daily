create extension if not exists "pgcrypto";

create table if not exists public.editorials (
  id           uuid primary key default gen_random_uuid(),
  publish_date date not null,
  slot         integer not null check (slot between 1 and 3),
  headline     text not null,
  author       text not null default 'Economic Times',
  source_url   text not null,
  full_text    text not null,
  overview     text not null,
  takeaways    jsonb not null default '[]'::jsonb,
  implication  text not null,
  created_at   timestamptz not null default now(),
  unique (publish_date, slot)
);
create index if not exists editorials_publish_date_idx on public.editorials (publish_date desc);

create table if not exists public.pipeline_runs (
  id              uuid primary key default gen_random_uuid(),
  run_date        date not null,
  status          text not null check (status in ('running','completed','failed')),
  articles_saved  integer not null default 0,
  error           text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);
create index if not exists pipeline_runs_started_idx on public.pipeline_runs (started_at desc);

alter table public.editorials enable row level security;
alter table public.pipeline_runs enable row level security;
-- Public may read editorials; pipeline_runs is reachable only via the service role.
drop policy if exists "public read editorials" on public.editorials;
create policy "public read editorials" on public.editorials for select using (true);
