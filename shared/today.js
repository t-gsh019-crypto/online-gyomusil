// 메인 화면의 "오늘 할 일"과 월별 캘린더 — 13개 앱에 적어 둔 날짜·시간을 모아 보여 줌
(function () {
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const J = (v, d) => (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return d; } })() : v ?? d);
  const P = (SCHOOL.periods || []);
  const MINE = { id: "mine", name: "내 할 일", c1: "#0d9488" };
  const app = (id) => (id === "mine" ? MINE : APPS.find((a) => a.id === id) || {});
  const color = (id) => app(id).c1 || "#64748b";
  const TABLES = ["events", "tt_slots", "tt_requests", "bookings", "rooms", "tasks", "surveys", "survey_responses", "minutes", "assessments", "family_notices", "family_replies", "teachers", "notices", "notice_reads", "my_todos"];

  let D = {}, me = null, sel = ymd(new Date()), month = new Date(), root = null;
  month.setDate(1);

  async function load() {
    const res = await Promise.allSettled(TABLES.map((t) => Store.list(t)));
    TABLES.forEach((t, i) => (D[t] = res[i].status === "fulfilled" ? res[i].value : []));
    D.tt_requests.forEach((r) => { r.items = J(r.items, []); r.approvals = J(r.approvals, {}); });
    D.tasks.forEach((t) => { t.assignees = J(t.assignees, []); t.done = J(t.done, {}); });
    D.minutes.forEach((m) => { m.attendees = J(m.attendees, []); m.todos = J(m.todos, []); });
  }
  // 내가 직접 적은 일 (공유 모드에서는 보안 규칙이 내 것만 돌려줌)
  const mine = () => (Store.mode === "cloud" ? D.my_todos : D.my_todos.filter((t) => t.owner === me.name));

  const names = (g) => D.teachers.filter((t) => !g || g === "전체" || t.group === g).map((t) => t.name);
  const taskMine = (t) => (t.assign_type === "전체" ? names() : t.assign_type === "부서" ? names(t.assign_group) : t.assignees || []).includes(me.name) || (t.assign_type === "전체") || (t.assign_type === "부서" && t.assign_group === me.group);
  const myGrade = () => (me.group.match(/^(\d)학년/) || [])[1];

  // 시간표 앱과 같은 규칙: 승인된 교체·보강을 반영한 나의 수업
  function lesson(date, p) {
    const dow = parse(date).getDay();
    const base = D.tt_slots.find((s) => s.teacher === me.name && s.dow === dow && s.period === p);
    let cell = base ? { class_name: base.class_name, subject: base.subject, note: "" } : null;
    for (const r of D.tt_requests.filter((r) => r.status === "승인")) for (const it of r.items) {
      if (it.from_teacher === me.name && it.from_date === date && it.from_period === p && cell) cell = null;
      if (it.to_teacher === me.name && it.to_date === date && it.to_period === p) cell = { class_name: it.class_name, subject: it.subject, note: r.kind };
    }
    return cell;
  }

  // 그날 할 일 모으기: { time, end, title, sub, app, due(마감 성격) }
  function itemsOn(date) {
    if (!me) return [];
    const out = [], d = parse(date), wk = d.getDay() > 0 && d.getDay() < 6;
    D.events.filter((e) => e.start_date <= date && e.end_date >= date).forEach((e) =>
      out.push({ time: e.all_day ? null : e.start_time, end: e.all_day ? null : e.end_time, title: e.title, sub: [e.category, e.place].filter(Boolean).join(" · "), app: "calendar" }));
    if (wk) P.forEach(([s, e], i) => { const c = lesson(date, i + 1); if (c) out.push({ time: s, end: e, title: `${i + 1}교시 ${c.class_name} ${c.subject || ""}`, sub: c.note ? `${c.note} 수업` : "내 수업", app: "timetable" }); });
    D.bookings.filter((b) => b.booker === me.name && b.date === date).forEach((b) => {
      const r = D.rooms.find((x) => x.id === b.room_id), pt = P[b.period - 1] || [];
      out.push({ time: pt[0] || null, end: pt[1], title: `${r?.emoji || "📍"} ${r?.name || "예약"} · ${b.period}교시`, sub: `${b.class_name}${r?.kind === "기자재" && !b.return_at ? (b.checkout_at ? " · 반납 서명 남기기" : " · 대여 서명 남기기") : ""}`, app: "booking" });
    });
    D.minutes.filter((m) => m.date === date && (m.attendees.includes(me.name) || m.author === me.name)).forEach((m) =>
      out.push({ time: m.time || null, title: m.title, sub: [m.type, m.place].filter(Boolean).join(" · "), app: "minutes" }));
    D.minutes.forEach((m) => m.todos.filter((t) => t.due === date && !t.done && (!t.owner || t.owner === me.name || m.author === me.name)).forEach((t) =>
      out.push({ time: t.time || null, title: t.text, sub: `후속 할 일 · ${m.title}${t.owner ? ` · ${t.owner}` : ""}`, app: "minutes", due: !t.time })));
    D.tasks.filter((t) => t.due === date && taskMine(t) && !t.done[me.name]).forEach((t) =>
      out.push({ time: null, title: `${t.important ? "⭐ " : ""}${t.title}`, sub: "업무 마감", app: "tasks", due: true }));
    D.surveys.filter((s) => s.deadline === date && !s.closed && (s.target === "전체" || s.target === me.group) && !D.survey_responses.some((r) => r.survey_id === s.id && r.respondent === me.name)).forEach((s) =>
      out.push({ time: null, title: s.title, sub: "설문 응답 마감", app: "survey", due: true }));
    D.assessments.filter((a) => a.date && a.date <= date && (a.end_date || a.date) >= date && (a.author === me.name || a.grade === `${myGrade()}학년`)).forEach((a) =>
      out.push({ time: null, title: `${a.grade} ${a.subject} ${a.title}`, sub: `${a.kind} ${a.weight}%`, app: "assess" }));
    D.family_notices.filter((f) => f.author === me.name && f.need_reply && f.deadline === date).forEach((f) => {
      const got = new Set(D.family_replies.filter((r) => r.notice_id === f.id).map((r) => r.student_no)).size;
      out.push({ time: null, title: f.title, sub: `가정통신문 회신 마감 · ${got}${f.roster_size ? "/" + f.roster_size : ""}명 회신`, app: "family", due: true });
    });
    mine().filter((t) => t.date === date).forEach((t) =>
      out.push({ time: t.time || null, end: t.end_time || null, title: t.title, sub: t.memo || "내 할 일", app: "mine", id: t.id, done: t.done }));
    // 시간 있는 일은 시간순, 하루 종일·마감은 맨 위
    return out.sort((a, b) => (a.time ? 1 : 0) - (b.time ? 1 : 0) || (a.time || "").localeCompare(b.time || ""));
  }
  // 날짜와 상관없이 지금 챙길 일
  function pending() {
    if (!me) return [];
    const out = [];
    const ap = D.tt_requests.filter((r) => r.status === "대기" && r.approvals?.[me.name] === "대기").length;
    if (ap) out.push({ title: `수업 교체 승인 요청 ${ap}건`, app: "timetable" });
    const unread = D.notices.filter((n) => (n.target === "전체" || n.target === me.group) && n.author !== me.name && !D.notice_reads.some((r) => r.notice_id === n.id && r.reader === me.name)).length;
    if (unread) out.push({ title: `안 읽은 공지 ${unread}개`, app: "notice" });
    const today = ymd(new Date());
    const late = D.tasks.filter((t) => t.due < today && taskMine(t) && !t.done[me.name]).length;
    if (late) out.push({ title: `마감 지난 업무 ${late}건`, app: "tasks", warn: true });
    const unreturned = D.bookings.filter((b) => b.booker === me.name && b.checkout_at && !b.return_at && b.date < today).length;
    if (unreturned) out.push({ title: `반납 안 한 기자재 ${unreturned}건`, app: "booking", warn: true });
    return out;
  }

  function paint() {
    const today = ymd(new Date()), now = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
    const list = itemsOn(sel), sd = parse(sel);
    const title = sel === today ? "오늘 할 일" : `${sd.getMonth() + 1}월 ${sd.getDate()}일 ${DOW[sd.getDay()]}요일`;
    let nextMarked = false;
    const rows = list.map((it) => {
      let state = "";
      if (it.done) state = "done";
      else if (sel === today && it.time) {
        if ((it.end || it.time) < now) state = "past";
        else if (it.time <= now) state = "now";
        else if (!nextMarked) { state = "next"; nextMarked = true; }
      } else if (sel < today) state = "past";
      const tt = it.time ? `<b>${esc(it.time)}</b>${it.end ? `<small>${esc(it.end)}</small>` : ""}` : `<b class="allday">${it.due ? "마감" : "종일"}</b>`;
      if (it.app === "mine") return `<div class="ti mine ${state}" style="--c:${color("mine")}" data-edit="${it.id}" role="button" tabindex="0" aria-label="${esc(it.title)} 고치기">
        <span class="tt">${tt}</span>
        <button class="chk" type="button" data-chk="${it.id}" aria-label="${it.done ? "다 한 일 취소" : "다 했어요"}">${it.done ? "✓" : ""}</button>
        <span class="tx"><b>${esc(it.title)}</b><small>${esc(it.sub || "")}</small></span>
        ${state === "now" ? '<span class="badge-now">지금</span>' : state === "next" ? '<span class="badge-next">다음</span>' : '<span class="pen" aria-hidden="true">✎</span>'}</div>`;
      return `<a class="ti ${state} ${it.due ? "due" : ""}" href="./${it.app}/" style="--c:${color(it.app)}">
        <span class="tt">${it.time ? `<b>${esc(it.time)}</b>${it.end ? `<small>${esc(it.end)}</small>` : ""}` : `<b class="allday">${it.due ? "마감" : "종일"}</b>`}</span>
        <span class="dot"></span>
        <span class="tx"><b>${esc(it.title)}</b><small>${esc(it.sub || "")}</small></span>
        ${state === "now" ? '<span class="badge-now">지금</span>' : state === "next" ? '<span class="badge-next">다음</span>' : ""}</a>`;
    }).join("");
    const pend = sel === today ? pending() : [];
    root.querySelector("#tdHead").innerHTML = `<h3>${title}</h3><span class="cnt">${list.length}건</span>${sel !== today ? '<button class="btn small ghost" type="button" data-today>오늘로</button>' : ""}<button class="btn small" type="button" data-add>＋ 추가</button>`;
    root.querySelector("#tdPend").innerHTML = pend.map((p) => `<a class="pend ${p.warn ? "warn" : ""}" href="./${p.app}/" style="--c:${color(p.app)}">${appIcon(p.app)}${esc(p.title)}</a>`).join("");
    root.querySelector("#tdList").innerHTML = rows || `<div class="td-empty">${sel === today ? "🌿 오늘은 정해진 일이 없어요" : "이날은 정해진 일이 없어요"}</div>`;
    paintCal();
  }

  function paintCal() {
    const y = month.getFullYear(), m = month.getMonth(), today = ymd(new Date());
    const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), k = ymd(d);
      if (i >= 35 && d.getMonth() !== m) break;
      const its = itemsOn(k).filter((x) => x.app !== "timetable"), apps = [...new Set(its.map((x) => x.app))].slice(0, 4);
      cells += `<button type="button" class="cd ${d.getMonth() !== m ? "out" : ""} ${k === today ? "today" : ""} ${k === sel ? "sel" : ""} ${d.getDay() === 0 ? "sun" : d.getDay() === 6 ? "sat" : ""}" data-d="${k}" aria-label="${d.getMonth() + 1}월 ${d.getDate()}일 ${its.length}건">
        <span class="n">${d.getDate()}</span><span class="dots">${apps.map((a) => `<i style="background:${color(a)}"></i>`).join("")}</span></button>`;
    }
    root.querySelector("#calHead").innerHTML = `<button class="icon" type="button" data-mv="-1" aria-label="이전 달">‹</button><h3>${y}년 ${m + 1}월</h3><button class="icon" type="button" data-mv="1" aria-label="다음 달">›</button>`;
    root.querySelector("#calGrid").innerHTML = DOW.map((w) => `<span class="wd">${w}</span>`).join("") + cells;
    const used = [...new Set(Array.from({ length: 31 }, (_, i) => ymd(new Date(y, m, i + 1))).filter((k) => k.startsWith(`${y}-${pad(m + 1)}`)).flatMap((k) => itemsOn(k).map((x) => x.app)).filter((a) => a !== "timetable"))];
    root.querySelector("#calLegend").innerHTML = used.map((a) => `<span><i style="background:${color(a)}"></i>${esc(app(a).name)}</span>`).join("");
  }

  // 내 할 일 추가·고치기·지우기 창
  let dlg = null, editing = null;
  function dialog() {
    if (dlg) return dlg;
    document.body.insertAdjacentHTML("beforeend", `<dialog id="todoDialog"><form method="dialog" id="todoForm">
      <h2 id="tdlgTitle">내 할 일</h2>
      <label for="tdTitle">할 일</label><input id="tdTitle" required maxlength="80" placeholder="예: 학부모 상담 전화">
      <label for="tdDate">날짜</label><input id="tdDate" type="date" required>
      <label>시간 <small class="muted" style="font-weight:600">(비워 두면 '종일'로 보여요)</small></label>
      <div class="td-time"><input id="tdTime" type="time" aria-label="시작 시간"><span>~</span><input id="tdEnd" type="time" aria-label="끝 시간"></div>
      <div class="td-per" id="tdPer">${P.map((p, i) => `<button type="button" class="chip" data-per="${i}">${i + 1}교시</button>`).join("")}</div>
      <label for="tdMemo">메모</label><input id="tdMemo" maxlength="120" placeholder="장소나 준비물 (선택)">
      <p id="tdMsg" style="font-size:13px;color:var(--danger);margin:6px 0 0"></p>
      <div class="actions"><button class="btn danger hidden" type="button" id="tdDel">삭제</button><span style="flex:1"></span><button class="btn ghost" value="cancel" formnovalidate>취소</button><button class="btn" value="ok">저장</button></div>
    </form></dialog>`);
    dlg = document.getElementById("todoDialog");
    const $ = (id) => document.getElementById(id);
    $("tdPer").addEventListener("click", (e) => { const b = e.target.closest("[data-per]"); if (!b) return; const [s, en] = P[+b.dataset.per]; $("tdTime").value = s; $("tdEnd").value = en; });
    $("tdDel").addEventListener("click", async () => {
      if (!editing || !confirm("이 할 일을 지울까요?")) return;
      try { await Store.remove("my_todos", editing.id); dlg.close(); await reloadMine(); } catch (e) { $("tdMsg").textContent = "지우지 못했어요: " + e.message; }
    });
    $("todoForm").addEventListener("submit", async (e) => {
      if (e.submitter?.value !== "ok") return;
      e.preventDefault();
      const row = { title: $("tdTitle").value.trim(), date: $("tdDate").value, time: $("tdTime").value || null, end_time: $("tdTime").value && $("tdEnd").value ? $("tdEnd").value : null, memo: $("tdMemo").value.trim() || null };
      if (!row.title || !row.date) return;
      if (row.end_time && row.end_time < row.time) { $("tdMsg").textContent = "끝 시간이 시작 시간보다 빨라요."; return; }
      try {
        if (editing) await Store.update("my_todos", editing.id, row);
        else await Store.insert("my_todos", { ...row, owner: me.name, done: false });
        dlg.close(); sel = row.date; const p = parse(sel); month = new Date(p.getFullYear(), p.getMonth(), 1);
        await reloadMine();
      } catch (err) { $("tdMsg").textContent = /my_todos|relation|schema/i.test(err.message) ? "저장할 곳이 아직 없어요. 07_내_할일.sql을 먼저 실행해 주세요." : "저장하지 못했어요: " + err.message; }
    });
    return dlg;
  }
  function openTodo(t) {
    const d = dialog(), $ = (id) => document.getElementById(id);
    editing = t || null;
    $("tdlgTitle").textContent = t ? "내 할 일 고치기" : "내 할 일 추가";
    $("tdTitle").value = t?.title || ""; $("tdDate").value = t?.date || sel;
    $("tdTime").value = t?.time || ""; $("tdEnd").value = t?.end_time || ""; $("tdMemo").value = t?.memo || "";
    $("tdMsg").textContent = ""; $("tdDel").classList.toggle("hidden", !t);
    d.showModal(); $("tdTitle").focus();
  }
  async function reloadMine() { try { D.my_todos = await Store.list("my_todos"); } catch {} paint(); }

  window.Today = {
    async init(el, who) {
      root = el; me = who;
      el.addEventListener("click", (e) => {
        const d = e.target.closest("[data-d]"); if (d) { sel = d.dataset.d; const p = parse(sel); if (p.getMonth() !== month.getMonth()) month = new Date(p.getFullYear(), p.getMonth(), 1); return paint(); }
        const mv = e.target.closest("[data-mv]"); if (mv) { month = new Date(month.getFullYear(), month.getMonth() + +mv.dataset.mv, 1); return paintCal(); }
        if (e.target.closest("[data-add]")) return openTodo();
        const ck = e.target.closest("[data-chk]");
        if (ck) { const t = D.my_todos.find((x) => x.id === ck.dataset.chk); if (t) { t.done = !t.done; paint(); Store.update("my_todos", t.id, { done: t.done }).catch(() => reloadMine()); } return; }
        const ed = e.target.closest("[data-edit]"); if (ed) return openTodo(D.my_todos.find((x) => x.id === ed.dataset.edit));
        if (e.target.closest("[data-today]")) { sel = ymd(new Date()); month = new Date(); month.setDate(1); paint(); }
      });
      el.addEventListener("keydown", (e) => { const ed = e.target.closest?.("[data-edit]"); if (ed && e.target === ed && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openTodo(D.my_todos.find((x) => x.id === ed.dataset.edit)); } });
      el.classList.remove("hidden");
      el.querySelector("#tdList").innerHTML = '<div class="td-empty">불러오는 중…</div>';
      await load(); paint();
      setInterval(paint, 60000);
      ["events", "tt_requests", "bookings", "tasks", "minutes", "surveys", "my_todos"].forEach((t) => Store.subscribe(t, async () => { await load(); paint(); }));
    },
    setMe(who) { me = who; if (root) paint(); },
  };
})();
