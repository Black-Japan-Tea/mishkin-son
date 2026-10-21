-- 0001_tables.sql — схема mishkin-son (план §10)
-- Время хранится в UTC (timestamptz); updated_at ведёт клиент — нужен для LWW-синка.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  birth_date date not null,
  sex text,
  birth_weight_g numeric,
  birth_height_cm numeric,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists children_family_idx on public.children (family_id);

create table if not exists public.events (
  id uuid primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,
  type text not null check (type in ('sleep','feed_breast','feed_bottle','feed_solid','feed_water','diaper')),
  started_at timestamptz not null,
  ended_at timestamptz,
  parent_event_id uuid references public.events(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists events_family_updated_idx on public.events (family_id, updated_at);
create index if not exists events_child_start_idx on public.events (child_id, started_at);

create table if not exists public.measurements (
  id uuid primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  type text not null check (type in ('weight','height','head')),
  value numeric not null,
  measured_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists measurements_child_idx on public.measurements (child_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_mode text not null default 'system' check (theme_mode in ('light','dark','system','schedule')),
  theme_schedule_start text not null default '22:00',
  theme_schedule_end text not null default '07:00',
  last_child_id uuid references public.children(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Проверка членства, безопасная для использования в RLS-политиках:
-- security definer обходит RLS на family_members и не даёт бесконечной рекурсии.
create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family_id and m.user_id = auth.uid()
  );
$$;
