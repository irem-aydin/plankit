-- =====================================================================
-- Abonelik planları ve aylık kredi kotası (maliyet koruması).
--
--   free     : deneme (trial_limit_used ile sayılır)
--   starter  : Başlangıç — aylık kredi
--   pro      : Profesyonel — aylık kredi
--   internal : işletme sahibi/test hesapları — kota yok (hız sınırları yine geçerli)
--
-- Krediler aylık pencerede sayılır; pencere credits_period_start'tan
-- itibaren her ay kendiliğinden yenilenir (yıllık abonelikte de aylık kota).
-- =====================================================================

alter table public.users
  add column plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'internal')),
  add column credits_used integer not null default 0 check (credits_used >= 0),
  add column credits_period_start timestamptz not null default now();

-- Stripe bağlanmadan önce elle aktif edilmiş hesaplar (işletme sahibi) kotasız kalır.
update public.users set plan = 'internal' where subscription_status = 'active' and stripe_subscription_id is null;
update public.users set plan = 'pro' where subscription_status = 'active' and stripe_subscription_id is not null;

/**
 * Kullanım hakkını atomik olarak düşer.
 *   trial  : p_cost yok sayılır; plan sayısı p_trial_limit'e ulaşınca hesap 'expired' olur
 *   active : aylık pencerede credits_used + p_cost <= p_monthly_limit ise düşer
 *            (internal planda sınır yoktur)
 * Hak yoksa hiçbir şeyi değiştirmeden false döner.
 */
create or replace function public.consume_credits(
  p_user_id uuid,
  p_cost int,
  p_trial_limit int,
  p_monthly_limit int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.subscription_status;
  v_plan text;
  v_trial_used int;
  v_used int;
  v_start timestamptz;
begin
  if p_cost < 1 then
    return false;
  end if;

  select subscription_status, plan, trial_limit_used, credits_used, credits_period_start
    into v_status, v_plan, v_trial_used, v_used, v_start
    from public.users
   where id = p_user_id
     for update;

  if not found then
    return false;
  end if;

  if v_status = 'trial' then
    if v_trial_used >= p_trial_limit then
      update public.users set subscription_status = 'expired' where id = p_user_id;
      return false;
    end if;
    update public.users
       set trial_limit_used = trial_limit_used + 1,
           subscription_status = case when trial_limit_used + 1 >= p_trial_limit then 'expired'::public.subscription_status else subscription_status end
     where id = p_user_id;
    return true;
  end if;

  if v_status <> 'active' then
    return false;
  end if;

  if v_plan = 'internal' then
    return true;
  end if;

  -- Aylık pencere dolduysa pencereyi ileri al ve sayacı sıfırla.
  while v_start + interval '1 month' <= now() loop
    v_start := v_start + interval '1 month';
    v_used := 0;
  end loop;

  if v_used + p_cost > p_monthly_limit then
    update public.users set credits_used = v_used, credits_period_start = v_start where id = p_user_id;
    return false;
  end if;

  update public.users
     set credits_used = v_used + p_cost,
         credits_period_start = v_start
   where id = p_user_id;
  return true;
end;
$$;

revoke all on function public.consume_credits(uuid, int, int, int) from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, int, int, int) to service_role;

-- Hız sınırları için: kullanıcının son işleri ve günlük toplam hızlı sayılsın.
create index if not exists generation_jobs_created_idx on public.generation_jobs (created_at desc);
