-- 3. 시간표 & 수업 교체·보강 테이블
create table if not exists tt_slots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  teacher text not null,
  dow int not null,          -- 1=월 … 5=금
  period int not null,       -- 교시
  class_name text not null,  -- 예: 2-3
  subject text
);

-- 교체·보강 요청: items에 수업 이동 목록, approvals에 선생님별 승인 상태가 들어가요
create table if not exists tt_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,               -- 교체 / 연쇄 교체 / 보강 / 자습
  requester text not null,
  reason text,
  memo text,                        -- 대신 수업할 선생님께 남기는 메모
  items jsonb not null,
  approvals jsonb not null default '{}'::jsonb,
  status text not null default '대기',  -- 대기 / 승인 / 거절
  decided_at timestamptz
);

alter table tt_slots enable row level security;
alter table tt_requests enable row level security;
-- 로그인 기능을 붙이기 전 임시 규칙: 웹앱에서 읽고 쓸 수 있게 허용
create policy "tt_slots all" on tt_slots for all using (true) with check (true);
create policy "tt_requests all" on tt_requests for all using (true) with check (true);

alter publication supabase_realtime add table tt_slots, tt_requests;
