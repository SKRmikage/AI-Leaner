/* ============================================================
 * ai.js — AI 導師連線層
 * 支援 OpenAI 相容 API（/chat/completions）；
 * 未設定或示範模式時改用內建 Tutor（規則式）。
 * ============================================================ */
(function () {
  "use strict";

  function trimSlash(s) { return (s || "").replace(/\/+$/, ""); }

  function systemPrompt(plan) {
    var planJson = "";
    try { planJson = JSON.stringify(plan, null, 2); } catch (e) { planJson = ""; }
    return [
      "你是一位專業的「學習規劃 AI 導師」，擅長為使用者規劃系統化學習路徑、推薦資源（公開課、教學影片、書籍、官方文件等），並排出每週日程表。",
      "語言：一律使用繁體中文（Traditional Chinese）回答。",
      "工作流程：",
      "1. 先理解使用者的學習目標、可用時間（每週/每天幾小時）、期望完成期限；",
      "2. 給出學習路徑建議與資源推薦的理由；",
      "3. 當使用者要求規劃、修改規劃或討論後達成共識時，輸出完整建議規劃。",
      "輸出格式（非常重要）：",
      "- 一般建議用 Markdown 呈現，條列清楚。",
      "- 當輸出規劃時，必須在回覆中夾帶一段 JSON，包在 <plan> 與 </plan> 標籤之間，格式如下：",
      "<plan>",
      '{',
      '  "goal": "一句話描述學習目標",',
      '  "startDate": "YYYY-MM-DD",',
      '  "weeks": 12,',
      '  "dailyHours": 3,',
      '  "phases": [',
      '    { "title": "階段名稱", "startWeek": 1, "endWeek": 2, "topics": ["主題1", "主題2"], "tasks": ["具體任務1", "具體任務2"] }',
      '  ],',
      '  "materials": [',
      '    { "type": "公開課|教學影片|書|網站|文件|其他", "title": "資源名稱", "url": "https://...", "note": "為什麼推薦/如何使用", "week": 1 }',
      '  ]',
      '}',
      "</plan>",
      "- phases 的 startWeek/endWeek 必須介於 1 與 weeks 之間且不重疊；",
      "- tasks 要具體到「用哪個資源做什麼事」；",
      "- materials 的 week 對應建議使用該資源的週次；",
      "- 若使用者是在既有規劃上要求修改（時間不夠、換資源、加快/放慢等），請基於下方「目前規劃」調整並輸出完整的新版 <plan>，不要只輸出片段。",
      "目前規劃（如果還沒有規劃則為 null）：",
      planJson || "null"
    ].join("\n");
  }

  function buildMessages(history, plan) {
    var messages = [{ role: "system", content: systemPrompt(plan) }];
    var recent = (history || []).slice(-16);
    recent.forEach(function (m) {
      if (m.role === "user" || m.role === "assistant") messages.push({ role: m.role, content: m.content });
    });
    return messages;
  }

  function extractPlan(text) {
    if (!text) return null;
    var m = text.match(/<plan>([\s\S]*?)<\/plan>/);
    var raw = m ? m[1] : null;
    if (!raw) {
      var s = text.indexOf("{");
      var e = text.lastIndexOf("}");
      if (s !== -1 && e > s) raw = text.slice(s, e + 1);
    }
    if (!raw) return null;
    try {
      var obj = JSON.parse(raw);
      if (obj && typeof obj === "object" && Array.isArray(obj.phases)) {
        return Store.normalizePlan(obj);
      }
    } catch (err) { /* 解析失敗往下走 */ }
    return null;
  }

  async function callChat(userText, history, plan, settings) {
    var base = trimSlash(settings.baseUrl) || "https://api.openai.com/v1";
    var url = base + "/chat/completions";
    var messages = buildMessages(history, plan);
    messages.push({ role: "user", content: userText });

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 60000);

    var resp;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + settings.apiKey
        },
        body: JSON.stringify({
          model: settings.model || "gpt-4o-mini",
          messages: messages,
          temperature: 0.7,
          max_tokens: 4000
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      var detail = "";
      try {
        var j = await resp.json();
        detail = j && (j.error && j.error.message) ? j.error.message : JSON.stringify(j);
      } catch (e) { detail = await resp.text().catch(function () { return ""; }); }
      throw new Error("API 回應錯誤 (" + resp.status + "): " + (detail || resp.statusText));
    }

    var data = await resp.json();
    var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    if (!content) throw new Error("API 回傳內容為空");
    return { content: content, proposal: extractPlan(content) };
  }

  async function reply(userText, history, plan, settings) {
    if (settings.demoMode || !settings.apiKey) {
      return Tutor.generate(userText, plan);
    }
    try {
      var r = await callChat(userText, history, plan, settings);
      if (!r.proposal) {
        r.content += "\n\n（本次回覆沒有附帶結構化規劃。若你希望我排出日程表，請直接說「請幫我規劃」，我會輸出可一鍵採納的建議規劃。）";
      }
      return r;
    } catch (err) {
      console.error("AI call failed", err);
      var fallback = Tutor.generate(userText, plan);
      fallback.content = "⚠️ AI API 呼叫失敗（" + err.message + "），已改用內建示範導師回覆。\n\n" + fallback.content;
      return fallback;
    }
  }

  async function testConnection(settings) {
    if (settings.demoMode) return { ok: true, message: "示範模式已啟用，不需要 API 連線。" };
    if (!settings.apiKey) return { ok: false, message: "尚未填入 API Key。" };
    var base = trimSlash(settings.baseUrl) || "https://api.openai.com/v1";
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var resp = await fetch(base + "/models", {
        headers: { "Authorization": "Bearer " + settings.apiKey },
        signal: controller.signal
      });
      if (resp.ok) return { ok: true, message: "連線成功 ✅ 可以開始使用 AI 導師（模型：" + (settings.model || "未指定") + "）。" };
      var txt = "";
      try { txt = JSON.stringify(await resp.json()); } catch (e) { txt = await resp.text().catch(function(){ return ""; }); }
      return { ok: false, message: "連線失敗（" + resp.status + "）: " + txt.slice(0, 300) };
    } catch (err) {
      return { ok: false, message: "連線失敗：" + err.message };
    } finally {
      clearTimeout(timer);
    }
  }

  window.AI = { reply: reply, extractPlan: extractPlan, testConnection: testConnection, buildMessages: buildMessages };
})();
