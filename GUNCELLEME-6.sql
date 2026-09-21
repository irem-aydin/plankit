-- PlanKit — GÜNCELLEME 6: Arka plan üretimi (planlar sayfa kapansa da hazırlanır)
-- Tamamını kopyalayıp Supabase > SQL Editor'e yapıştırın ve Run'a basın.

-- =====================================================================
-- Arka plan üretimi: plan üretimi ve güncellemesi bir "iş" (job) olarak
-- kaydedilir ve istek yanıtlandıktan sonra sunucuda çalışır. Kullanıcı
-- sayfayı kapatsa ya da bağlantısı kopsa bile plan hazırlanmaya devam eder.
--
-- Kullanıcı yalnızca kendi işlerini okuyabilir; oluşturma ve güncelleme
-- yalnızca sunucu (service role) tarafından yapılır.
-- =====================================================================

create table public.generation_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  kind        text not null check (kind in ('generate', 'refine')),
  status      text not null default 'queued'
              check (status in ('queued', 'running', 'succeeded', 'failed')),
  -- Kullanıcıya gösterilen kısa ad (ör. "Strateji Analizi")
  title       text not null check (char_length(title) <= 200),
  -- Son ilerleme mesajı (ör. "1 / 2 bölüm hazır")
  progress    text check (char_length(progress) <= 300),
  -- Üretimde: oluşan plan; güncellemede: güncellenen plan
  output_id   uuid references public.generated_outputs (id) on delete cascade,
  -- Kullanıcıya gösterilebilir hata mesajı (teknik ayrıntı içermez)
  error       text check (char_length(error) <= 500),
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  updated_at  timestamptz not null default now()
);

create index generation_jobs_user_created_idx on public.generation_jobs (user_id, created_at desc);
create index generation_jobs_active_idx on public.generation_jobs (user_id)
  where status in ('queued', 'running');

create trigger generation_jobs_set_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

alter table public.generation_jobs enable row level security;

create policy "users can read own jobs"
  on public.generation_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);
