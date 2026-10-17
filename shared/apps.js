// 13개 앱 목록과 아이콘(코드로 그린 SVG) — 메인 화면과 각 앱 상단에서 함께 씀
window.APPS = [
  { id: "notice", name: "공지·업무 전달", desc: "부서별 공지, 읽음 확인, 댓글", c1: "#3b6cf6", c2: "#8b5cf6",
    art: `<path d="M14 27h9l19-11v32L23 37h-9a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z" fill="#fff"/><path d="M20 37l4 11h6l-3-11" fill="#fff" opacity=".6"/><path d="M47 25c3 2 3 12 0 14M51 21c6 4 6 18 0 22" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: "calendar", name: "학사 일정", desc: "월간·주간 일정, 구글 캘린더 내보내기", c1: "#10b981", c2: "#0ea5e9",
    art: `<rect x="13" y="17" width="38" height="34" rx="6" fill="#fff"/><path d="M13 23a6 6 0 0 1 6-6h26a6 6 0 0 1 6 6v4H13z" fill="#fff" opacity=".55"/><rect x="21" y="12" width="4" height="10" rx="2" fill="#fff"/><rect x="39" y="12" width="4" height="10" rx="2" fill="#fff"/><rect x="19" y="32" width="7" height="6" rx="1.5" fill="#10b981"/><rect x="29" y="32" width="7" height="6" rx="1.5" fill="#10b981" opacity=".3"/><rect x="39" y="32" width="7" height="6" rx="1.5" fill="#10b981" opacity=".3"/><rect x="19" y="41" width="7" height="6" rx="1.5" fill="#10b981" opacity=".3"/><rect x="29" y="41" width="7" height="6" rx="1.5" fill="#f59e0b"/>` },
  { id: "timetable", name: "시간표·수업 교체", desc: "교체·보강 자동 추천과 승인", c1: "#8b5cf6", c2: "#ec4899",
    art: `<rect x="12" y="14" width="40" height="36" rx="6" fill="#fff" opacity=".22"/><path d="M12 26h40M12 38h40M25 14v36M39 14v36" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><path d="M17 31h20l-5-5M47 33H27l5 5" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
  { id: "files", name: "자료실", desc: "교과·학년·업무별 폴더와 양식", c1: "#f97316", c2: "#f59e0b",
    art: `<path d="M11 21a5 5 0 0 1 5-5h10l5 5h17a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z" fill="#fff" opacity=".45"/><rect x="11" y="25" width="42" height="25" rx="5" fill="#fff"/><path d="M24 34h16M24 41h11" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` },
  { id: "survey", name: "설문·회신", desc: "참석·희망 조사, 미응답자 표시", c1: "#14b8a6", c2: "#06b6d4",
    art: `<rect x="15" y="13" width="34" height="40" rx="6" fill="#fff"/><rect x="25" y="9" width="14" height="8" rx="3" fill="#fff" opacity=".7"/><path d="M21 28l3 3 5-6M21 41l3 3 5-6" stroke="#14b8a6" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M33 29h10M33 42h10" stroke="#14b8a6" stroke-width="3" stroke-linecap="round" opacity=".5"/>` },
  { id: "booking", name: "특별실·기자재 예약", desc: "과학실·태블릿 카트, 중복 예약 방지", c1: "#ef4444", c2: "#f97316",
    art: `<circle cx="24" cy="30" r="10" fill="none" stroke="#fff" stroke-width="5"/><path d="M32 34l17 13M41 41l4-4M46 45l3-3" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="30" r="3" fill="#fff"/>` },
  { id: "tasks", name: "업무 체크리스트", desc: "마감일·담당자·완료 현황", c1: "#6366f1", c2: "#3b82f6",
    art: `<rect x="13" y="14" width="38" height="38" rx="8" fill="#fff" opacity=".25"/><rect x="18" y="20" width="8" height="8" rx="2" fill="#fff"/><path d="M19.5 24l2 2 3.5-4" stroke="#6366f1" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="18" y="33" width="8" height="8" rx="2" fill="#fff"/><path d="M19.5 37l2 2 3.5-4" stroke="#6366f1" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M31 24h14M31 37h14" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><rect x="18" y="45" width="8" height="2" rx="1" fill="#fff" opacity=".6"/>` },
  { id: "messenger", name: "교사 메신저", desc: "1:1·그룹 대화, 파일 전송", c1: "#0ea5e9", c2: "#6366f1",
    art: `<path d="M12 22a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H24l-8 6v-6.5A8 8 0 0 1 12 30z" fill="#fff"/><path d="M47 26a6 6 0 0 1 5 6v7a6 6 0 0 1-5 6v5l-7-5h-9a6 6 0 0 1-5-3" fill="#fff" opacity=".55"/><circle cx="21" cy="26" r="2.2" fill="#0ea5e9"/><circle cx="28" cy="26" r="2.2" fill="#0ea5e9"/><circle cx="35" cy="26" r="2.2" fill="#0ea5e9"/>` },
  { id: "minutes", name: "회의록·협의록", desc: "협의회 기록 양식, 참석자 확인", c1: "#b45309", c2: "#f59e0b",
    art: `<rect x="14" y="12" width="30" height="40" rx="5" fill="#fff"/><path d="M20 21h18M20 28h18M20 35h11" stroke="#b45309" stroke-width="3" stroke-linecap="round" opacity=".6"/><path d="M50 26l-14 18-4 2 1-5 14-17z" fill="#fff" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>` },
  { id: "links", name: "링크 모음", desc: "나이스·에듀파인 등 바로가기", c1: "#475569", c2: "#0ea5e9",
    art: `<path d="M29 35a7 7 0 0 0 10 0l7-7a7 7 0 0 0-10-10l-3 3" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M35 29a7 7 0 0 0-10 0l-7 7a7 7 0 0 0 10 10l3-3" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>` },
  { id: "lessons", name: "수업 자료·지도안", desc: "차시별 자료, 함께 쓰는 지도안", c1: "#eab308", c2: "#84cc16",
    art: `<path d="M32 20c-5-4-12-5-19-4v30c7-1 14 0 19 4z" fill="#fff"/><path d="M32 20c5-4 12-5 19-4v30c-7-1-14 0-19 4z" fill="#fff" opacity=".7"/><path d="M18 24c3 0 6 .5 9 2M18 31c3 0 6 .5 9 2" stroke="#eab308" stroke-width="2.5" stroke-linecap="round"/>` },
  { id: "assess", name: "평가 계획·루브릭", desc: "수행평가 일정, 채점 기준표", c1: "#ec4899", c2: "#f43f5e",
    art: `<rect x="15" y="12" width="34" height="40" rx="6" fill="#fff"/><path d="M32 19l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#ec4899"/><path d="M22 42h20M22 47h12" stroke="#ec4899" stroke-width="3" stroke-linecap="round" opacity=".5"/>` },
  { id: "family", name: "학생·학부모 소통", desc: "가정통신문, 알림장, 동의서 회신", c1: "#22c55e", c2: "#14b8a6",
    art: `<rect x="10" y="18" width="44" height="30" rx="6" fill="#fff"/><path d="M12 21l20 14 20-14" stroke="#22c55e" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M32 14c-2-3-7-2-7 2 0 3 7 7 7 7s7-4 7-7c0-4-5-5-7-2z" fill="#fff"/><path d="M32 14c-2-3-7-2-7 2 0 3 7 7 7 7s7-4 7-7c0-4-5-5-7-2z" fill="#f43f5e" transform="translate(0 0)" opacity=".9"/>` },
];

// 앱 아이콘 SVG 문자열 만들기
window.appIcon = function (id, size) {
  const a = window.APPS.find((x) => x.id === id);
  if (!a) return "";
  const g = "g-" + id + "-" + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 64 64" ${size ? `width="${size}" height="${size}"` : ""} aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.c1}"/><stop offset="1" stop-color="${a.c2}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#${g})"/>${a.art}</svg>`;
};
