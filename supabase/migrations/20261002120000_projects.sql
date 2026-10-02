-- =====================================================================
-- Projeler: kullanıcı planlarını proje bazında gruplar
-- (ör. "Yeni şube açılışı", "2027 bütçe çalışması").
--
-- Bir plan en fazla bir projeye aittir. Proje silinince planlar silinmez,
-- yalnızca projesiz kalır.
-- =====================================================================

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id, created_at);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.generated_outputs
  add column project_id uuid references public.projects (id) on delete set null;

create index generated_outputs_project_id_idx on public.generated_outputs (project_id);

-- =====================================================================
-- Row Level Security — her kullanıcı yalnızca kendi projelerine erişir
-- =====================================================================
alter table public.projects enable row level security;

create policy "own projects: select" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own projects: insert" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own projects: update" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own projects: delete" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Kullanıcı planını yalnızca kendi projesine taşıyabilir.
drop policy "users can update own outputs" on public.generated_outputs;
create policy "users can update own outputs"
  on public.generated_outputs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.user_id = (select auth.uid())
      )
    )
  );
