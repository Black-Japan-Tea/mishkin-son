-- 0002_rls.sql — доступ только участникам семьи (план §14)
-- Все проверки через public.is_family_member (security definer, 0001) — без рекурсии политик.

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.children enable row level security;
alter table public.events enable row level security;
alter table public.measurements enable row level security;
alter table public.user_settings enable row level security;

-- Профили: читать может любой аутентифицированный (нужны имена участников), писать — только себя.
create policy "profiles select authenticated"
  on public.profiles for select to authenticated using (true);
create policy "profiles upsert self"
  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update self"
  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

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

create policy "user_settings self all"
  on public.user_settings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
