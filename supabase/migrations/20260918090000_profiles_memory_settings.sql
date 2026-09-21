-- =====================================================================
-- Profiller (bellek), profil hafızası ve kullanıcı tercihleri
-- =====================================================================

-- ---------------------------------------------------------------------
-- context_profiles: kullanıcının tekrar tekrar kullandığı bağlamlar
-- (ör. "İş yerim - X A.Ş.", "Kişisel kariyerim")
-- ---------------------------------------------------------------------
create table public.context_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  kind       text not null check (kind in ('work', 'personal')),
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index context_profiles_user_id_idx on public.context_profiles (user_id, created_at);

create trigger context_profiles_set_updated_at
  before update on public.context_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- profile_memories: profile ait, zamanla öğrenilen bilgiler
-- ---------------------------------------------------------------------
create table public.profile_memories (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.context_profiles (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  source     text not null default 'manual' check (source in ('manual', 'plan_answer')),
  created_at timestamptz not null default now()
);

create index profile_memories_profile_id_idx on public.profile_memories (profile_id, created_at);

-- ---------------------------------------------------------------------
-- user_preferences: ayarlar
-- ---------------------------------------------------------------------
create table public.user_preferences (
  user_id                 uuid primary key references public.users (id) on delete cascade,
  display_name            text check (char_length(display_name) <= 80),
  personalization_enabled boolean not null default true,
  auto_remember           boolean not null default true,
  default_detail          text not null default 'summary' check (default_detail in ('summary', 'detailed')),
  default_profile_id      uuid references public.context_profiles (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- Mevcut kullanıcılar için tercih satırı
insert into public.user_preferences (user_id)
select id from public.users
on conflict (user_id) do nothing;

-- Yeni kayıtlarda profil + tercih satırı birlikte açılır
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- E-posta değiştiğinde public.users senkron kalsın
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_change();

-- Çıktıların hangi profil için üretildiği
alter table public.generated_outputs
  add column profile_id uuid references public.context_profiles (id) on delete set null;

-- =====================================================================
-- Row Level Security — her kullanıcı yalnızca kendi verisine erişir
-- =====================================================================
alter table public.context_profiles enable row level security;
alter table public.profile_memories enable row level security;
alter table public.user_preferences enable row level security;

create policy "own profiles: select" on public.context_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profiles: insert" on public.context_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profiles: update" on public.context_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profiles: delete" on public.context_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own memories: select" on public.profile_memories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own memories: insert" on public.profile_memories
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.context_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );
create policy "own memories: delete" on public.profile_memories
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own preferences: select" on public.user_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own preferences: update" on public.user_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      default_profile_id is null
      or exists (
        select 1 from public.context_profiles p
        where p.id = default_profile_id and p.user_id = (select auth.uid())
      )
    )
  );
