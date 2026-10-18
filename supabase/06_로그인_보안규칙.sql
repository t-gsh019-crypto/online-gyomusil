-- 로그인(메일 인증까지 마친) 선생님만 데이터를 읽고 쓰게 바꾸는 보안 규칙
-- 먼저 메인 화면에서 내 계정으로 가입 → 메일 인증 → 로그인이 되는지 확인한 뒤 실행해 주세요.
-- (여러 번 실행해도 안전해요)

do $$
declare t text;
begin
  foreach t in array array['notices', 'notice_reads', 'notice_comments', 'events', 'tt_slots', 'tt_requests',
                           'teachers', 'files', 'surveys', 'survey_responses', 'rooms', 'bookings', 'tasks', 'chat_rooms', 'chat_messages',
                           'minutes', 'links', 'lesson_plans', 'assessments', 'family_notices', 'family_replies'] loop
    execute format('alter table %I enable row level security', t);
    -- 예전 임시 규칙("누구나 읽고 쓰기") 지우기
    execute format('drop policy if exists %I on %I', t || ' all', t);
    -- 로그인한 선생님만
    execute format('drop policy if exists %I on %I', t || ' teachers', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || ' teachers', t);
  end loop;
end $$;

-- 학부모 회신 화면(로그인 없음): 가정통신문 읽기와 회신 보내기만 허용
drop policy if exists "family_notices parents read" on family_notices;
create policy "family_notices parents read" on family_notices for select to anon using (kind = '가정통신문');
drop policy if exists "family_replies parents send" on family_replies;
create policy "family_replies parents send" on family_replies for insert to anon with check (true);

-- 파일 보관함: 올리기는 로그인한 선생님만 (보기는 링크가 있으면 가능)
drop policy if exists "gyomusil upload" on storage.objects;
create policy "gyomusil upload" on storage.objects for insert to authenticated with check (bucket_id = 'gyomusil');
