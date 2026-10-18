-- 6번 예약 앱: 기자재 대여·반납 일시와 서명 칸 추가 (여러 번 실행해도 안전해요)
alter table bookings
  add column if not exists checkout_at timestamptz,
  add column if not exists checkout_by text,
  add column if not exists checkout_sign text,   -- 손글씨 서명 그림(글자로 바꿔 저장)
  add column if not exists checkout_note text,
  add column if not exists return_at timestamptz,
  add column if not exists return_by text,
  add column if not exists return_sign text,
  add column if not exists return_note text;
