-- =====================================================================
-- Geri bildirim kutusu: kullanıcıların öneri, şikâyet ve hata bildirimleri.
-- Kullanıcı yalnızca kendi kayıtlarını ekleyip görebilir; tüm kayıtlar
-- Supabase > Table Editor > feedback tablosundan okunur.
-- Hesap silinince kullanıcının geri bildirimleri de silinir (KVKK).
-- =====================================================================

create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  kind        text not null check (kind in ('suggestion', 'complaint', 'bug', 'other')),
  message     text not null check (char_length(message) between 5 and 3000),
  page        text check (char_length(page) <= 300),
  -- Kullanıcı dönüş yapılmasını istediyse, iletişim için e-postası
  reply_email text check (char_length(reply_email) <= 320),
  status      text not null default 'new' check (status in ('new', 'in_review', 'resolved')),
  created_at  timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_user_id_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

create policy "users can insert own feedback"
  on public.feedback for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'new');

create policy "users can read own feedback"
  on public.feedback for select
  to authenticated
  using ((select auth.uid()) = user_id);
