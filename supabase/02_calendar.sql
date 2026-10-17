-- 2. 학사 일정 캘린더 테이블
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null default '학교 전체',
  start_date date not null,
  end_date date not null,
  all_day boolean not null default true,
  start_time text,
  end_time text,
  place text,
  memo text,
  author text not null
);

alter table events enable row level security;
-- 로그인 기능을 붙이기 전 임시 규칙: 웹앱에서 읽고 쓸 수 있게 허용
create policy "events all" on events for all using (true) with check (true);

alter publication supabase_realtime add table events;
