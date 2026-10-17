// 4~13번 앱이 함께 쓰는 도우미: 날짜·글자 처리, 선생님 정보 창, 선생님 명단, 알림창
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const md = (s) => { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`; };
  const fmt = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dday = (s) => {
    const n = Math.round((parse(s) - parse(ymd(new Date()))) / 864e5);
    return n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}`;
  };
  const GROUPS = SCHOOL.depts.map((d) => d.name);

  const App = {
    me: Me.get(),
    roster: [],
    onMe: null,

    // 상단 바(#meChip), 체험 모드 안내(#modeBanner), 앱 아이콘(svg[data-app])을 준비
    init({ onMe } = {}) {
      this.onMe = onMe;
      if (Store.mode === "local") $("modeBanner")?.classList.remove("hidden");
      document.querySelectorAll("[data-app-icon]").forEach((el) => {
        const id = el.dataset.appIcon;
        const fav = document.createElement("link");
        fav.rel = "icon";
        fav.href = "data:image/svg+xml," + encodeURIComponent(appIcon(id));
        document.head.append(fav);
        el.outerHTML = appIcon(id).replace("<svg", '<svg class="app-icon"');
      });
      document.body.insertAdjacentHTML("beforeend", `
        <dialog id="meDialog"><form method="dialog" id="meForm">
          <h2>선생님 정보</h2>
          <p class="muted">누가 쓰고 확인했는지 표시하는 데 써요. 이름은 학교에서 쓰는 그대로 적어 주세요.</p>
          <label for="meName">이름</label><input id="meName" required maxlength="20" placeholder="예: 김민지">
          <label for="meGroup">소속</label><select id="meGroup">${GROUPS.map((g) => `<option>${g}</option>`).join("")}</select>
          <div class="actions"><button class="btn" value="ok">저장</button></div>
        </form></dialog>`);
      $("meForm").addEventListener("submit", async () => {
        this.me = { name: $("meName").value.trim(), group: $("meGroup").value };
        Me.set(this.me);
        this.paintMe();
        await this.register();
        this.onMe?.(this.me);
      });
      $("meChip").onclick = () => this.askMe();
      this.paintMe();
      this.loadRoster();
      Store.subscribe("teachers", () => this.loadRoster());
      if (!this.me || !GROUPS.includes(this.me.group)) this.askMe();
      else this.register();
    },
    paintMe() {
      const me = this.me;
      $("meChip").textContent = me ? `👤 ${me.name}` : "내 정보";
      $("meChip").title = me ? `${me.name} · ${me.group} (눌러서 바꾸기)` : "";
    },
    askMe() {
      $("meName").value = this.me?.name || "";
      $("meGroup").value = GROUPS.includes(this.me?.group) ? this.me.group : GROUPS[0];
      $("meDialog").showModal();
    },
    // 선생님 정보가 없으면 입력창을 띄우고 false
    need() { if (this.me) return true; this.askMe(); return false; },

    // 학교 선생님 명단(teachers 표) — 미응답자 표시, 메신저 상대 고르기 등에 씀
    async loadRoster() {
      try { this.roster = (await Store.list("teachers")).sort((a, b) => a.name.localeCompare(b.name, "ko")); } catch { this.roster = []; }
      if (this.me && !this.roster.some((t) => t.name === this.me.name)) this.roster.push({ name: this.me.name, group: this.me.group });
      window.dispatchEvent(new Event("roster"));
    },
    async register() {
      if (!this.me) return;
      try {
        const list = await Store.list("teachers");
        const mine = list.find((t) => t.name === this.me.name);
        if (!mine) await Store.insert("teachers", { name: this.me.name, group: this.me.group });
        else if (mine.group !== this.me.group) await Store.update("teachers", mine.id, { group: this.me.group });
      } catch {}
      this.loadRoster();
    },
    names(group) { return this.roster.filter((t) => !group || group === "전체" || t.group === group).map((t) => t.name); },

    toast(msg) {
      let t = $("toast");
      if (!t) {
        document.body.insertAdjacentHTML("beforeend", `<div id="toast" style="position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:50;background:var(--text);color:var(--bg);padding:12px 18px;border-radius:999px;font-weight:700;font-size:14px;box-shadow:var(--shadow-lg);opacity:0;transition:.3s;pointer-events:none;max-width:90vw;text-align:center"></div>`);
        t = $("toast");
      }
      t.textContent = msg;
      t.style.opacity = "1";
      clearTimeout(t._h);
      t._h = setTimeout(() => (t.style.opacity = "0"), 2200);
    },
    confirm(msg, ok = "확인") {
      return new Promise((res) => {
        const d = document.createElement("dialog");
        d.innerHTML = `<h2>확인해 주세요</h2><p>${esc(msg)}</p><div class="actions"><button class="btn ghost" data-v="0">취소</button><button class="btn" data-v="1">${esc(ok)}</button></div>`;
        d.onclick = (e) => { const b = e.target.closest("[data-v]"); if (b) { d.close(); d.remove(); res(b.dataset.v === "1"); } };
        document.body.append(d);
        d.showModal();
      });
    },
    download(name, text, type = "text/csv") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([(type === "text/csv" ? "﻿" : "") + text], { type }));
      a.download = name;
      a.click();
    },
    csv(rows) { return rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); },
    empty(title, sub, emoji = "✨") {
      return `<div class="empty"><div style="font-size:52px;line-height:1;margin-bottom:10px">${emoji}</div><b>${esc(title)}</b>${esc(sub || "")}</div>`;
    },
    avatar(name, size) { return `<span class="avatar" ${size ? `style="width:${size}px;height:${size}px;font-size:${Math.round(size / 2.6)}px"` : ""}>${esc(String(name || "?").slice(-2))}</span>`; },
  };

  window.U = { $, esc, pad, ymd, parse, addDays, DOW, md, fmt, dday, GROUPS };
  window.App = App;
})();
