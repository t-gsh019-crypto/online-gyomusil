-- 1. 공지·업무 전달 게시판 테이블
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  target text not null default '전체',
  link text,
  pinned boolean not null default false,
  author text not null,
  author_group text
);

create table if not exists notice_reads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  notice_id uuid not null references notices(id) on delete cascade,
  reader text not null,
  reader_group text,
  unique (notice_id, reader)
);

alter table notices enable row level security;
alter table notice_reads enable row level security;
-- 로그인 기능을 붙이기 전 임시 규칙: 웹앱에서 읽고 쓸 수 있게 허용
create policy "notices all" on notices for all using (true) with check (true);
create policy "notice_reads all" on notice_reads for all using (true) with check (true);

alter publication supabase_realtime add table notices, notice_reads;
