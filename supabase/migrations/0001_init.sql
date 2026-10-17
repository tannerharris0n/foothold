-- Foothold schema. Apply with `supabase db push` or paste into the SQL editor.
-- The app talks to these tables with the service role key from the server only,
-- so RLS is enabled with no public policies: nothing is reachable with the anon key.

create table if not exists products (
  id uuid primary key,
  url text not null,
  name text not null,
  stage text not null check (stage in ('exploring','building','built_no_users','selling','other')),
  email text,
  one_liner text,
  voice text,
  status text not null default 'new' check (status in ('new','auditing','ready','error')),
  error text,
  created_at timestamptz not null default now()
);

-- One structured document per product for each of these. Stored as jsonb
-- because they are read and written whole, never queried field by field.
create table if not exists snapshots (
  product_id uuid primary key references products(id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists audits (
  product_id uuid primary key references products(id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists audiences (
  product_id uuid primary key references products(id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists roadmaps (
  product_id uuid primary key references products(id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists moves (
  id uuid primary key,
  product_id uuid not null references products(id) on delete cascade,
  date date not null,
  type text not null check (type in ('reply','post','fix','outreach','content','setup')),
  channel text not null,
  title text not null,
  why text not null,
  draft text not null,
  target_url text,
  effort_minutes int not null default 10,
  status text not null default 'pending' check (status in ('pending','approved','done','skipped')),
  playbook_id text,
  source text not null default 'model' check (source in ('model','seed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists moves_product_date on moves (product_id, date desc);

create table if not exists events (
  id uuid primary key,
  product_id uuid not null references products(id) on delete cascade,
  step text not null check (step in ('visit','signup','paywall','payment')),
  anon_id text,
  ref text,
  ts timestamptz not null default now()
);
create index if not exists events_product_ts on events (product_id, ts desc);

alter table products enable row level security;
alter table snapshots enable row level security;
alter table audits enable row level security;
alter table audiences enable row level security;
alter table roadmaps enable row level security;
alter table moves enable row level security;
alter table events enable row level security;

-- Keep updated_at honest on the jsonb doc tables.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['snapshots','audits','audiences','roadmaps','moves'] loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;
