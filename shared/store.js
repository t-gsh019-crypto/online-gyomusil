// 데이터 저장 도우미 — 13개 앱이 함께 씀.
// Supabase가 설정되어 있으면 모두가 공유하는 저장소를, 아니면 이 브라우저의 localStorage를 써요.
(function () {
  const cfg = window.GYOMUSIL_CONFIG || {};
  const useCloud = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const AUTH_KEY = "gyomusil-auth";
  const sb = useCloud ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { storageKey: AUTH_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  }) : null;
  const PREFIX = "gyomusil:";

  // 로그인 확인: 공유 모드에서는 이메일 인증을 마치고 로그인한 선생님만 앱을 쓸 수 있음.
  // 메인 화면(GYOMUSIL_PAGE = "home")과 학부모 회신 화면(family/?id=)은 로그인 없이 열림.
  const storedSession = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; } };
  const isPublicPage = window.GYOMUSIL_PAGE === "home" || (/\/family\/?$/.test(location.pathname.replace(/index\.html$/, "")) && new URLSearchParams(location.search).has("id"));
  const toLogin = () => {
    const app = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "").split("/").pop();
    location.replace("../?next=" + encodeURIComponent(app));
  };
  if (sb && !isPublicPage) {
    if (!storedSession()?.user) toLogin();
    sb.auth.onAuthStateChange((event, session) => { if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)) toLogin(); });
  }

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  const readLocal = (table) => {
    try { return JSON.parse(localStorage.getItem(PREFIX + table) || "[]"); } catch { return []; }
  };
  const writeLocal = (table, rows) => {
    try { localStorage.setItem(PREFIX + table, JSON.stringify(rows)); } catch {}
    window.dispatchEvent(new CustomEvent("gyomusil-change", { detail: { table } }));
  };

  const Store = {
    mode: useCloud ? "cloud" : "local",

    async list(table) {
      if (sb) {
        const { data, error } = await sb.from(table).select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      }
      return readLocal(table).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    },

    // quiet: 저장한 줄을 다시 읽지 않음 (학부모 회신처럼 읽기 권한이 없는 경우)
    async insert(table, row, { quiet = false } = {}) {
      const full = { id: uid(), created_at: new Date().toISOString(), ...row };
      if (sb && quiet) {
        const { error } = await sb.from(table).insert(full);
        if (error) throw error;
        return full;
      }
      if (sb) {
        const { data, error } = await sb.from(table).insert(full).select().single();
        if (error) throw error;
        return data;
      }
      writeLocal(table, [...readLocal(table), full]);
      return full;
    },

    async update(table, id, patch) {
      if (sb) {
        const { error } = await sb.from(table).update(patch).eq("id", id);
        if (error) throw error;
        return;
      }
      writeLocal(table, readLocal(table).map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },

    async remove(table, id) {
      if (sb) {
        const { error } = await sb.from(table).delete().eq("id", id);
        if (error) throw error;
        return;
      }
      writeLocal(table, readLocal(table).filter((r) => r.id !== id));
    },

    // 파일 올리기 — Supabase Storage의 gyomusil 보관함에 저장하고 주소를 돌려줌
    // 체험 모드에서는 2MB 이하 파일만 이 브라우저에 저장
    async upload(file, folder = "files") {
      if (sb) {
        const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
        const path = `${folder}/${uid()}.${ext}`;
        const { error } = await sb.storage.from("gyomusil").upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
        return sb.storage.from("gyomusil").getPublicUrl(path).data.publicUrl;
      }
      if (file.size > 2 * 1024 * 1024) throw new Error("체험 모드에서는 2MB 이하 파일만 올릴 수 있어요.");
      return await new Promise((ok, no) => {
        const r = new FileReader();
        r.onload = () => ok(r.result);
        r.onerror = () => no(r.error);
        r.readAsDataURL(file);
      });
    },

    // 다른 선생님이 바꾼 내용이 새로고침 없이 반영되도록 알려줌
    subscribe(table, onChange) {
      if (sb) {
        sb.channel("rt-" + table)
          .on("postgres_changes", { event: "*", schema: "public", table }, onChange)
          .subscribe();
        return;
      }
      window.addEventListener("gyomusil-change", (e) => e.detail.table === table && onChange());
      window.addEventListener("storage", (e) => e.key === PREFIX + table && onChange());
    },
  };

  // 사용자(선생님) 정보 — 공유 모드에서는 로그인 계정에 저장된 이름·소속, 체험 모드에서는 이 브라우저에 기억
  const Me = {
    get() {
      if (sb) {
        const m = storedSession()?.user?.user_metadata;
        return m && m.name ? { name: m.name, group: m.group || "" } : null;
      }
      try { return JSON.parse(localStorage.getItem(PREFIX + "me") || "null"); } catch { return null; }
    },
    set(me) {
      if (sb) { sb.auth.updateUser({ data: { name: me.name, group: me.group } }); return; }
      try { localStorage.setItem(PREFIX + "me", JSON.stringify(me)); } catch {}
    },
  };

  // 가입·로그인·로그아웃 (메인 화면에서 씀)
  const Auth = {
    on: !!sb,
    client: sb,
    user: () => storedSession()?.user || null,
    async signUp(email, password, name, group) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name, group }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      // 이미 가입된 메일이면 identities가 비어서 돌아옴
      if (data.user && !(data.user.identities || []).length) throw new Error("already");
      return data;
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async resend(email) { const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; },
    async resetMail(email) { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw error; },
    async newPassword(password) { const { error } = await sb.auth.updateUser({ password }); if (error) throw error; },
    async update(me) { const { error } = await sb.auth.updateUser({ data: me }); if (error) throw error; },
    async signOut() { await sb.auth.signOut(); },
  };

  window.Store = Store;
  window.Me = Me;
  window.Auth = Auth;
})();
