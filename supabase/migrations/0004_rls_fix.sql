-- 0004_rls_fix.sql — исправление бесконечной рекурсии в RLS-политиках.
-- Проблема: политики family_members/children/events запрашивали family_members
-- изнутри собственной политики → PostgREST отвечал 500
-- ("infinite recursion detected in policy").
-- Решение: все проверки через security definer-функцию is_family_member,
-- которая обходит RLS и рекурсии не порождает.
-- Функция уже существует (0003). Для свежих установок она создаётся в 0001.

drop policy if exists "families select member" on public.families;
drop policy if exists "family_members select own" on public.family_members;
drop policy if exists "family_invites select member" on public.family_invites;
drop policy if exists "children member all" on public.children;
drop policy if exists "events member all" on public.events;
drop policy if exists "measurements member all" on public.measurements;

create policy "families select member"
  on public.families for select to authenticated
  using (public.is_family_member(families.id));

create policy "family_members select own"
  on public.family_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_family_member(family_members.family_id)
  );

create policy "family_invites select member"
  on public.family_invites for select to authenticated
  using (public.is_family_member(family_invites.family_id));

create policy "children member all"
  on public.children for all to authenticated
  using (public.is_family_member(children.family_id))
  with check (public.is_family_member(children.family_id));

create policy "events member all"
  on public.events for all to authenticated
  using (public.is_family_member(events.family_id))
  with check (public.is_family_member(events.family_id));

create policy "measurements member all"
  on public.measurements for all to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = measurements.child_id and public.is_family_member(c.family_id)
  ))
  with check (exists (
    select 1 from public.children c
    where c.id = measurements.child_id and public.is_family_member(c.family_id)
  ));
