-- 4~13번 앱 + 선생님 명단 + 파일 저장소를 한 번에 만드는 SQL
-- Supabase → SQL Editor에 통째로 붙여 넣고 Run 한 번이면 돼요. (여러 번 실행해도 안전해요)

-- 선생님 명단 (미응답자 표시, 메신저 상대 고르기)
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  "group" text not null
);

-- 4. 자료실
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  title text not null,
  folder text not null,
  category text,
  tags text,
  description text,
  kind text not null default 'file',        -- file / link
  url text not null,
  file_name text,
  size bigint,
  version int not null default 1,
  versions jsonb not null default '[]',
  downloads int not null default 0,
  author text not null
);

-- 5. 설문·회신
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  deadline date,
  target text not null default '전체',
  anonymous boolean not null default false,
  questions jsonb not null default '[]',
  closed boolean not null default false,
  author text not null
);
create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  survey_id uuid not null references surveys(id) on delete cascade,
  respondent text not null,
  respondent_group text,
  answers jsonb not null default '{}'
);

-- 6. 특별실·기자재 예약
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  kind text not null default '특별실',
  location text,
  note text,
  emoji text
);
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  room_id uuid not null references rooms(id) on delete cascade,
  date date not null,
  period int not null,
  class_name text not null,
  purpose text,
  booker text not null,
  unique (room_id, date, period)              -- 같은 장소·같은 교시 중복 예약 막기
);

-- 7. 업무 체크리스트
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  due date,
  dept text,
  assign_type text not null default '전체',   -- 전체 / 부서 / 개인 / 나
  assign_group text,
  assignees jsonb not null default '[]',
  done jsonb not null default '{}',
  description text,
  link text,
  important boolean not null default false,
  author text not null
);

-- 8. 교사 메신저
create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_group boolean not null default false,
  name text,
  members jsonb not null default '[]',
  created_by text not null
);
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  author text not null,
  body text,
  file_url text,
  file_name text,
  deleted boolean not null default false
);

-- 9. 회의록·협의록
create table if not exists minutes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by text,
  type text not null,
  dept text,
  title text not null,
  date date not null,
  time text,
  place text,
  attendees jsonb not null default '[]',
  agenda text,
  discussion text,
  decisions text,
  todos jsonb not null default '[]',
  signatures jsonb not null default '{}',
  author text not null
);

-- 10. 링크 모음
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  url text not null,
  category text not null,
  scope text not null default '공용',          -- 공용 / 개인
  owner text,
  description text,
  clicks int not null default 0,
  author text not null
);

-- 11. 수업 자료·지도안
create table if not exists lesson_plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by text,
  subject text not null,
  grade text not null,
  lesson_no int not null,
  unit text not null,
  title text not null,
  goal text,
  plan jsonb not null default '[]',
  materials jsonb not null default '[]',
  contributors jsonb not null default '[]',
  likes jsonb not null default '[]',
  author text not null
);

-- 12. 평가 계획·루브릭 (학생 점수는 저장하지 않음)
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by text,
  subject text not null,
  grade text not null,
  semester text not null,
  kind text not null default '수행평가',
  weight numeric not null default 0,
  title text not null,
  date date,
  end_date date,
  area text,
  description text,
  levels jsonb not null default '[]',
  criteria jsonb not null default '[]',
  author text not null
);

-- 13. 학생·학부모 소통
create table if not exists family_notices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default '가정통신문',     -- 가정통신문 / 알림장
  grade text not null default '전체',
  class_no int,
  date date,
  title text not null,
  body text not null,
  need_reply boolean not null default false,
  choices jsonb not null default '[]',
  deadline date,
  roster_size int,
  file_url text,
  file_name text,
  author text not null
);
create table if not exists family_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  notice_id uuid not null references family_notices(id) on delete cascade,
  student_no int not null,
  student_name text not null,
  choice text not null,
  signer text not null,
  relation text,
  memo text
);

-- 모든 표에 "임시 공개 규칙 + 실시간 반영" 켜기
do $$
declare t text;
begin
  foreach t in array array['teachers', 'files', 'surveys', 'survey_responses', 'rooms', 'bookings', 'tasks', 'chat_rooms', 'chat_messages',
                           'minutes', 'links', 'lesson_plans', 'assessments', 'family_notices', 'family_replies'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || ' all') then
      -- 로그인 기능을 붙이기 전 임시 규칙: 웹앱에서 읽고 쓸 수 있게 허용
      execute format('create policy %I on %I for all using (true) with check (true)', t || ' all', t);
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- 파일 저장소 (자료실·메신저·지도안·가정통신문 첨부)
insert into storage.buckets (id, name, public) values ('gyomusil', 'gyomusil', true)
on conflict (id) do nothing;
drop policy if exists "gyomusil read" on storage.objects;
drop policy if exists "gyomusil upload" on storage.objects;
create policy "gyomusil read" on storage.objects for select using (bucket_id = 'gyomusil');
create policy "gyomusil upload" on storage.objects for insert with check (bucket_id = 'gyomusil');
