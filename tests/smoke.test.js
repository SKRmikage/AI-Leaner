/* StudyPlanner 冒煙測試：用 jsdom 載入整頁並驗證主要工作流 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

const results = [];
function check(name, cond) {
  if (!cond) {
    results.push("FAIL: " + name);
    console.error("FAIL:", name);
  } else {
    results.push("PASS: " + name);
    console.log("PASS:", name);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let html = read("index.html");
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => "<script>" + read(src) + "<\/script>");

  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true });
  const { window } = dom;
  window.confirm = () => true;
  window.alert = () => {};
  window.URL.createObjectURL = () => "blob:test";
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {}; // 避免 jsdom 對 blob: URL 觸發導航
  const doc = window.document;

  await sleep(50);

  // 1. 初始渲染
  check("welcome message rendered", doc.querySelectorAll("#chat-list .msg").length === 1);
  check("plan phases rendered (6)", doc.querySelectorAll("#plan-phases .phase-card").length === 6);
  check("materials rendered (7)", doc.querySelectorAll("#materials-list .material-card").length === 7);
  check("settings filled", doc.getElementById("set-model").value === "gpt-4o-mini");
  check("schedule table rows (12 weeks)", doc.querySelectorAll("table.schedule tbody tr").length === 12);
  check("chat view active on start", doc.getElementById("view-chat").classList.contains("active"));

  // 2. 頁籤切換
  doc.querySelector('.tab[data-view="plan"]').click();
  check("plan view activates", doc.getElementById("view-plan").classList.contains("active"));
  doc.querySelector('.tab[data-view="chat"]').click();

  // 3. 對話送出（示範模式）
  const input = doc.getElementById("chat-input");
  input.value = "我想學前端，10 週，每天 2 小時，請幫我規劃";
  doc.getElementById("chat-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(300);
  const msgs = doc.querySelectorAll("#chat-list .msg");
  check("user + assistant messages appear", msgs.length >= 3);
  check("proposal card appears", doc.querySelectorAll(".proposal-card").length >= 1);

  // 4. 採納規劃
  doc.querySelector(".proposal-card [data-act=accept]").click();
  await sleep(30);
  check("accept switches to plan view", doc.getElementById("view-plan").classList.contains("active"));
  check("system confirmation added", doc.querySelectorAll("#chat-list .msg.system").length >= 1);
  const phasesAfterAccept = doc.querySelectorAll("#plan-phases .phase-card").length;
  check("accepted plan has phases", phasesAfterAccept >= 5);

  // 5. 新增階段（自行修改規劃）
  doc.getElementById("btn-add-phase").click();
  await sleep(30);
  const mf = doc.querySelector(".modal-form");
  check("phase modal opens", !!mf);
  doc.getElementById("mf-title").value = "測試階段";
  doc.getElementById("mf-startWeek").value = "1";
  doc.getElementById("mf-endWeek").value = "1";
  doc.getElementById("mf-topics").value = "主題A\n主題B";
  doc.getElementById("mf-tasks").value = "任務一\n任務二";
  mf.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(30);
  check("phase added (7)", doc.querySelectorAll("#plan-phases .phase-card").length === phasesAfterAccept + 1);

  // 6. 新增材料
  const matsBefore = doc.querySelectorAll("#materials-list .material-card").length;
  doc.getElementById("btn-add-material").click();
  await sleep(30);
  const mf2 = doc.querySelector(".modal-form");
  check("material modal opens", !!mf2);
  doc.getElementById("mf-title").value = "測試材料";
  doc.getElementById("mf-url").value = "https://example.com";
  doc.getElementById("mf-week").value = "2";
  doc.getElementById("mf-note").value = "備註";
  mf2.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(30);
  check("material added (+1)", doc.querySelectorAll("#materials-list .material-card").length === matsBefore + 1);

  // 7. 任務勾選
  const cb = doc.querySelector("#plan-phases input[type=checkbox]");
  const before = doc.querySelector(".progress-bar i").style.width;
  cb.checked = true;
  cb.dispatchEvent(new window.Event("change", { bubbles: true }));
  await sleep(30);
  const after = doc.querySelector(".progress-bar i").style.width;
  check("progress updates after task check", before !== after);

  // 8. 編輯總覽
  doc.getElementById("btn-edit-overview").click();
  await sleep(30);
  doc.getElementById("mf-goal").value = "新的學習目標";
  doc.querySelector(".modal-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(30);
  check("overview goal updated", doc.querySelector("#plan-overview .overview-item .v").textContent.includes("新的學習目標"));

  // 9. 載入範例
  doc.getElementById("btn-example").click();
  await sleep(30);
  check("example loads 3 chat messages", doc.querySelectorAll("#chat-list .msg").length === 3);
  check("example has proposal", doc.querySelectorAll(".proposal-card").length >= 1);

  // 10. 匯出（不應拋錯）
  doc.getElementById("btn-export-json").click();
  check("export JSON no throw", true);

  // 11. 清除資料
  doc.getElementById("btn-reset-data").click();
  await sleep(30);
  check("reset restores welcome chat", doc.querySelectorAll("#chat-list .msg").length === 1);
  check("reset restores 6 phases", doc.querySelectorAll("#plan-phases .phase-card").length === 6);

  const failed = results.filter((r) => r.startsWith("FAIL"));
  console.log("\n==== " + (failed.length === 0 ? "ALL TESTS PASSED ✅" : failed.length + " TEST(S) FAILED ❌") + " ====");
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("測試執行錯誤：", e);
  process.exit(1);
});
