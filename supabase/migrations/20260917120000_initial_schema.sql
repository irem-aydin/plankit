-- =====================================================================
-- PlanKit — başlangıç şeması
-- categories → subcategories → output_templates (içerik kataloğu)
-- users (auth.users ile 1-1), generated_outputs, user_selections
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enum tipleri
-- ---------------------------------------------------------------------
create type public.output_type as enum ('template', 'checklist', 'guide');
create type public.subscription_status as enum ('trial', 'active', 'expired');

-- ---------------------------------------------------------------------
-- Ortak: updated_at tetikleyicisi
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- subcategories
-- ---------------------------------------------------------------------
create table public.subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  output_type public.output_type not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (category_id, slug)
);

create index subcategories_category_id_idx on public.subcategories (category_id);

-- ---------------------------------------------------------------------
-- output_templates
-- content JSON'unun şekli subcategory.output_type'a göre değişir
-- (bkz. src/core/content-schema.ts). Bir alt başlığın birden fazla
-- versiyonu olabilir; aynı anda yalnızca biri aktiftir.
-- ---------------------------------------------------------------------
create table public.output_templates (
  id             uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references public.subcategories (id) on delete cascade,
  version        int  not null default 1,
  is_active      boolean not null default true,
  content        jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (subcategory_id, version)
);

create unique index output_templates_one_active_per_subcategory
  on public.output_templates (subcategory_id)
  where is_active;

create trigger output_templates_set_updated_at
  before update on public.output_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- users (auth.users ile 1-1 profil + abonelik durumu)
-- ---------------------------------------------------------------------
create table public.users (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   text,
  subscription_status     public.subscription_status not null default 'trial',
  trial_started_at        timestamptz not null default now(),
  trial_limit_used        int not null default 0 check (trial_limit_used >= 0),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Yeni kayıt olan her kullanıcı için otomatik profil + deneme başlat
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- generated_outputs — üretilen (ve kullanıcının düzenlediği) çıktılar
-- ---------------------------------------------------------------------
create table public.generated_outputs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  title       text not null,
  document    jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index generated_outputs_user_id_idx on public.generated_outputs (user_id, created_at desc);

create trigger generated_outputs_set_updated_at
  before update on public.generated_outputs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_selections — raporlama için: hangi üretimde hangi alt başlık seçildi
-- ---------------------------------------------------------------------
create table public.user_selections (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  output_id      uuid references public.generated_outputs (id) on delete set null,
  category_id    uuid not null references public.categories (id) on delete cascade,
  subcategory_id uuid not null references public.subcategories (id) on delete cascade,
  created_at     timestamptz not null default now()
);

create index user_selections_user_id_idx on public.user_selections (user_id);
create index user_selections_subcategory_id_idx on public.user_selections (subcategory_id);

-- ---------------------------------------------------------------------
-- Deneme hakkını atomik olarak tüketen fonksiyon.
-- Eşzamanlı isteklerde limitin aşılmasını engeller. Yalnızca sunucu
-- (service role) tarafından çağrılır.
--   'active'  → her zaman izin verir, sayaç artmaz
--   'trial'   → trial_limit_used < p_limit ise 1 artırır; limite
--               ulaşınca durumu 'expired' yapar
--   'expired' → izin vermez
-- ---------------------------------------------------------------------
create or replace function public.consume_generation_credit(p_user_id uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.subscription_status;
begin
  select subscription_status into v_status
  from public.users
  where id = p_user_id
  for update;

  if v_status is null then
    return false;
  end if;

  if v_status = 'active' then
    return true;
  end if;

  update public.users
  set trial_limit_used = trial_limit_used + 1,
      subscription_status = case
        when trial_limit_used + 1 >= p_limit then 'expired'::public.subscription_status
        else subscription_status
      end
  where id = p_user_id
    and subscription_status = 'trial'
    and trial_limit_used < p_limit;

  return found;
end;
$$;

revoke all on function public.consume_generation_credit(uuid, int) from public, anon, authenticated;
grant execute on function public.consume_generation_credit(uuid, int) to service_role;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.categories        enable row level security;
alter table public.subcategories     enable row level security;
alter table public.output_templates  enable row level security;
alter table public.users             enable row level security;
alter table public.generated_outputs enable row level security;
alter table public.user_selections   enable row level security;

-- Katalog başlıkları herkese açık (ücretli içerik değil)
create policy "categories are public"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "subcategories are public"
  on public.subcategories for select
  to anon, authenticated
  using (true);

-- output_templates: istemciye politika YOK. İçerik yalnızca sunucudaki
-- çıktı üretim servisi (service role) üzerinden, hak kontrolünden sonra okunur.

-- users: kullanıcı yalnızca kendi satırını okuyabilir. Güncelleme
-- (abonelik durumu vb.) yalnızca service role ile yapılır.
create policy "users can read own profile"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);

-- generated_outputs: kendi çıktısını okuyabilir ve düzenleyebilir
create policy "users can read own outputs"
  on public.generated_outputs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can update own outputs"
  on public.generated_outputs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users can delete own outputs"
  on public.generated_outputs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_selections: yalnızca okuma (yazma sunucuda)
create policy "users can read own selections"
  on public.user_selections for select
  to authenticated
  using ((select auth.uid()) = user_id);
