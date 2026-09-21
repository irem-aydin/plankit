-- =====================================================================
-- Tek seferlik kredi paketi (abonelik gerektirmez, süre sınırı yok).
--
-- pack_credits: satın alınan, henüz harcanmamış paket kredisi.
-- Harcama sırası: deneme hakkı → bu ayki abonelik kredisi → paket kredisi.
-- credit_purchases: her ödeme bir kez işlenir (webhook tekrarlarına karşı).
-- =====================================================================

alter table public.users
  add column pack_credits integer not null default 0 check (pack_credits >= 0);

create table public.credit_purchases (
  id text primary key,                -- Stripe Checkout oturum kimliği
  user_id uuid not null references public.users (id) on delete cascade,
  credits integer not null check (credits > 0),
  amount_total integer,               -- kuruş cinsinden
  currency text,
  created_at timestamptz not null default now()
);

create index credit_purchases_user_idx on public.credit_purchases (user_id, created_at desc);

-- Yalnızca sunucu (service role) yazar/okur.
alter table public.credit_purchases enable row level security;

/**
 * Ödemesi alınan paketin kredisini ekler. Aynı ödeme ikinci kez gelirse
 * hiçbir şey yapmaz ve false döner.
 */
create or replace function public.add_pack_credits(
  p_user_id uuid,
  p_purchase_id text,
  p_credits int,
  p_amount_total int,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_credits < 1 then
    return false;
  end if;

  insert into public.credit_purchases (id, user_id, credits, amount_total, currency)
  values (p_purchase_id, p_user_id, p_credits, p_amount_total, p_currency)
  on conflict (id) do nothing;

  if not found then
    return false;
  end if;

  update public.users set pack_credits = pack_credits + p_credits where id = p_user_id;
  return true;
end;
$$;

revoke all on function public.add_pack_credits(uuid, text, int, int, text) from public, anon, authenticated;
grant execute on function public.add_pack_credits(uuid, text, int, int, text) to service_role;

/**
 * Kullanım hakkını atomik olarak düşer.
 *   trial  : hakkı varsa 1 plan düşer (p_cost yok sayılır); hak bitince 'expired' olur
 *   active : internal planda sınır yok; ücretli planda önce bu ayki kredi, yetmezse paket kredisi
 *   diğer  : yalnızca paket kredisi
 * Yetmezse hiçbir krediyi değiştirmeden false döner.
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
  v_pack int;
  v_monthly_available int := 0;
  v_from_monthly int;
begin
  if p_cost < 1 then
    return false;
  end if;

  select subscription_status, plan, trial_limit_used, credits_used, credits_period_start, pack_credits
    into v_status, v_plan, v_trial_used, v_used, v_start, v_pack
    from public.users
   where id = p_user_id
     for update;

  if not found then
    return false;
  end if;

  if v_status = 'trial' then
    if v_trial_used < p_trial_limit then
      update public.users
         set trial_limit_used = trial_limit_used + 1,
             subscription_status = case when trial_limit_used + 1 >= p_trial_limit then 'expired'::public.subscription_status else subscription_status end
       where id = p_user_id;
      return true;
    end if;
    update public.users set subscription_status = 'expired' where id = p_user_id;
  end if;

  if v_status = 'active' then
    if v_plan = 'internal' then
      return true;
    end if;

    -- Aylık pencere dolduysa pencereyi ileri al ve sayacı sıfırla.
    while v_start + interval '1 month' <= now() loop
      v_start := v_start + interval '1 month';
      v_used := 0;
    end loop;
    v_monthly_available := greatest(0, p_monthly_limit - v_used);
  end if;

  if v_monthly_available + v_pack < p_cost then
    if v_status = 'active' then
      update public.users set credits_used = v_used, credits_period_start = v_start where id = p_user_id;
    end if;
    return false;
  end if;

  v_from_monthly := least(p_cost, v_monthly_available);
  update public.users
     set credits_used = case when v_status = 'active' then v_used + v_from_monthly else credits_used end,
         credits_period_start = case when v_status = 'active' then v_start else credits_period_start end,
         pack_credits = v_pack - (p_cost - v_from_monthly)
   where id = p_user_id;
  return true;
end;
$$;

revoke all on function public.consume_credits(uuid, int, int, int) from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, int, int, int) to service_role;
