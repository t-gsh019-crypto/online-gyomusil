-- 1-2. 공지 수정 기록 + 댓글 테이블 (01_notice.sql 다음에 실행)
alter table notices add column if not exists updated_at timestamptz;

create table if not exists notice_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  notice_id uuid not null references notices(id) on delete cascade,
  body text not null,
  author text not null,
  author_group text
);

alter table notice_comments enable row level security;
-- 로그인 기능을 붙이기 전 임시 규칙: 웹앱에서 읽고 쓸 수 있게 허용
create policy "notice_comments all" on notice_comments for all using (true) with check (true);

alter publication supabase_realtime add table notice_comments;
