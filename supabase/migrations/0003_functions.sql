-- 0003_functions.sql — триггер профиля, семьи/инвайты, push-RPC с LWW (план §8, §10)
-- LWW: сервер не перезапишет строку, если пришедшая updated_at старее существующей.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

create or replace function public.create_family(p_name text)
returns public.families
language plpgsql
security definer set search_path = public
as $$
declare
  f public.families;
begin
  if exists (
    select 1 from public.family_members where user_id = auth.uid()
  ) then
    raise exception 'Пользователь уже состоит в семье';
  end if;
  insert into public.families (name, created_by)
  values (p_name, auth.uid()) returning * into f;
  insert into public.family_members (family_id, user_id) values (f.id, auth.uid());
  return f;
end;
$$;

create or replace function public.join_family(p_code text)
returns public.families
language plpgsql
security definer set search_path = public
as $$
declare
  inv public.family_invites;
  f public.families;
begin
  select * into inv from public.family_invites
  where code = upper(p_code) and expires_at > now()
  order by created_at desc limit 1;
  if inv.id is null then
    raise exception 'Код не найден или истёк';
  end if;
  if exists (
    select 1 from public.family_members
    where family_id = inv.family_id and user_id = auth.uid()
  ) then
    select * into f from public.families where id = inv.family_id;
    return f;
  end if;
  insert into public.family_members (family_id, user_id) values (inv.family_id, auth.uid());
  select * into f from public.families where id = inv.family_id;
  return f;
end;
$$;

create or replace function public.create_invite(p_family_id uuid)
returns table (code text)
language plpgsql
security definer set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'Нет доступа к семье';
  end if;
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.family_invites (family_id, code, created_by, expires_at)
  values (p_family_id, new_code, auth.uid(), now() + interval '24 hours');
  return query select new_code;
end;
$$;

create or replace function public.my_family()
returns public.families
language sql
security definer set search_path = public
stable
as $$
  select f.* from public.families f
  join public.family_members m on m.family_id = f.id
  where m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.my_family_members()
returns table (family_id uuid, user_id uuid, joined_at timestamptz, display_name text, email text)
language sql
security definer set search_path = public
stable
as $$
  select m.family_id, m.user_id, m.joined_at, p.display_name, p.email
  from public.family_members m
  join public.profiles p on p.id = m.user_id
  where m.family_id in (
    select family_id from public.family_members where user_id = auth.uid()
  );
$$;

-- Push: идемпотентные LWW-upserts. Доступ проверяем по child -> family.
create or replace function public.push_events(p_rows jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    if not exists (
      select 1 from public.children c
      join public.family_members m on m.family_id = c.family_id
      where c.id = (r->>'child_id')::uuid and m.user_id = auth.uid()
    ) then
      raise exception 'Нет доступа к ребёнку %', r->>'child_id';
    end if;
    insert into public.events (
      id, child_id, family_id, created_by, type, started_at, ended_at,
      parent_event_id, details, created_at, updated_at, deleted_at
    ) values (
      (r->>'id')::uuid,
      (r->>'child_id')::uuid,
      (r->>'family_id')::uuid,
      (r->>'created_by')::uuid,
      r->>'type',
      (r->>'started_at')::timestamptz,
      (r->>'ended_at')::timestamptz,
      (r->>'parent_event_id')::uuid,
      coalesce(r->'details', '{}'::jsonb),
      (r->>'created_at')::timestamptz,
      (r->>'updated_at')::timestamptz,
      (r->>'deleted_at')::timestamptz
    )
    on conflict (id) do update set
      started_at = excluded.started_at,
      ended_at = excluded.ended_at,
      parent_event_id = excluded.parent_event_id,
      details = excluded.details,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    where public.events.updated_at < excluded.updated_at;
  end loop;
end;
$$;

create or replace function public.push_children(p_rows jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    if not public.is_family_member((r->>'family_id')::uuid) then
      raise exception 'Нет доступа к семье %', r->>'family_id';
    end if;
    insert into public.children (
      id, family_id, name, birth_date, sex, birth_weight_g, birth_height_cm,
      avatar_url, created_at, updated_at, deleted_at
    ) values (
      (r->>'id')::uuid,
      (r->>'family_id')::uuid,
      r->>'name',
      (r->>'birth_date')::date,
      r->>'sex',
      (r->>'birth_weight_g')::numeric,
      (r->>'birth_height_cm')::numeric,
      r->>'avatar_url',
      (r->>'created_at')::timestamptz,
      (r->>'updated_at')::timestamptz,
      (r->>'deleted_at')::timestamptz
    )
    on conflict (id) do update set
      name = excluded.name,
      birth_date = excluded.birth_date,
      sex = excluded.sex,
      birth_weight_g = excluded.birth_weight_g,
      birth_height_cm = excluded.birth_height_cm,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    where public.children.updated_at < excluded.updated_at;
  end loop;
end;
$$;

create or replace function public.push_measurements(p_rows jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    if not exists (
      select 1 from public.children c
      join public.family_members m on m.family_id = c.family_id
      where c.id = (r->>'child_id')::uuid and m.user_id = auth.uid()
    ) then
      raise exception 'Нет доступа к ребёнку %', r->>'child_id';
    end if;
    insert into public.measurements (
      id, child_id, type, value, measured_at, created_at, updated_at, deleted_at
    ) values (
      (r->>'id')::uuid,
      (r->>'child_id')::uuid,
      r->>'type',
      (r->>'value')::numeric,
      (r->>'measured_at')::timestamptz,
      (r->>'created_at')::timestamptz,
      (r->>'updated_at')::timestamptz,
      (r->>'deleted_at')::timestamptz
    )
    on conflict (id) do update set
      type = excluded.type,
      value = excluded.value,
      measured_at = excluded.measured_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    where public.measurements.updated_at < excluded.updated_at;
  end loop;
end;
$$;

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.my_family() to authenticated;
grant execute on function public.my_family_members() to authenticated;
grant execute on function public.push_events(jsonb) to authenticated;
grant execute on function public.push_children(jsonb) to authenticated;
grant execute on function public.push_measurements(jsonb) to authenticated;
