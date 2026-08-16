/* ============================================================
 * store.js — 資料層（localStorage 持久化）
 * 保存：學習規劃 plan、對話紀錄 chat、AI 設定 settings
 * ============================================================ */
(function () {
  "use strict";

  var KEY = "study-planner.v1";

  function uid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function addDaysISO(iso, days) {
    var d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function task(text, done) {
    return { id: uid(), text: text, done: !!done };
  }

  function material(type, title, url, note, week) {
    return { id: uid(), type: type, title: title, url: url || "", note: note || "", week: week || 1, done: false };
  }

  /* ---------- 內建範例：遊戲渲染 ---------- */
  function samplePlan() {
    return {
      goal: "三個月內建立遊戲渲染（Game Rendering）的扎實基礎，並完成一個小型渲染器專案",
      startDate: todayISO(),
      weeks: 12,
      dailyHours: 3,
      phases: [
        {
          id: uid(), title: "數學與渲染基礎", startWeek: 1, endWeek: 2, auto: true,
          topics: ["線性代數複習（向量、矩陣、變換）", "渲染管線（Graphics Pipeline）總覽", "座標系統與投影"],
          tasks: [
            task("看完 3Blue1Brown《Essence of Linear Algebra》系列", false),
            task("閱讀《Real-Time Rendering》第 1–2 章（選擇性）", false),
            task("用 Scratchapixel 的文章補齊渲染管線概念", false)
          ]
        },
        {
          id: uid(), title: "圖形 API 入門（OpenGL）", startWeek: 3, endWeek: 4, auto: true,
          topics: ["OpenGL / 視窗與著色器", "頂點緩衝與 VAO/VBO", "矩陣變換實作"],
          tasks: [
            task("完成 LearnOpenGL 的 Getting Started 全部章節", false),
            task("寫出第一個三角形 + 變換的程式", false)
          ]
        },
        {
          id: uid(), title: "光照與材質", startWeek: 5, endWeek: 6, auto: true,
          topics: ["Phong / Blinn-Phong 光照", "材質與光源參數", "PBR 基礎概念"],
          tasks: [
            task("實作 LearnOpenGL 的光照章節", false),
            task("讀《Real-Time Rendering》光照相關章節", false)
          ]
        },
        {
          id: uid(), title: "貼圖與進階管線", startWeek: 7, endWeek: 8, auto: true,
          topics: ["UV 貼圖與紋理", "深度緩衝與陰影", "Framebuffer、天空盒"],
          tasks: [
            task("完成 LearnOpenGL 貼圖與陰影實作", false),
            task("整合到自己的練習專案中", false)
          ]
        },
        {
          id: uid(), title: "實作專案：小型渲染器", startWeek: 9, endWeek: 10, auto: true,
          topics: ["光柵化渲染器（CPU）", "光線追蹤入門", "專案整合"],
          tasks: [
            task("跟著《Ray Tracing in One Weekend》完成前幾章", false),
            task("用 OpenGL 完成一個可互動的小場景", false)
          ]
        },
        {
          id: uid(), title: "優化與作品整理", startWeek: 11, endWeek: 12, auto: true,
          topics: ["效能剖析（Profiling）", "學習筆記整理", "Demo 錄製與回顧"],
          tasks: [
            task("用 RenderDoc 剖析一次自己的場景", false),
            task("整理學習筆記與 Demo 影片", false)
          ]
        }
      ],
      materials: [
        material("教學影片", "3Blue1Brown — Essence of Linear Algebra", "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", "向量、矩陣、變換的直觀理解，第 1–2 週搭配使用。", 1),
        material("公開課", "GAMES101 — 現代電腦圖形學入門（閆令琪）", "https://sites.cs.ucsb.edu/~lingqi/teaching/games101.html", "中文公開課，第 1–4 週選擇性觀看對應單元。", 1),
        material("網站", "Scratchapixel", "https://www.scratchapixel.com/", "渲染管線與光線追蹤的詳細圖文解說。", 2),
        material("網站", "LearnOpenGL", "https://learnopengl.com/", "OpenGL 經典免費教材，第 3–8 週主線。", 3),
        material("書", "《Real-Time Rendering》4th Edition", "https://www.realtimerendering.com/", "工具書，按需查閱對應章節，不必一次讀完。", 3),
        material("書", "《Ray Tracing in One Weekend》", "https://raytracing.github.io/", "光線追蹤入門小書，第 9–10 週使用。", 9),
        material("影片", "GDC Vault — Rendering 相關演講", "https://www.gdcvault.com/", "第 11–12 週觀看 1–2 場實務演講，拓展視野。", 11)
      ],
      updatedAt: new Date().toISOString()
    };
  }

  function welcomeMessages() {
    return [
      {
        role: "assistant",
        content: "你好！我是你的 AI 學習導師 🎓\n\n你可以告訴我想學什麼、希望多久完成、每天能投入多少時間，我會：\n1. 給你學習路徑與資源建議；\n2. 排出每週任務與日程表；\n3. 和你討論、修改，達成共識後寫入你的學習規劃。\n\n目前是「示範模式」（內建規則式導師）。到 ⚙️ 設定 填入 OpenAI 相容 API 後，即可獲得真正的 AI 規劃。\n\n可以先按下方「載入範例：遊戲渲染」看看效果，或直接輸入你的學習目標！",
        ts: Date.now()
      }
    ];
  }

  function defaultSettings() {
    return { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", apiKey: "", demoMode: true };
  }

  /* ---------- 正規化（防壞資料） ---------- */
  function normalizePlan(p) {
    if (!p || typeof p !== "object") return samplePlan();
    var out = {
      goal: typeof p.goal === "string" && p.goal ? p.goal : "我的學習計劃",
      startDate: typeof p.startDate === "string" ? p.startDate : todayISO(),
      weeks: Math.max(1, Math.min(104, parseInt(p.weeks, 10) || 8)),
      dailyHours: Math.max(0.5, Math.min(16, parseFloat(p.dailyHours) || 2)),
      phases: Array.isArray(p.phases) ? p.phases : [],
      materials: Array.isArray(p.materials) ? p.materials : [],
      updatedAt: new Date().toISOString()
    };
    out.phases = out.phases.map(function (ph) {
      return {
        id: ph.id || uid(),
        title: ph.title || "未命名階段",
        startWeek: Math.max(1, parseInt(ph.startWeek, 10) || 1),
        endWeek: Math.max(1, parseInt(ph.endWeek, 10) || 1),
        auto: !!ph.auto,
        topics: Array.isArray(ph.topics) ? ph.topics.filter(function (t) { return typeof t === "string"; }) : [],
        tasks: Array.isArray(ph.tasks)
          ? ph.tasks.map(function (t) { return typeof t === "string" ? task(t, false) : { id: t.id || uid(), text: t.text || "", done: !!t.done }; })
          : []
      };
    }).sort(function (a, b) { return a.startWeek - b.startWeek; });
    out.materials = out.materials.map(function (m) {
      return {
        id: m.id || uid(),
        type: m.type || "其他",
        title: m.title || "未命名材料",
        url: m.url || "",
        note: m.note || "",
        week: Math.max(1, parseInt(m.week, 10) || 1),
        done: !!m.done
      };
    });
    return out;
  }

  function normalizeChat(chat) {
    if (!Array.isArray(chat)) return welcomeMessages();
    return chat.filter(function (m) {
      return m && (m.role === "user" || m.role === "assistant" || m.role === "system") && typeof m.content === "string";
    }).map(function (m) {
      return { role: m.role, content: m.content, proposal: m.proposal || null, ts: m.ts || Date.now() };
    });
  }

  function normalizeSettings(s) {
    s = s || {};
    var d = defaultSettings();
    return {
      baseUrl: (s.baseUrl && s.baseUrl.trim()) || d.baseUrl,
      model: (s.model && s.model.trim()) || d.model,
      apiKey: typeof s.apiKey === "string" ? s.apiKey : "",
      demoMode: s.demoMode !== false
    };
  }

  /* ---------- Store ---------- */
  var data = null;

  function load() {
    if (data) return data;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        data = {
          plan: normalizePlan(parsed.plan),
          chat: normalizeChat(parsed.chat),
          settings: normalizeSettings(parsed.settings)
        };
        return data;
      }
    } catch (e) {
      console.warn("store: 讀取失敗，改用預設資料", e);
    }
    data = { plan: samplePlan(), chat: welcomeMessages(), settings: defaultSettings() };
    save();
    return data;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error("store: 儲存失敗", e);
    }
  }

  function reset() {
    data = { plan: samplePlan(), chat: welcomeMessages(), settings: defaultSettings() };
    save();
    return data;
  }

  function importData(obj) {
    obj = obj || {};
    data = {
      plan: normalizePlan(obj.plan),
      chat: normalizeChat(obj.chat),
      settings: normalizeSettings(obj.settings)
    };
    save();
    return data;
  }

  function mutatePlan(fn) {
    data.plan = normalizePlan(fn(data.plan));
    data.plan.updatedAt = new Date().toISOString();
    save();
    return data.plan;
  }

  function addMessage(msg) {
    data.chat.push({
      role: msg.role,
      content: msg.content || "",
      proposal: msg.proposal || null,
      ts: Date.now()
    });
    save();
    return data.chat;
  }

  function addMessages(msgs) {
    msgs.forEach(function (m) { addMessage(m); });
  }

  function planProgress(plan) {
    var total = 0, done = 0;
    (plan.phases || []).forEach(function (ph) {
      (ph.tasks || []).forEach(function (t) { total++; if (t.done) done++; });
    });
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  window.Store = {
    KEY: KEY,
    uid: uid,
    todayISO: todayISO,
    addDaysISO: addDaysISO,
    samplePlan: samplePlan,
    welcomeMessages: welcomeMessages,
    load: load,
    save: save,
    reset: reset,
    importData: importData,
    normalizePlan: normalizePlan,
    mutatePlan: mutatePlan,
    addMessage: addMessage,
    addMessages: addMessages,
    planProgress: planProgress,
    get plan() { return load().plan; },
    get chat() { return load().chat; },
    get settings() { return load().settings; }
  };
})();
