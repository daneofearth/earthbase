-- Globe presets.
--
-- Run this once in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/mbusushrqylezifgynan/sql
--
-- Note the column is `config`, not `values` — VALUES is a SQL keyword and a
-- column of that name has to be quoted at every single use site.

create table if not exists earth_presets (
  slug     text primary key,
  name     text not null,
  config   jsonb not null,
  saved_at timestamptz not null default now()
);

-- Which preset the public site renders. A one-row table rather than an
-- is_active flag on earth_presets: "exactly one active" is then enforced by the
-- primary key instead of by application code remembering to clear the old one.
create table if not exists earth_active (
  id   smallint primary key default 1 check (id = 1),
  slug text references earth_presets (slug) on delete set null
);

insert into earth_active (id, slug) values (1, null)
  on conflict (id) do nothing;

-- RLS on, and deliberately no policies at all.
--
-- That denies every request carrying the anon or authenticated key, which is
-- the intent: these tables decide what the public site looks like, so nothing
-- reaching Supabase straight from a browser should be able to read or change
-- them. The server uses the service-role key, which bypasses RLS, and the
-- tuner's own password gate is what stands in front of that.
alter table earth_presets enable row level security;
alter table earth_active  enable row level security;
