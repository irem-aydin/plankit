-- PlanKit — GÜNCELLEME 8: Kayıt olmadan önizleme kotası
-- Tamamını kopyalayıp Supabase > SQL Editor'e yapıştırın ve Run'a basın.

-- =====================================================================
-- Kayıtsız canlı deneme için kota: ziyaretçi başına ve site geneli günlük
-- sınır. Ziyaretçi yalnızca IP adresinin geri çevrilemez özetiyle (hash)
-- tanınır; yazdığı metin saklanmaz. Kayıtlar 2 gün sonra silinir.
-- Tablo yalnızca sunucu (service role) tarafından kullanılır.
-- =====================================================================

create table public.preview_quota (
  bucket text primary key check (char_length(bucket) <= 200),
  day    date not null default current_date,
  used   integer not null default 0 check (used >= 0)
);

alter table public.preview_quota enable row level security;
-- Politika yok: istemci (anon/authenticated) hiçbir satırı göremez veya yazamaz.

/**
 * Hak varsa ziyaretçinin ve sitenin sayacını bir artırıp true döner;
 * sınır dolduysa hiçbir şeyi değiştirmeden false döner. Atomiktir.
 */
create or replace function public.consume_preview_quota(p_visitor text, p_per_visitor int, p_global int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_global  text := 'global:' || current_date;
  v_visitor text := 'visitor:' || p_visitor || ':' || current_date;
  v_global_used  int;
  v_visitor_used int;
begin
  delete from public.preview_quota where day < current_date - 1;

  insert into public.preview_quota (bucket) values (v_global), (v_visitor)
  on conflict (bucket) do nothing;

  select used into v_global_used from public.preview_quota where bucket = v_global for update;
  select used into v_visitor_used from public.preview_quota where bucket = v_visitor for update;

  if v_global_used >= p_global or v_visitor_used >= p_per_visitor then
    return false;
  end if;

  update public.preview_quota set used = used + 1 where bucket in (v_global, v_visitor);
  return true;
end;
$$;

revoke all on function public.consume_preview_quota(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_preview_quota(text, int, int) to service_role;
