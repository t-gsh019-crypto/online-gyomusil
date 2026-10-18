-- 메인 화면 "오늘 할 일"에 내가 직접 적는 일정·할 일
-- 내가 쓴 것은 나만 보고 고칠 수 있어요. (여러 번 실행해도 안전해요)
create table if not exists my_todos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null default auth.uid(),
  owner text,
  date date not null,
  time text,
  end_time text,
  title text not null,
  memo text,
  done boolean not null default false
);

alter table my_todos enable row level security;
drop policy if exists "my_todos own" on my_todos;
create policy "my_todos own" on my_todos for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'my_todos') then
    alter publication supabase_realtime add table my_todos;
  end if;
end $$;
