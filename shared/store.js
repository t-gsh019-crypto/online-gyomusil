// 데이터 저장 도우미 — 13개 앱이 함께 씀.
// Supabase가 설정되어 있으면 모두가 공유하는 저장소를, 아니면 이 브라우저의 localStorage를 써요.
(function () {
  const cfg = window.GYOMUSIL_CONFIG || {};
  const useCloud = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = useCloud ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const PREFIX = "gyomusil:";

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

    async insert(table, row) {
      const full = { id: uid(), created_at: new Date().toISOString(), ...row };
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

  // 사용자(선생님) 정보 — 로그인 기능 전까지는 이 브라우저에 이름·부서를 기억해 둠
  const Me = {
    get() {
      try { return JSON.parse(localStorage.getItem(PREFIX + "me") || "null"); } catch { return null; }
    },
    set(me) {
      try { localStorage.setItem(PREFIX + "me", JSON.stringify(me)); } catch {}
    },
  };

  window.Store = Store;
  window.Me = Me;
})();
