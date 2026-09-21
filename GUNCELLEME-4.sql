-- PlanKit — GÜNCELLEME 4: Plandaki kararların hafızaya kaydedilmesi
-- Tamamını kopyalayıp Supabase > SQL Editor'e yapıştırın ve Run'a basın.

-- =====================================================================
-- Hafıza kayıtlarına yeni kaynak: plandan çıkarılan kararlar.
-- Böylece sonraki planlar önceki kararlarla (bütçe dağılımı, tarihler,
-- eşikler) çelişmez.
-- =====================================================================

alter table public.profile_memories
  drop constraint if exists profile_memories_source_check;

alter table public.profile_memories
  add constraint profile_memories_source_check
  check (source in ('manual', 'plan_answer', 'decision'));
