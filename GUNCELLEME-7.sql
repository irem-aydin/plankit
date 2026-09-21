-- PlanKit — GÜNCELLEME 7: Plan paylaşım bağlantısı
-- Tamamını kopyalayıp Supabase > SQL Editor'e yapıştırın ve Run'a basın.

-- =====================================================================
-- Plan paylaşım bağlantısı: kullanıcı planı için tahmin edilemez bir
-- bağlantı oluşturur; bağlantıyı bilen herkes planı salt okunur görür.
--
-- Paylaşılan planlar herkese açık bir RLS politikasıyla AÇILMAZ; sunucu
-- (service role) planı yalnızca doğru bağlantı anahtarıyla okur. Paylaşım
-- kapatılınca anahtar silinir ve eski bağlantı çalışmaz.
-- =====================================================================

alter table public.generated_outputs
  add column share_token text unique check (char_length(share_token) between 20 and 64),
  add column shared_at   timestamptz,
  add column share_views integer not null default 0 check (share_views >= 0);

-- "Düzenlendi" tarihi yalnızca içerik değişince güncellensin; paylaşımı
-- açıp kapatmak veya görüntülenme sayısı planı "düzenlenmiş" göstermesin.
drop trigger if exists generated_outputs_set_updated_at on public.generated_outputs;
create trigger generated_outputs_set_updated_at
  before update on public.generated_outputs
  for each row
  when (old.title is distinct from new.title or old.document is distinct from new.document)
  execute function public.set_updated_at();

-- Görüntülenme sayacı: atomik artış, yalnızca sunucu çağırır.
create or replace function public.record_share_view(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.generated_outputs
     set share_views = share_views + 1
   where share_token = p_token;
$$;

revoke all on function public.record_share_view(text) from public, anon, authenticated;
grant execute on function public.record_share_view(text) to service_role;
