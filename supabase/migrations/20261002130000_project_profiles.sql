-- =====================================================================
-- Proje ↔ profil bağlantısı: bir proje (isteğe bağlı) bir profile aittir,
-- bir profilin birden çok projesi olabilir.
--
-- Profil silinince projeler silinmez, yalnızca profilsiz kalır.
-- =====================================================================

alter table public.projects
  add column profile_id uuid references public.context_profiles (id) on delete set null;

create index projects_profile_id_idx on public.projects (profile_id);

-- Kullanıcı projesini yalnızca kendi profiline bağlayabilir.
drop policy "own projects: insert" on public.projects;
drop policy "own projects: update" on public.projects;

create policy "own projects: insert" on public.projects
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      profile_id is null
      or exists (
        select 1 from public.context_profiles p
        where p.id = profile_id and p.user_id = (select auth.uid())
      )
    )
  );
create policy "own projects: update" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      profile_id is null
      or exists (
        select 1 from public.context_profiles p
        where p.id = profile_id and p.user_id = (select auth.uid())
      )
    )
  );
