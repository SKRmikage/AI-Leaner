/* ============================================================
 * tutor.js — 內建「示範模式」規則式 AI 導師
 * 離線可用：依關鍵字產生學習路徑、階段、任務與材料；
 * 也支援常見修改需求（課業太忙、發現新資源、調整進度）。
 * ============================================================ */
(function () {
  "use strict";

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- 從使用者訊息猜參數 ---------- */
  function parseWeeks(text, fallback) {
    var m = text.match(/(\d+)\s*個?月/);
    if (m) return Math.max(1, Math.min(52, parseInt(m[1], 10) * 4));
    m = text.match(/(\d+)\s*(週|周|星期)/);
    if (m) return Math.max(1, Math.min(52, parseInt(m[1], 10)));
    m = text.match(/(\d+)\s*天/);
    if (m) return Math.max(1, Math.min(52, Math.ceil(parseInt(m[1], 10) / 7)));
    return fallback;
  }

  function parseHours(text, fallback) {
    var m = text.match(/每天\s*(\d+(?:\.\d+)?)\s*(小時|小時|hr|h)/i);
    if (m) return Math.max(0.5, Math.min(16, parseFloat(m[1])));
    m = text.match(/(\d+(?:\.\d+)?)\s*(小時|小時)/);
    if (m) return Math.max(0.5, Math.min(16, parseFloat(m[1])));
    return fallback;
  }

  function includesAny(text, words) {
    return words.some(function (w) { return text.indexOf(w) !== -1; });
  }

  /* ---------- 主題模板 ---------- */
  function detectTopic(text) {
    var t = text.toLowerCase();
    if (includesAny(t, ["遊戲渲染", "渲染", "graphics", "rendering", "opengl", "directx", "vulkan", "shader", "著色器"])) return topicGameRendering();
    if (includesAny(t, ["前端", "web frontend", "網頁開發", "react", "vue", "javascript", "typescript", "css"])) return topicFrontend();
    if (includesAny(t, ["機器學習", "machine learning", "深度學習", "deep learning", "ml", "ai", "神經網路", "pytorch", "tensorflow"])) return topicML();
    if (includesAny(t, ["後端", "backend", "server", "api", "資料庫", "database", "node.js", "系統設計"])) return topicBackend();
    if (includesAny(t, ["英文", "english", "toeic", "toefl", "ielts", "多益", "托福"])) return topicEnglish();
    if (includesAny(t, ["鋼琴", "吉他", "樂器", "音樂", "piano", "guitar"])) return topicMusic();
    if (includesAny(t, ["健身", "重訓", "跑步", "fitness", "workout"])) return topicFitness();
    return topicGeneric(t);
  }

  function topicGameRendering() {
    return {
      name: "遊戲渲染（Game Rendering）",
      weeks: 12, hours: 3,
      phases: [
        { title: "數學與渲染基礎", span: 2, topics: ["線性代數複習（向量、矩陣、變換）", "渲染管線（Graphics Pipeline）總覽", "座標系統與投影"], tasks: [
          "看完 3Blue1Brown《Essence of Linear Algebra》",
          "閱讀《Real-Time Rendering》第 1–2 章（選擇性）",
          "用 Scratchapixel 補齊渲染管線概念"
        ]},
        { title: "圖形 API 入門（OpenGL）", span: 2, topics: ["視窗與著色器", "頂點緩衝與 VAO/VBO", "矩陣變換實作"], tasks: [
          "完成 LearnOpenGL 的 Getting Started 章節",
          "寫出第一個三角形 + 變換程式"
        ]},
        { title: "光照與材質", span: 2, topics: ["Phong / Blinn-Phong 光照", "材質與光源參數", "PBR 基礎概念"], tasks: [
          "實作 LearnOpenGL 光照章節",
          "讀《Real-Time Rendering》光照章節"
        ]},
        { title: "貼圖與進階管線", span: 2, topics: ["UV 貼圖與紋理", "深度緩衝與陰影", "Framebuffer、天空盒"], tasks: [
          "完成 LearnOpenGL 貼圖與陰影實作",
          "整合進自己的練習專案"
        ]},
        { title: "實作專案：小型渲染器", span: 2, topics: ["光柵化渲染器（CPU）", "光線追蹤入門", "專案整合"], tasks: [
          "跟著《Ray Tracing in One Weekend》完成前幾章",
          "用 OpenGL 完成一個可互動的小場景"
        ]},
        { title: "優化與作品整理", span: 2, topics: ["效能剖析（Profiling）", "學習筆記整理", "Demo 錄製與回顧"], tasks: [
          "用 RenderDoc 剖析一次自己的場景",
          "整理學習筆記與 Demo 影片"
        ]}
      ],
      materials: [
        { type: "教學影片", title: "3Blue1Brown — Essence of Linear Algebra", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", note: "向量、矩陣、變換的直觀理解。", week: 1 },
        { type: "公開課", title: "GAMES101 — 現代電腦圖形學入門（閆令琪）", url: "https://sites.cs.ucsb.edu/~lingqi/teaching/games101.html", note: "中文公開課，對應單元選擇性觀看。", week: 1 },
        { type: "網站", title: "Scratchapixel", url: "https://www.scratchapixel.com/", note: "渲染管線與光線追蹤的詳細圖文解說。", week: 2 },
        { type: "網站", title: "LearnOpenGL", url: "https://learnopengl.com/", note: "OpenGL 經典免費教材，主線資源。", week: 3 },
        { type: "書", title: "《Real-Time Rendering》4th Edition", url: "https://www.realtimerendering.com/", note: "工具書，按需查閱，不必一次讀完。", week: 3 },
        { type: "書", title: "《Ray Tracing in One Weekend》", url: "https://raytracing.github.io/", note: "光線追蹤入門小書。", week: 9 },
        { type: "影片", title: "GDC Vault — Rendering 相關演講", url: "https://www.gdcvault.com/", note: "實務演講，拓展視野。", week: 11 }
      ]
    };
  }

  function topicFrontend() {
    return {
      name: "前端開發（Frontend）",
      weeks: 10, hours: 2,
      phases: [
        { title: "HTML/CSS 與瀏覽器基礎", span: 2, topics: ["語意化 HTML", "Flexbox / Grid", "CSS 變數與響應式設計"], tasks: [
          "完成 freeCodeCamp 的 Responsive Web Design 課程",
          "仿刻一個真實網站版面"
        ]},
        { title: "JavaScript 核心", span: 2, topics: ["ES6+ 語法", "DOM 操作與事件", "非同步（Promise / async）"], tasks: [
          "讀《JavaScript.info》對應章節",
          "做 3 個小型互動元件"
        ]},
        { title: "前端框架（React）", span: 2, topics: ["元件與 Props/State", "Hooks", "路由與狀態管理"], tasks: [
          "完成 React 官方教學",
          "用 React 重做之前的元件"
        ]},
        { title: "工具鏈與工程化", span: 2, topics: ["npm / Vite", "TypeScript 基礎", "Git 工作流"], tasks: [
          "把專案改成 Vite + TypeScript",
          "練習 Git 分支與 PR"
        ]},
        { title: "實作專案", span: 2, topics: ["需求拆解", "API 串接", "部署上線"], tasks: [
          "完成一個完整的前端專案（例如待辦/部落格）",
          "部署到 GitHub Pages / Vercel"
        ]}
      ],
      materials: [
        { type: "網站", title: "MDN Web Docs", url: "https://developer.mozilla.org/zh-TW/", note: "HTML/CSS/JS 權威文件。", week: 1 },
        { type: "課程", title: "freeCodeCamp — Responsive Web Design", url: "https://www.freecodecamp.org/learn/", note: "免費認證課程。", week: 1 },
        { type: "網站", title: "JavaScript.info", url: "https://zh.javascript.info/", note: "現代 JavaScript 教學。", week: 3 },
        { type: "文件", title: "React 官方文件", url: "https://react.dev/learn", note: "以官方教學為主。", week: 5 },
        { type: "書", title: "《You Don't Know JS Yet》", url: "https://github.com/getify/You-Dont-Know-JS", note: "JS 深入理解。", week: 3 },
        { type: "影片", title: "Vite 官方教學", url: "https://vitejs.dev/guide/", note: "工程化工具。", week: 7 }
      ]
    };
  }

  function topicML() {
    return {
      name: "機器學習 / 深度學習",
      weeks: 12, hours: 2,
      phases: [
        { title: "數學與 Python 基礎", span: 2, topics: ["線性代數與微積分複習", "NumPy / Pandas", "資料視覺化"], tasks: [
          "完成 Kaggle 的 Python 與 NumPy 課程",
          "用 Matplotlib 練習視覺化"
        ]},
        { title: "機器學習基礎", span: 2, topics: ["監督式學習", "模型評估", "Overfitting 與 Regularization"], tasks: [
          "完成 Andrew Ng《Machine Learning Specialization》前幾門課",
          "用 scikit-learn 跑完一份入門專案"
        ]},
        { title: "深度學習核心", span: 2, topics: ["神經網路基礎", "反向傳播", "PyTorch 入門"], tasks: [
          "完成 PyTorch 官方 60 分鐘入門",
          "實作一個 MNIST 分類器"
        ]},
        { title: "卷積神經網路（CNN）", span: 2, topics: ["卷積原理", "常見架構（ResNet 等）", "資料擴增"], tasks: [
          "完成 CS231n 的 CNN 章節",
          "訓練一個影像分類模型"
        ]},
        { title: "實作專案", span: 2, topics: ["資料收集與清理", "模型訓練與評估", "部署 API"], tasks: [
          "選一個 Kaggle 競賽從頭跑完",
          "把模型包成 API 部署"
        ]},
        { title: "進階主題", span: 2, topics: ["Transformer / LLM 基礎", "RAG 概念", "論文閱讀"], tasks: [
          "讀《Attention Is All You Need》",
          "做一個 LLM 小應用（如問答機器人）"
        ]}
      ],
      materials: [
        { type: "課程", title: "Kaggle Learn — Python / NumPy", url: "https://www.kaggle.com/learn", note: "免費、互動式。", week: 1 },
        { type: "課程", title: "Andrew Ng — Machine Learning Specialization", url: "https://www.coursera.org/specializations/machine-learning-introduction", note: "經典入門。", week: 3 },
        { type: "書", title: "《Hands-On Machine Learning with Scikit-Learn, Keras & TensorFlow》", url: "https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/", note: "實作導向工具書。", week: 3 },
        { type: "文件", title: "PyTorch 官方教學", url: "https://pytorch.org/tutorials/", note: "入門到進階。", week: 5 },
        { type: "公開課", title: "CS231n — Stanford CNN 課程", url: "http://cs231n.stanford.edu/", note: "電腦視覺與 CNN 經典課程。", week: 7 },
        { type: "論文", title: "Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762", note: "Transformer 原始論文。", week: 11 }
      ]
    };
  }

  function topicBackend() {
    return {
      name: "後端開發（Backend）",
      weeks: 10, hours: 2,
      phases: [
        { title: "程式語言與 HTTP 基礎", span: 2, topics: ["Node.js / Python 基礎", "HTTP 與 REST", "JSON 與 API 設計"], tasks: [
          "完成 Node.js 官方入門（或 Python Flask 教學）",
          "用 Postman 練習 API 呼叫"
        ]},
        { title: "資料庫", span: 2, topics: ["關聯式資料庫與 SQL", "ORM 基礎", "索引與正規化"], tasks: [
          "完成 SQLBolt 互動課程",
          "設計一個簡單的資料庫 schema"
        ]},
        { title: "後端框架", span: 2, topics: ["Express / FastAPI", "Middleware 與路由", "錯誤處理"], tasks: [
          "用框架寫一個 CRUD API",
          "加上驗證與錯誤處理"
        ]},
        { title: "認證與安全性", span: 2, topics: ["Session / JWT", "密碼雜湊", "基本安全防護"], tasks: [
          "實作註冊登入 API",
          "練習 OWASP Top 10 檢查清單"
        ]},
        { title: "部署與實作專案", span: 2, topics: ["Docker 基礎", "雲端部署", "CI/CD 入門"], tasks: [
          "把專案 Docker 化並部署",
          "完成一個完整後端專案"
        ]}
      ],
      materials: [
        { type: "網站", title: "Node.js 官方文件", url: "https://nodejs.org/zh-tw/learn", note: "官方學習資源。", week: 1 },
        { type: "網站", title: "SQLBolt", url: "https://sqlbolt.com/", note: "互動式 SQL 教學。", week: 3 },
        { type: "書", title: "《Designing Data-Intensive Applications》", url: "https://dataintensive.net/", note: "進階系統設計，選擇性章節。", week: 3 },
        { type: "文件", title: "Express 官方文件", url: "https://expressjs.com/", note: "Node.js 後端框架。", week: 5 },
        { type: "課程", title: "Docker 入門（官方 Get Started）", url: "https://docs.docker.com/get-started/", note: "容器化基礎。", week: 9 },
        { type: "網站", title: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/", note: "安全性檢查清單。", week: 7 }
      ]
    };
  }

  function topicEnglish() {
    return {
      name: "英文學習",
      weeks: 8, hours: 1,
      phases: [
        { title: "診斷與目標設定", span: 1, topics: ["程度測驗", "目標拆解（聽說讀寫）", "學習習慣建立"], tasks: [
          "做一次免費程度測驗（如 EF SET）",
          "寫下 3 個具體目標"
        ]},
        { title: "單字與聽力", span: 2, topics: ["高頻單字", "慢速英文 Podcast", "跟讀練習"], tasks: [
          "每天用 Anki 背 20 個單字",
          "每天聽 20 分鐘 Podcast 並跟讀"
        ]},
        { title: "口說與發音", span: 2, topics: ["發音規則", "日常對話句型", "自我錄音檢討"], tasks: [
          "每天錄 2 分鐘自我介紹",
          "完成一輪線上口說練習（如 HelloTalk）"
        ]},
        { title: "閱讀與文法", span: 2, topics: ["短篇新聞閱讀", "文法重點", "筆記整理"], tasks: [
          "每週讀 3 篇 BBC Learning English 文章",
          "整理自己的文法錯誤筆記"
        ]},
        { title: "模擬應用", span: 1, topics: ["寫作練習", "模擬對話", "檢討調整"], tasks: [
          "完成一篇 200 字英文短文",
          "做一次模擬口試"
        ]}
      ],
      materials: [
        { type: "網站", title: "EF SET 程度測驗", url: "https://www.efset.org/zh-tw/", note: "免費英文程度測驗。", week: 1 },
        { type: "工具", title: "Anki", url: "https://apps.ankiweb.net/", note: "間隔重複背單字。", week: 2 },
        { type: "Podcast", title: "BBC Learning English — 6 Minute English", url: "https://www.bbc.co.uk/learningenglish/", note: "聽力與單字。", week: 2 },
        { type: "App", title: "HelloTalk", url: "https://www.hellotalk.com/", note: "與母語者交換語言。", week: 4 },
        { type: "網站", title: "VoiceTube", url: "https://tw.voicetube.com/", note: "看影片學英文。", week: 3 }
      ]
    };
  }

  function topicMusic() {
    return {
      name: "樂器學習（以鋼琴為例）",
      weeks: 10, hours: 1,
      phases: [
        { title: "基礎樂理與姿勢", span: 2, topics: ["五線譜與節拍", "正確坐姿與手型", "C 大調音階"], tasks: [
          "完成基礎樂理線上課程（如 musictheory.net）",
          "每天練習音階 15 分鐘"
        ]},
        { title: "雙手協調與和弦", span: 2, topics: ["常見和弦", "左右手分工", "簡單視譜"], tasks: [
          "練習《哈農》前幾首",
          "彈熟一首簡單歌曲"
        ]},
        { title: "節奏與表情", span: 2, topics: ["節奏訓練", "力度與踏板", "樂句處理"], tasks: [
          "用節拍器練習不同速度",
          "錄音回放並檢討"
        ]},
        { title: "曲目練習", span: 2, topics: ["選定曲目", "分段練習", "背譜"], tasks: [
          "完成一首中等難度曲目",
          "錄製練習影片"
        ]},
        { title: "發表與持續進步", span: 2, topics: ["成果錄音", "下一步規劃", "維持練習習慣"], tasks: [
          "錄製完整演奏",
          "與老師或社群分享並取得回饋"
        ]}
      ],
      materials: [
        { type: "網站", title: "musictheory.net", url: "https://www.musictheory.net/", note: "免費樂理練習。", week: 1 },
        { type: "書", title: "《哈農鋼琴教本》", url: "", note: "手指練習經典。", week: 2 },
        { type: "影片", title: "YouTube 鋼琴教學頻道（如 Pianote）", url: "https://www.youtube.com/@PianoteOfficial", note: "跟著影片練習。", week: 3 },
        { type: "App", title: "Sight Reading Factory", url: "https://www.sightreadingfactory.com/", note: "視譜練習。", week: 4 }
      ]
    };
  }

  function topicFitness() {
    return {
      name: "健身 / 運動訓練",
      weeks: 8, hours: 1,
      phases: [
        { title: "評估與基礎動作", span: 1, topics: ["體能評估", "深蹲/伏地挺身/划船動作學習", "熱身與收操"], tasks: [
          "學會 5 個基本動作的標準姿勢",
          "建立每週 3 練的習慣"
        ]},
        { title: "肌力適應期", span: 2, topics: ["漸進式超負荷", "訓練量安排", "恢復與睡眠"], tasks: [
          "執行全身性訓練菜單",
          "記錄每組重量與次數"
        ]},
        { title: "分化訓練", span: 2, topics: ["推拉腿（PPL）分化", "核心訓練", "有氧安排"], tasks: [
          "切換到 PPL 每週 4–6 練",
          "加入 2 次有氧"
        ]},
        { title: "強度與進階", span: 2, topics: ["大重量訓練", "動作變化", "Deload 週"], tasks: [
          "挑戰 5RM 主要動作",
          "安排一次 deload 週"
        ]},
        { title: "評估與維持", span: 1, topics: ["成果評估", "飲食微調", "長期計畫"], tasks: [
          "重測體能數據並記錄",
          "訂定下一個 8 週計畫"
        ]}
      ],
      materials: [
        { type: "網站", title: "ExRx.net", url: "https://exrx.net/", note: "動作庫與肌肉圖解。", week: 1 },
        { type: "影片", title: "Jeff Nippard — Fundamentals Series", url: "https://www.youtube.com/@jeffnippard", note: "科學化訓練觀念。", week: 1 },
        { type: "App", title: "Strong / Hevy 訓練記錄 App", url: "https://www.hevy.com/", note: "記錄訓練量。", week: 2 },
        { type: "書", title: "《Starting Strength》", url: "", note: "基礎力量訓練經典。", week: 3 }
      ]
    };
  }

  function topicGeneric(text) {
    return {
      name: "「" + (text.trim().slice(0, 40) || "我的目標") + "」",
      weeks: 8, hours: 2,
      phases: [
        { title: "打底：認識全貌", span: 2, topics: ["建立整體知識地圖", "找齊推薦資源", "設定里程碑"], tasks: [
          "搜尋並列出 5 個公認優質資源",
          "寫下學習目標與驗收標準"
        ]},
        { title: "核心技能（一）", span: 2, topics: ["跟著主線教材學習", "做筆記與練習", "每週小結"], tasks: [
          "完成主線教材的前半",
          "每週末寫一篇學習小結"
        ]},
        { title: "核心技能（二）", span: 2, topics: ["進階主題", "實作練習", "請教社群"], tasks: [
          "完成主線教材後半",
          "參與一次相關社群討論"
        ]},
        { title: "實作專案", span: 2, topics: ["選題", "動手實作", "回饋修正"], tasks: [
          "做一個能展示學習成果的小專案",
          "請別人試用並收集意見"
        ]}
      ],
      materials: [
        { type: "課程", title: "Coursera / edX 相關入門課程", url: "https://www.coursera.org/", note: "以你目標領域的知名課程為主。", week: 1 },
        { type: "影片", title: "YouTube 教學播放清單", url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(text.slice(0, 20)) + "+教學", note: "搜尋該領域的優質頻道。", week: 1 },
        { type: "文件", title: "官方文件 / 手冊", url: "", note: "以官方文件為最終依據。", week: 3 },
        { type: "書", title: "該領域的經典書籍", url: "", note: "在 Amazon / 圖書館搜尋評價最高的書。", week: 3 },
        { type: "社群", title: "Reddit / Discord / 中文論壇", url: "", note: "遇到問題時請教社群。", week: 5 }
      ]
    };
  }

  /* ---------- 把模板變成完整 proposal ---------- */
  function buildProposal(topic, weeks, hours, startDate, extra) {
    extra = extra || {};
    var phases = clone(topic.phases);
    var totalSpan = phases.reduce(function (s, p) { return s + p.span; }, 0);
    var cursor = 1;
    phases = phases.map(function (p, i) {
      var span = Math.max(1, Math.round((p.span / totalSpan) * weeks));
      if (i === phases.length - 1) span = Math.max(1, weeks - cursor + 1);
      var start = cursor;
      var end = Math.min(weeks, start + span - 1);
      cursor = end + 1;
      return {
        id: Store.uid(), title: p.title, startWeek: start, endWeek: end, auto: true,
        topics: p.topics, tasks: p.tasks.map(function (t) { return { id: Store.uid(), text: t, done: false }; })
      };
    });
    var materials = clone(topic.materials).map(function (m) {
      return { id: Store.uid(), type: m.type, title: m.title, url: m.url, note: m.note, week: Math.min(weeks, Math.max(1, m.week)), done: false };
    });
    if (extra.newMaterial) materials.unshift(extra.newMaterial);
    return {
      goal: extra.goal || ("在 " + weeks + " 週內完成「" + topic.name + "」的系統化學習，並完成實作驗收"),
      startDate: startDate,
      weeks: weeks,
      dailyHours: hours,
      phases: phases,
      materials: materials,
      updatedAt: new Date().toISOString()
    };
  }

  /* ---------- 常見修改需求 ---------- */
  function revise(plan, text) {
    var p = clone(plan);
    var reasons = [];

    if (includesAny(text, ["課業太多", "太忙", "沒時間", "時間不夠", "太趕", "忙不過來", "重新安排", "調整進度"])) {
      var newHours = Math.max(0.5, (parseFloat(p.dailyHours) || 2) - 1);
      var addWeeks = 4;
      p.dailyHours = newHours;
      p.weeks = Math.min(52, (parseInt(p.weeks, 10) || 8) + addWeeks);
      p.phases.forEach(function (ph) {
        ph.startWeek = Math.min(p.weeks, ph.startWeek + Math.round(addWeeks / 2));
        ph.endWeek = Math.min(p.weeks, ph.endWeek + Math.round(addWeeks / 2));
      });
      reasons.push("偵測到你最近比較忙：已把每天學習時數降為 " + newHours + " 小時，並將總週數延長到 " + p.weeks + " 週，後續階段順延。");
    }

    if (includesAny(text, ["新資源", "發現", "更好", "替代", "取代", "換成", "推薦"])) {
      var urlMatch = text.match(/https?:\/\/[^\s，。、]+/);
      var titleGuess = (text.match(/「([^」]+)」/) || [])[1] || (urlMatch ? "你發現的新資源" : "");
      var typeGuess = (text.match(/是(?:一本|一個|一部|一份|一門|網站|影片|課程|書|文件)\s*(書|影片|課程|網站|文件|公開課|文章)/) || [])[1] || "其他";
      var weekGuess = Math.max(1, Math.min(p.weeks, Math.round((p.weeks || 8) / 2)));
      p.materials.push({
        id: Store.uid(), type: typeGuess, title: titleGuess || "新資源", url: urlMatch || "",
        note: "由你發現、經導師評估後加入。", week: weekGuess, done: false
      });
      reasons.push("已將你提供的新資源加入材料清單（第 " + weekGuess + " 週）。若你希望替換某一項，直接告訴我要換掉哪一個。");
    }

    if (includesAny(text, ["太簡單", "太難", "太快", "太慢", "提早", "加快", "放慢"])) {
      if (includesAny(text, ["加快", "提早", "太慢", "太簡單"])) {
        p.weeks = Math.max(2, (parseInt(p.weeks, 10) || 8) - 2);
        reasons.push("已將總週數縮短為 " + p.weeks + " 週，節奏加快。");
      } else {
        p.weeks = Math.min(52, (parseInt(p.weeks, 10) || 8) + 2);
        reasons.push("已將總週數延長為 " + p.weeks + " 週，節奏放慢。");
      }
      p.phases.forEach(function (ph, i) {
        var span = Math.max(1, Math.round(((ph.endWeek - ph.startWeek + 1) / 10) * p.weeks));
        var start = i === 0 ? 1 : p.phases[i - 1].endWeek + 1;
        ph.startWeek = start;
        ph.endWeek = Math.min(p.weeks, start + span - 1);
      });
    }

    if (reasons.length === 0) {
      reasons.push("我根據你的要求調整了規劃細節。請看看新的建議，或直接告訴我要改哪裡。");
    }

    return { plan: p, reasons: reasons };
  }

  /* ---------- 主入口 ---------- */
  function generate(lastUserText, currentPlan) {
    var text = lastUserText || "";
    var topic = detectTopic(text);
    var weeks = parseWeeks(text, topic.weeks);
    var hours = parseHours(text, topic.hours);
    var startDate = currentPlan && currentPlan.startDate ? currentPlan.startDate : Store.todayISO();
    var isModification = includesAny(text, ["改", "調整", "修改", "換", "更新", "重新", "太忙", "課業", "新資源", "加快", "放慢", "縮短", "延長", "移除", "刪掉", "加入", "新增"]);

    var proposal;
    var reasons = [];
    var mode = "new";

    if (isModification && currentPlan && currentPlan.phases && currentPlan.phases.length) {
      var r = revise(currentPlan, text);
      proposal = r.plan;
      reasons = r.reasons;
      mode = "revise";
      weeks = proposal.weeks;
      hours = proposal.dailyHours;
      // 更新 goal 的週數描述
      proposal.goal = (proposal.goal || "").replace(/\d+\s*週內/, weeks + " 週內") || ("在 " + weeks + " 週內完成系統化學習");
      // 若使用者只是回覆「新資源」，補上 topic 判斷的額外材料
      if (includesAny(text, ["新資源", "發現", "更好", "替代"])) {
        // revise() 已處理
      }
    } else {
      proposal = buildProposal(topic, weeks, hours, startDate);
      mode = "new";
    }

    var head;
    if (mode === "revise") {
      head = "好的，我已經根據你的最新需求重新調整規劃 👌\n\n" + reasons.join("\n") + "\n\n請先看看下方的建議版本；確認沒問題就按「採納此規劃」寫入日程表，也可以繼續跟我討論細節。";
    } else {
      var match = text.match(/每天\s*(\d+(?:\.\d+)?)\s*小時/);
      head = "我建議你花 **" + weeks + " 週**、每天 **" + hours + " 小時** 完成「" + topic.name + "」的系統學習。\n\n學習順序建議：先建立基礎 → 跟著主線教材練習 → 實作專案驗收 → 最後整理作品。我已經把每週任務與推薦材料排好了，請看下方的建議規劃卡 👇\n\n你可以：\n- 按「檢視建議規劃」看完整內容；\n- 按「採納此規劃」讓我把材料與日程寫入「學習規劃」；\n- 或直接告訴我要調整的地方（例如每週時數、總長度、想換資源）。";
    }

    var intro = "（示範模式 · 規則式導師）\n\n" + head;

    return {
      content: intro,
      proposal: proposal,
      mode: mode
    };
  }

  window.Tutor = { generate: generate, detectTopic: detectTopic };
})();
