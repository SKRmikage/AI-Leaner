/* ============================================================
 * app.js — UI 層：對話、規劃、日程表、材料、設定、工作流
 * 工作流：查詢 → 導師建議 → 檢視建議 → 討論 → 採納寫入規劃
 *         → 檢視/自行修改 → 再與導師討論修改
 * ============================================================ */
(function () {
  "use strict";

  var modalRoot = document.getElementById("modal-root");
  var toastRoot = document.getElementById("toast-root");
  var busy = false;

  function $(sel) { return document.querySelector(sel); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }

  function fmtDate(iso) { return iso ? String(iso) : "—"; }

  function weekRange(plan, w) {
    if (!plan || !plan.startDate) return "";
    var d = new Date(plan.startDate + "T00:00:00");
    d.setDate(d.getDate() + (w - 1) * 7);
    var s = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    d.setDate(d.getDate() + 6);
    var e = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return s + " ~ " + e;
  }

  /* 迷你 Markdown：**粗體**、反引號、網址、換行 */
  function miniMarkdown(text) {
    var s = esc(text);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/(https?:\/\/[^\s<"')]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/\n/g, "<br>");
    return s;
  }

  function toast(msg, isErr) {
    var d = document.createElement("div");
    d.className = "toast" + (isErr ? " err" : "");
    d.textContent = msg;
    toastRoot.appendChild(d);
    setTimeout(function () { d.remove(); }, 3200);
  }

  function scrollChatBottom() {
    var sc = document.querySelector(".chat-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  /* ================= 頁籤 ================= */
  function switchView(name) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-view") === name);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + name);
    });
    if (name === "chat") scrollChatBottom();
  }

  /* ================= Modal ================= */
  function openModal(title, fields, onSubmit, opts) {
    opts = opts || {};
    var rows = fields.map(function (f) {
      var label = "<label>" + esc(f.label) + "</label>";
      var input;
      if (f.type === "textarea") {
        input = '<textarea id="mf-' + f.key + '" rows="' + (f.rows || 4) + '" placeholder="' + esc(f.placeholder || "") + '">' + esc(f.value || "") + "</textarea>";
      } else if (f.type === "select") {
        var options = (f.options || []).map(function (o) {
          var v = typeof o === "string" ? o : o.v;
          var l = typeof o === "string" ? o : o.label;
          return '<option value="' + esc(v) + '"' + (String(f.value) === String(v) ? " selected" : "") + ">" + esc(l) + "</option>";
        }).join("");
        input = '<select id="mf-' + f.key + '">' + options + "</select>";
      } else {
        var attrs = 'id="mf-' + f.key + '" type="' + (f.type || "text") + '"';
        if (f.type === "number") {
          attrs += ' step="' + (f.step || "1") + '" min="' + (f.min != null ? f.min : "") + '"';
        }
        attrs += ' value="' + esc(f.value != null ? f.value : "") + '"';
        if (f.placeholder) attrs += ' placeholder="' + esc(f.placeholder) + '"';
        input = "<input " + attrs + " />";
      }
      return '<div class="' + (f.row ? "row2" : "") + '"><div>' + label + input + "</div></div>";
    }).join("");

    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = '<div class="modal"><h3>' + esc(title) + '</h3><form class="modal-form">' +
      rows +
      '<div class="modal-actions"><button type="button" class="btn" data-act="cancel">取消</button>' +
      '<button type="submit" class="btn btn-primary">' + esc(opts.submitLabel || "儲存") + "</button></div></form></div>";

    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector("[data-act=cancel]").addEventListener("click", function () { backdrop.remove(); });
    backdrop.querySelector(".modal-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var values = {};
      fields.forEach(function (f) {
        var node = document.getElementById("mf-" + f.key);
        if (!node) return;
        if (f.type === "number") values[f.key] = parseFloat(node.value);
        else values[f.key] = node.value;
      });
      onSubmit(values, backdrop);
    });

    modalRoot.innerHTML = "";
    modalRoot.appendChild(backdrop);
  }

  function closeModal() { modalRoot.innerHTML = ""; }

  /* ================= 對話 ================= */
  function renderChat() {
    var list = $("#chat-list");
    list.innerHTML = "";
    Store.chat.forEach(function (m) {
      var wrap = document.createElement("div");
      var roleCls = m.role === "user" ? "user" : (m.role === "system" ? "system" : "assistant");
      wrap.className = "msg " + roleCls;

      var avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = m.role === "user" ? "🧑" : (m.role === "system" ? "ℹ️" : "🎓");

      var bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = miniMarkdown(m.content);
      if (m.proposal) bubble.appendChild(proposalNode(m.proposal));

      wrap.appendChild(avatar);
      wrap.appendChild(bubble);
      list.appendChild(wrap);
    });

    if (busy) {
      var t = document.createElement("div");
      t.className = "msg assistant";
      t.innerHTML = '<div class="avatar">🎓</div><div class="bubble typing">導師思考中…</div>';
      list.appendChild(t);
    }
    scrollChatBottom();
  }

  function proposalNode(proposal) {
    var p = proposal || {};
    var phases = p.phases || [];
    var mats = p.materials || [];
    var card = document.createElement("div");
    card.className = "proposal-card";
    card.innerHTML =
      "<h4>📋 建議規劃</h4>" +
      '<div class="proposal-meta">' +
      "<span>🗓️ " + esc(String(p.weeks || "?") + " 週") + "</span>" +
      "<span>⏱️ 每天 " + esc(String(p.dailyHours != null ? p.dailyHours : "?")) + " 小時</span>" +
      "<span>🧩 " + phases.length + " 個階段</span>" +
      "<span>📚 " + mats.length + " 項材料</span>" +
      "</div>" +
      '<div class="proposal-actions">' +
      '<button type="button" class="btn btn-sm" data-act="view">檢視建議規劃</button>' +
      '<button type="button" class="btn btn-sm btn-primary" data-act="accept">✅ 採納此規劃</button>' +
      "</div>";
    card.querySelector("[data-act=view]").addEventListener("click", function () { showProposal(p); });
    card.querySelector("[data-act=accept]").addEventListener("click", function () { acceptProposal(p); });
    return card;
  }

  function showProposal(p) {
    var phases = (p.phases || []).map(function (ph) {
      return "• " + esc(ph.title) + "（第 " + ph.startWeek + "–" + ph.endWeek + " 週）：" + esc((ph.topics || []).join("、"));
    }).join("<br>");
    var mats = (p.materials || []).map(function (m) {
      return "• [" + esc(m.type) + "] " + esc(m.title) +
        (m.url ? ' — <a href="' + esc(m.url) + '" target="_blank" rel="noopener">連結</a>' : "") +
        (m.note ? "（" + esc(m.note) + "）" : "");
    }).join("<br>");
    openModal("📋 建議規劃詳情", [], function () {}, { submitLabel: "關閉" });
    var form = modalRoot.querySelector(".modal-form");
    form.innerHTML =
      '<div class="overview-grid">' +
      '<div class="overview-item"><div class="k">目標</div><div class="v">' + esc(p.goal || "—") + "</div></div>" +
      '<div class="overview-item"><div class="k">總週數</div><div class="v">' + esc(String(p.weeks || "—")) + "</div></div>" +
      '<div class="overview-item"><div class="k">每天時數</div><div class="v">' + esc(String(p.dailyHours != null ? p.dailyHours : "—")) + "</div></div>" +
      '<div class="overview-item"><div class="k">開始日期</div><div class="v">' + esc(fmtDate(p.startDate)) + "</div></div>" +
      "</div>" +
      '<h4 style="margin:16px 0 6px">階段</h4><div style="font-size:13.5px">' + (phases || "（無）") + "</div>" +
      '<h4 style="margin:16px 0 6px">學習材料</h4><div style="font-size:13.5px">' + (mats || "（無）") + "</div>" +
      '<h4 style="margin:16px 0 6px">JSON</h4><pre class="plan-preview">' + esc(JSON.stringify(p, null, 2)) + "</pre>" +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-primary" data-act="accept">✅ 採納此規劃</button>' +
      '<button type="button" class="btn" data-act="cancel">關閉</button></div>';
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.querySelector("[data-act=cancel]").addEventListener("click", closeModal);
    form.querySelector("[data-act=accept]").addEventListener("click", function () {
      closeModal();
      acceptProposal(p);
    });
  }

  function acceptProposal(p) {
    if (!p || !p.phases) { toast("這份建議規劃格式不完整", true); return; }
    if (!confirm("確定採納這份建議規劃嗎？目前的規劃與任務進度會被這份新規劃取代。")) return;
    Store.mutatePlan(function () { return p; });
    Store.addMessage({
      role: "system",
      content: "✅ 已採納導師的建議規劃：學習材料與日程表已寫入「📅 學習規劃」。你可以直接在那裡修改，或繼續回來與導師討論。"
    });
    renderAll();
    switchView("plan");
    toast("已採納規劃 ✅");
  }

  async function sendChat() {
    var input = $("#chat-input");
    var text = input.value.trim();
    if (!text || busy) return;
    Store.addMessage({ role: "user", content: text });
    input.value = "";
    busy = true;
    var btn = $("#chat-send");
    btn.disabled = true;
    btn.textContent = "思考中…";
    renderChat();

    var r = await AI.reply(text, Store.chat, Store.plan, Store.settings);
    Store.addMessage({ role: "assistant", content: r.content, proposal: r.proposal || null });

    busy = false;
    btn.disabled = false;
    btn.textContent = "傳送";
    renderChat();
  }

  function loadExample() {
    if (!confirm("這會以「遊戲渲染」範例取代目前的規劃與對話，確定嗎？")) return;
    Store.reset();
    var q = "我想學習遊戲渲染，打算三個月內完成，每天能花 3 小時。可以幫我規劃學習路徑和日程表嗎？";
    Store.addMessage({ role: "user", content: q });
    var r = Tutor.generate(q, Store.plan);
    Store.addMessage({ role: "assistant", content: r.content, proposal: r.proposal });
    renderAll();
    switchView("chat");
    toast("已載入範例：遊戲渲染 🎮");
  }

  /* ================= 規劃總覽 ================= */
  function renderOverview() {
    var plan = Store.plan;
    var pct = Store.planProgress(plan);
    var box = $("#plan-overview");
    box.innerHTML =
      "<h3>🎯 學習目標</h3>" +
      '<div class="overview-grid">' +
      '<div class="overview-item" style="grid-column:span 2"><div class="k">目標</div><div class="v">' + esc(plan.goal) + "</div></div>" +
      '<div class="overview-item"><div class="k">開始日期</div><div class="v">' + esc(fmtDate(plan.startDate)) + "</div></div>" +
      '<div class="overview-item"><div class="k">總長度</div><div class="v">' + esc(String(plan.weeks) + " 週") + "</div></div>" +
      '<div class="overview-item"><div class="k">每天學習</div><div class="v">' + esc(String(plan.dailyHours) + " 小時") + "</div></div>" +
      '<div class="overview-item"><div class="k">完成度</div><div class="v">' + pct + "%</div></div>" +
      "</div>" +
      '<div class="progress-bar"><i style="width:' + pct + '%"></i></div>';
  }

  function editOverview() {
    var plan = Store.plan;
    openModal("編輯總覽", [
      { key: "goal", label: "學習目標", type: "textarea", rows: 3, value: plan.goal },
      { key: "startDate", label: "開始日期", type: "date", value: plan.startDate },
      { key: "weeks", label: "總週數", type: "number", min: 1, value: plan.weeks },
      { key: "dailyHours", label: "每天學習時數", type: "number", step: 0.5, min: 0.5, value: plan.dailyHours }
    ], function (v) {
      Store.mutatePlan(function (p) {
        p.goal = v.goal;
        p.startDate = v.startDate;
        p.weeks = Math.max(1, Math.min(104, parseInt(v.weeks, 10) || 8));
        p.dailyHours = Math.max(0.5, Math.min(16, num(v.dailyHours, 2)));
        return p;
      });
      renderAll();
      toast("總覽已更新");
    });
  }

  /* ================= 階段 ================= */
  function renderPhases() {
    var plan = Store.plan;
    var box = $("#plan-phases");
    box.innerHTML = "";
    if (!plan.phases.length) {
      box.innerHTML = '<div class="empty"><div class="big">🗺️</div>還沒有任何階段。按「＋ 新增階段」開始，或去「💬 與導師對話」請導師規劃。</div>';
      return;
    }
    plan.phases.forEach(function (ph, idx) {
      var card = document.createElement("div");
      card.className = "phase-card" + (ph.auto ? " auto" : "");
      var topics = (ph.topics || []).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
      var tasks = (ph.tasks || []).map(function (t) {
        return '<li class="' + (t.done ? "done" : "") + '"><input type="checkbox" data-task="' + t.id + '"' + (t.done ? " checked" : "") + '><span class="task-text">' + esc(t.text) + "</span></li>";
      }).join("");
      card.innerHTML =
        '<div class="phase-head">' +
        '<h4 class="phase-title">' + esc(ph.title) + (ph.auto ? ' <span title="由 AI 導師產生" style="font-size:11px;color:#0ea5e9">✨AI</span>' : "") + "</h4>" +
        '<div style="display:flex;gap:8px;align-items:center"><span class="phase-weeks">第 ' + ph.startWeek + " – " + ph.endWeek + ' 週</span>' +
        '<div class="phase-actions"><button class="btn btn-sm" data-act="edit">編輯</button><button class="btn btn-sm btn-danger" data-act="del">刪除</button></div></div>' +
        "</div>" +
        '<div class="phase-body">' +
        (topics ? '<div class="topic-chips">' + topics + "</div>" : "") +
        '<ul class="task-list">' + tasks + "</ul>" +
        "</div>";
      card.querySelector("[data-act=edit]").addEventListener("click", function () { editPhase(ph.id); });
      card.querySelector("[data-act=del]").addEventListener("click", function () { deletePhase(ph.id); });
      card.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
        cb.addEventListener("change", function () {
          Store.mutatePlan(function (p) {
            p.phases.forEach(function (x) {
              (x.tasks || []).forEach(function (t) {
                if (t.id === cb.getAttribute("data-task")) t.done = cb.checked;
              });
            });
            return p;
          });
          renderPlan();
        });
      });
      box.appendChild(card);
    });
  }

  function phaseModal(phase) {
    var isEdit = !!phase;
    openModal(isEdit ? "編輯階段" : "新增階段", [
      { key: "title", label: "階段名稱", type: "text", value: phase ? phase.title : "" },
      { key: "startWeek", label: "開始週次", type: "number", min: 1, value: phase ? phase.startWeek : 1 },
      { key: "endWeek", label: "結束週次", type: "number", min: 1, value: phase ? phase.endWeek : 2 },
      { key: "topics", label: "主題（每行一個）", type: "textarea", rows: 3, value: phase ? (phase.topics || []).join("\n") : "" },
      { key: "tasks", label: "任務（每行一個，可加「用哪個資源做什麼」）", type: "textarea", rows: 5, value: phase ? (phase.tasks || []).map(function (t) { return t.text; }).join("\n") : "" }
    ], function (v) {
      var topics = String(v.topics || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      var taskTexts = String(v.tasks || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      Store.mutatePlan(function (p) {
        var weeks = p.weeks || 8;
        var sw = Math.max(1, Math.min(weeks, parseInt(v.startWeek, 10) || 1));
        var ew = Math.max(sw, Math.min(weeks, parseInt(v.endWeek, 10) || sw));
        if (isEdit) {
          p.phases.forEach(function (x) {
            if (x.id === phase.id) {
              x.title = v.title || "未命名階段";
              x.startWeek = sw;
              x.endWeek = ew;
              x.topics = topics;
              x.tasks = taskTexts.map(function (t) { return { id: Store.uid(), text: t, done: false }; });
            }
          });
        } else {
          p.phases.push({
            id: Store.uid(), title: v.title || "未命名階段", startWeek: sw, endWeek: ew, auto: false,
            topics: topics, tasks: taskTexts.map(function (t) { return { id: Store.uid(), text: t, done: false }; })
          });
        }
        p.phases.sort(function (a, b) { return a.startWeek - b.startWeek; });
        return p;
      });
      renderAll();
      toast(isEdit ? "階段已更新" : "階段已新增");
    }, { submitLabel: isEdit ? "儲存修改" : "新增階段" });
  }

  function editPhase(id) {
    var ph = Store.plan.phases.filter(function (x) { return x.id === id; })[0];
    if (ph) phaseModal(ph);
  }

  function deletePhase(id) {
    if (!confirm("確定刪除這個階段？")) return;
    Store.mutatePlan(function (p) {
      p.phases = p.phases.filter(function (x) { return x.id !== id; });
      return p;
    });
    renderAll();
    toast("階段已刪除");
  }

  /* ================= 日程表 ================= */
  function renderSchedule() {
    var plan = Store.plan;
    var box = $("#plan-schedule");
    var rows = "";
    for (var w = 1; w <= plan.weeks; w++) {
      var cover = plan.phases.filter(function (ph) { return w >= ph.startWeek && w <= ph.endWeek; });
      var focus = cover.map(function (ph) { return ph.title + "：" + (ph.topics || []).join("、"); }).join("<br>") || "彈性複習 / 緩衝";
      var tasks = cover.map(function (ph) {
        return (ph.tasks || []).map(function (t) { return "☐ " + esc(t.text); }).join("<br>");
      }).filter(Boolean).join("<br>") || "—";
      var mats = plan.materials.filter(function (m) { return m.week === w; })
        .map(function (m) { return "• " + esc(m.title) + (m.url ? ' <a href="' + esc(m.url) + '" target="_blank" rel="noopener">↗</a>' : ""); })
        .join("<br>") || "—";
      rows += "<tr>" +
        '<td class="week-no">第 ' + w + " 週</td>" +
        '<td style="white-space:nowrap">' + esc(weekRange(plan, w)) + "</td>" +
        '<td class="focus">' + focus + "</td>" +
        '<td><ul class="tasks"><li>' + tasks + "</li></ul></td>" +
        '<td class="mats">' + mats + "</td>" +
        '<td><span class="daily">每天 ' + esc(String(plan.dailyHours)) + " 小時</span></td>" +
        "</tr>";
    }
    box.innerHTML =
      '<div class="schedule-wrap"><table class="schedule">' +
      "<thead><tr><th>週次</th><th>日期範圍</th><th>階段 / 主題</th><th>每週任務</th><th>材料</th><th>每日投入</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  /* ================= 材料 ================= */
  function renderMaterials() {
    var plan = Store.plan;
    var box = $("#materials-list");
    box.innerHTML = "";
    if (!plan.materials.length) {
      box.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="big">📚</div>還沒有學習材料。按「＋ 新增材料」手動加入，或請 AI 導師規劃。</div>';
      return;
    }
    plan.materials.slice().sort(function (a, b) { return a.week - b.week; }).forEach(function (m) {
      var card = document.createElement("div");
      card.className = "material-card" + (m.done ? " done" : "");
      card.innerHTML =
        '<div class="mat-top">' +
        '<span class="mat-type">' + esc(m.type) + "</span>" +
        '<span class="mat-week">第 ' + m.week + " 週</span>" +
        '<span style="margin-left:auto"><input type="checkbox" data-id="' + m.id + '"' + (m.done ? " checked" : "") + ' title="已完成"></span>' +
        "</div>" +
        '<h4 class="mat-title">' + esc(m.title) + "</h4>" +
        (m.note ? '<p class="mat-note">' + esc(m.note) + "</p>" : "") +
        (m.url ? '<a class="mat-url" href="' + esc(m.url) + '" target="_blank" rel="noopener noreferrer">' + esc(m.url) + "</a>" : "") +
        '<div class="mat-actions"><button class="btn btn-sm" data-act="edit">編輯</button><button class="btn btn-sm btn-danger" data-act="del">刪除</button></div>';
      card.querySelector("[data-act=edit]").addEventListener("click", function () { materialModal(m.id); });
      card.querySelector("[data-act=del]").addEventListener("click", function () { deleteMaterial(m.id); });
      card.querySelector("input[type=checkbox]").addEventListener("change", function () {
        Store.mutatePlan(function (p) {
          p.materials.forEach(function (x) { if (x.id === m.id) x.done = this.checked; }, this);
          return p;
        });
        renderMaterials();
      });
      box.appendChild(card);
    });
  }

  function materialModal(id) {
    var m = id ? Store.plan.materials.filter(function (x) { return x.id === id; })[0] : null;
    var types = ["公開課", "教學影片", "書", "網站", "文件", "工具", "Podcast", "App", "論文", "其他"];
    openModal(m ? "編輯材料" : "新增材料", [
      { key: "type", label: "類型", type: "select", options: types, value: m ? m.type : "公開課" },
      { key: "title", label: "名稱", type: "text", value: m ? m.title : "" },
      { key: "url", label: "網址（可留空）", type: "text", value: m ? m.url : "" },
      { key: "week", label: "使用週次", type: "number", min: 1, value: m ? m.week : 1 },
      { key: "note", label: "備註 / 為什麼推薦", type: "textarea", rows: 3, value: m ? m.note : "" }
    ], function (v) {
      Store.mutatePlan(function (p) {
        var obj = {
          id: m ? m.id : Store.uid(),
          type: v.type || "其他",
          title: v.title || "未命名材料",
          url: v.url || "",
          note: v.note || "",
          week: Math.max(1, parseInt(v.week, 10) || 1),
          done: m ? !!m.done : false
        };
        if (m) {
          p.materials = p.materials.map(function (x) { return x.id === m.id ? obj : x; });
        } else {
          p.materials.push(obj);
        }
        return p;
      });
      renderAll();
      toast(m ? "材料已更新" : "材料已新增");
    }, { submitLabel: m ? "儲存修改" : "新增材料" });
  }

  function deleteMaterial(id) {
    if (!confirm("確定刪除這項材料？")) return;
    Store.mutatePlan(function (p) {
      p.materials = p.materials.filter(function (x) { return x.id !== id; });
      return p;
    });
    renderAll();
    toast("材料已刪除");
  }

  /* ================= 設定 ================= */
  function renderSettings() {
    var s = Store.settings;
    $("#set-base-url").value = s.baseUrl || "";
    $("#set-model").value = s.model || "";
    $("#set-api-key").value = s.apiKey || "";
    $("#set-demo-mode").checked = !!s.demoMode;
  }

  function saveSettings() {
    var data = Store.load();
    data.settings = {
      baseUrl: $("#set-base-url").value.trim() || "https://api.openai.com/v1",
      model: $("#set-model").value.trim() || "gpt-4o-mini",
      apiKey: $("#set-api-key").value.trim(),
      demoMode: $("#set-demo-mode").checked
    };
    Store.save();
    toast("設定已儲存");
  }

  async function testSettings() {
    var status = $("#settings-status");
    status.className = "status-line";
    status.textContent = "測試中…";
    var s = {
      baseUrl: $("#set-base-url").value.trim() || "https://api.openai.com/v1",
      model: $("#set-model").value.trim() || "gpt-4o-mini",
      apiKey: $("#set-api-key").value.trim(),
      demoMode: $("#set-demo-mode").checked
    };
    var r = await AI.testConnection(s);
    status.className = "status-line " + (r.ok ? "ok" : "err");
    status.textContent = r.message;
  }

  /* ================= 匯出 / 匯入 ================= */
  function exportJSON() {
    var payload = {
      app: "StudyPlanner",
      version: 1,
      plan: Store.plan,
      chat: Store.chat,
      settings: {
        baseUrl: Store.settings.baseUrl,
        model: Store.settings.model,
        demoMode: Store.settings.demoMode
        // 不含 API Key，保護隱私
      }
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "study-planner-backup.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast("已匯出備份 JSON");
  }

  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        Store.importData(obj);
        renderAll();
        toast("已匯入備份 ✅");
      } catch (e) {
        toast("匯入失敗：檔案格式錯誤", true);
      }
    };
    reader.readAsText(file);
  }

  /* ================= 全部渲染 ================= */
  function renderPlan() {
    renderOverview();
    renderPhases();
    renderSchedule();
  }

  function renderAll() {
    renderChat();
    renderPlan();
    renderMaterials();
    renderSettings();
  }

  /* ================= 事件綁定 ================= */
  function wire() {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () { switchView(t.getAttribute("data-view")); });
    });

    $("#chat-form").addEventListener("submit", function (e) { e.preventDefault(); sendChat(); });
    $("#btn-example").addEventListener("click", loadExample);

    $("#btn-edit-overview").addEventListener("click", editOverview);
    $("#btn-add-phase").addEventListener("click", function () { phaseModal(null); });
    $("#btn-export-json").addEventListener("click", exportJSON);
    $("#btn-import-json").addEventListener("click", function () { $("#import-file").click(); });
    $("#import-file").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = "";
    });

    $("#btn-add-material").addEventListener("click", function () { materialModal(null); });

    $("#settings-form").addEventListener("submit", function (e) { e.preventDefault(); saveSettings(); });
    $("#btn-test-api").addEventListener("click", testSettings);
    $("#btn-reset-data").addEventListener("click", function () {
      if (!confirm("確定清除所有資料並恢復範例？此操作無法復原（可先匯出 JSON 備份）。")) return;
      Store.reset();
      renderAll();
      switchView("chat");
      toast("已恢復為範例資料");
    });

    // Enter 送出，Shift+Enter 換行
    $("#chat-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  /* ================= 啟動 ================= */
  Store.load();
  renderAll();
  wire();
  switchView("chat");
})();
