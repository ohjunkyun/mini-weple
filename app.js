// 처음 실행할 때만 보여줄 샘플 데이터
const sampleEntries = [
  { date: "2026-10-01", type: "income", title: "월급", category: "급여", method: "계좌", amount: 3200000, icon: "💰" },
  { date: "2026-10-01", type: "expense", title: "월세", category: "주거", method: "계좌", amount: 550000, icon: "🏠" },
  { date: "2026-10-02", type: "expense", title: "점심 김치찌개", category: "식비", method: "카드", amount: 9000, icon: "🍚" },
  { date: "2026-10-03", type: "expense", title: "영화", category: "문화", method: "카드", amount: 15000, icon: "🎬" },
  { date: "2026-10-05", type: "expense", title: "마트 장보기", category: "식비", method: "카드", amount: 68400, icon: "🛒" },
  { date: "2026-10-06", type: "expense", title: "교통카드 충전", category: "교통", method: "현금", amount: 30000, icon: "🚌" },
  { date: "2026-10-07", type: "income", title: "중고거래", category: "기타수입", method: "계좌", amount: 45000, icon: "📦" },
  { date: "2026-10-08", type: "expense", title: "카페", category: "식비", method: "카드", amount: 5800, icon: "☕" },
  { date: "2026-10-09", type: "expense", title: "점심 돈까스", category: "식비", method: "카드", amount: 11000, icon: "🍚" },
  { date: "2026-10-09", type: "expense", title: "커피", category: "식비", method: "카드", amount: 4500, icon: "☕" },
  { date: "2026-10-09", type: "expense", title: "지하철", category: "교통", method: "카드", amount: 1550, icon: "🚇" },
  { date: "2026-10-09", type: "income", title: "용돈", category: "기타수입", method: "현금", amount: 50000, icon: "🎁" },
];

const STORAGE_KEY = "budget-entries";

const CATEGORIES = {
  expense: { 식비: "🍚", 카페: "☕", 교통: "🚌", 주거: "🏠", 쇼핑: "🛍️", 문화: "🎬", 의료: "💊", 저축: "🐷", 기타: "📌" },
  income: { 급여: "💰", 용돈: "🎁", 부수입: "📦", 기타수입: "📌" },
};

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadEntries() {
  let list = sampleEntries.slice();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) list = JSON.parse(saved);
  } catch (e) { /* 저장소를 못 쓰면 샘플로 시작 */ }
  // 수정/삭제에 쓸 id가 없는 예전 내역에 id 부여
  return list.map(e => (e.id ? e : { ...e, id: newId() }));
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) { /* 저장 실패 시 화면에서만 유지 */ }
}

const entries = loadEntries();

// ----- 설정 -----
const SETTINGS_KEY = "budget-settings";
const settings = { carry: true, carryLimit: false, impulse: true, impulsePercent: 20, savingGoal: 0 };

try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
} catch (e) { /* 기본값 사용 */ }

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) { /* 저장 실패 시 화면에서만 유지 */ }
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth(); // 0~11
let selectedKey = toKey(today);

function toKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function won(n) {
  return n.toLocaleString("ko-KR");
}

// excludeFromExpense가 켜진 저축은 지출 합계에서 뺀다
function sumBy(entries, type) {
  return entries
    .filter(e => e.type === type && !e.excludeFromExpense)
    .reduce((s, e) => s + e.amount, 0);
}

function monthPrefix(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

// 전월까지 남은 돈(수입 - 지출, 이월 포함)이 양수면 이번 달로 넘어온다
function carryoverFor(year, month) {
  if (!settings.carry || entries.length === 0) return 0;
  const target = monthPrefix(year, month);
  if (settings.carryLimit && target > monthPrefix(today.getFullYear(), today.getMonth())) return 0;
  const first = entries.reduce((min, e) => (e.date < min ? e.date : min), entries[0].date);
  let [y, m] = first.split("-").map(Number);
  m -= 1;
  let carry = 0;
  while (monthPrefix(y, m) < target) {
    const p = monthPrefix(y, m);
    const list = entries.filter(e => e.date.startsWith(p));
    carry = Math.max(0, carry + sumBy(list, "income") - sumBy(list, "expense"));
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return carry;
}

// 보고 있는 달의 내역 + 1일자 이월 내역(자동 계산, 저장 안 함)
function getMonthEntries() {
  const prefix = monthPrefix(viewYear, viewMonth);
  const list = entries.filter(e => e.date.startsWith(prefix));
  const carry = carryoverFor(viewYear, viewMonth);
  if (carry > 0) {
    list.unshift({
      id: "carry", carry: true, date: `${prefix}-01`, type: "income",
      title: "전월 이월", category: "이월", method: "자동", amount: carry, icon: "🔁",
    });
  }
  return list;
}

let monthEntries = [];

function renderSummary() {
  const income = sumBy(monthEntries, "income");
  const expense = sumBy(monthEntries, "expense");
  const total = income - expense;

  document.getElementById("monthTitle").textContent = `${viewYear}년 ${viewMonth + 1}월`;
  document.getElementById("sumIncome").textContent = won(income);
  document.getElementById("sumExpense").textContent = won(expense);
  const totalEl = document.getElementById("sumTotal");
  totalEl.textContent = won(total);
  totalEl.className = "summary-value " + (total >= 0 ? "income" : "expense");
}

// ----- 충동구매 속도 경고 -----
const IMPULSE_BASE = ["급여", "용돈"];    // 자유 예산 기준이 되는 수입 분류
const WARN_SPEED = 1.5;                  // 날짜 진행보다 1.5배 이상 빠르면 경고
const WARN_MIN_USED = 0.1;               // 한도의 10% 미만일 때는 경고하지 않음 (월초 소액 방지)

function getImpulseStatus(year, month) {
  const prefix = monthPrefix(year, month);
  const list = entries.filter(e => e.date.startsWith(prefix));
  const base = list
    .filter(e => e.type === "income" && IMPULSE_BASE.includes(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const limit = Math.round(base * settings.impulsePercent / 100); // 자유 예산의 사용자 지정 %
  const spent = list
    .filter(e => e.type === "expense" && e.impulse)
    .reduce((s, e) => s + e.amount, 0);

  // 지나간 날짜 비율: 이번 달은 오늘까지, 지난달은 100%, 다음 달 이후는 0%
  const nowPrefix = monthPrefix(today.getFullYear(), today.getMonth());
  const days = new Date(year, month + 1, 0).getDate();
  let elapsed = 1;
  if (prefix === nowPrefix) elapsed = today.getDate() / days;
  else if (prefix > nowPrefix) elapsed = 0;

  const used = limit ? spent / limit : 0;
  let level = "ok";
  if (!limit) level = "nobase";
  else if (used >= 1) level = "over";
  else if (elapsed < 1 && used >= WARN_MIN_USED && used > elapsed * WARN_SPEED) level = "warn";

  return { limit, spent, elapsed, used, level, isCurrent: prefix === nowPrefix };
}

function renderImpulse() {
  const card = document.getElementById("impulseCard");
  card.hidden = !settings.impulse;
  if (!settings.impulse) return;

  const s = getImpulseStatus(viewYear, viewMonth);
  const pct = r => Math.round(r * 100);
  card.className = "impulse" + (s.level === "warn" || s.level === "over" ? " " + s.level : "");

  document.getElementById("impulseTitle").textContent = `💸 충동구매 한도 (${settings.impulsePercent}%)`;
  document.getElementById("impulseAmount").textContent = `${won(s.spent)} / ${won(s.limit)}원`;
  document.getElementById("impulseFill").style.width = `${Math.min(100, pct(s.used))}%`;
  const marker = document.getElementById("impulseMarker");
  marker.hidden = !s.isCurrent;
  marker.style.left = `${pct(s.elapsed)}%`;

  let msg;
  if (s.level === "nobase") {
    msg = `이번 달 급여나 용돈을 수입으로 입력하면 충동구매 한도(${settings.impulsePercent}%)가 계산돼요.`;
  } else if (s.level === "over") {
    msg = `⛔ 충동구매 한도를 ${won(s.spent - s.limit)}원 넘었어요. 남은 기간은 꼭 필요한 것만 사요!`;
  } else if (s.level === "warn") {
    const speed = s.elapsed ? (s.used / s.elapsed).toFixed(1) : "∞";
    msg = `⚠️ 이번 달은 ${pct(s.elapsed)}% 지났는데 한도는 벌써 ${pct(s.used)}% 썼어요. ` +
      `날짜보다 ${speed}배 빠른 속도예요! 남은 한도 ${won(s.limit - s.spent)}원`;
  } else if (s.isCurrent) {
    msg = `이번 달 ${pct(s.elapsed)}% 지났고, 한도의 ${pct(s.used)}%를 썼어요. 좋은 속도예요 👍`;
  } else {
    msg = `한도의 ${pct(s.used)}%를 썼어요.`;
  }
  document.getElementById("impulseMsg").textContent = msg;
}

// ----- 저축 목표 -----
// 지금까지 '저축' 분류로 입력한 금액 전체(지출 제외 여부와 상관없이)
function totalSaved() {
  return entries
    .filter(e => e.type === "expense" && e.category === "저축")
    .reduce((s, e) => s + e.amount, 0);
}

function renderGoal() {
  const card = document.getElementById("goalCard");
  const goal = settings.savingGoal;
  card.hidden = !goal;
  if (!goal) return;

  const saved = totalSaved();
  const pct = Math.floor((saved / goal) * 100);
  const done = saved >= goal;
  card.classList.toggle("done", done);

  document.getElementById("goalPct").textContent = `${pct}%`;
  document.getElementById("goalFill").style.width = `${Math.min(100, pct)}%`;
  document.getElementById("goalMsg").textContent = done
    ? `🎉 목표 달성! ${won(goal)}원 목표에 ${won(saved)}원을 모았어요.`
    : `${won(goal)}원 중 ${won(saved)}원 모았어요. ${won(goal - saved)}원 남았어요.`;
}

let toastTimer = null;
function showToast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
}

function renderCalendar() {
  const container = document.getElementById("calendarDays");
  container.innerHTML = "";

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = toKey(today);

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");
    blank.className = "day empty";
    container.appendChild(blank);
  }

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const key = toKey(date);
    const dayEntries = monthEntries.filter(e => e.date === key);
    const income = sumBy(dayEntries, "income");
    const expense = sumBy(dayEntries, "expense");

    const cell = document.createElement("div");
    cell.className = "day";
    if (key === todayKey) cell.classList.add("today");
    if (key === selectedKey) cell.classList.add("selected");

    const dow = date.getDay();
    const numClass = dow === 0 ? "sun" : dow === 6 ? "sat" : "";
    cell.innerHTML = `
      <span class="day-num ${numClass}">${d}</span>
      ${income ? `<span class="day-amt income">${won(income)}</span>` : ""}
      ${expense ? `<span class="day-amt expense">${won(expense)}</span>` : ""}
    `;

    cell.addEventListener("click", () => {
      selectedKey = key;
      renderCalendar();
      renderDetail();
    });
    container.appendChild(cell);
  }
}

function renderDetail() {
  const [y, m, d] = selectedKey.split("-").map(Number);
  const dow = WEEK[new Date(y, m - 1, d).getDay()];
  document.getElementById("detailDate").textContent = `${m}월 ${d}일 (${dow})`;

  const dayEntries = monthEntries.filter(e => e.date === selectedKey);
  document.getElementById("dayIncome").textContent = won(sumBy(dayEntries, "income"));
  document.getElementById("dayExpense").textContent = won(sumBy(dayEntries, "expense"));

  const list = document.getElementById("entryList");
  if (dayEntries.length === 0) {
    list.innerHTML = `<li class="empty-msg">내역이 없습니다</li>`;
    return;
  }

  list.innerHTML = dayEntries.map(e => `
    <li class="entry-wrap${e.carry ? " carry" : ""}" data-id="${e.id}">
      ${e.carry ? "" : `<div class="entry-actions">
        <button type="button" class="action-btn edit" data-action="edit">수정</button>
        <button type="button" class="action-btn delete" data-action="delete">삭제</button>
      </div>`}
      <div class="entry">
        <div class="entry-icon">${e.icon}</div>
        <div class="entry-info">
          <div class="entry-title">${escapeHtml(e.title)}</div>
          <div class="entry-meta">${escapeHtml(e.category)} · ${escapeHtml(e.method)}${e.excludeFromExpense ? " · 지출 제외" : ""}${e.impulse ? ` · <span class="impulse-tag">💸 충동구매</span>` : ""}</div>
        </div>
        <div class="entry-amount ${e.excludeFromExpense ? "excluded" : e.type}">${e.type === "income" ? "+" : "-"}${won(e.amount)}</div>
      </div>
    </li>
  `).join("");
}

// ----- 내역 왼쪽 슬라이드 → 수정/삭제 -----
const ACTION_WIDTH = 140; // 수정 + 삭제 버튼 너비
const entryList = document.getElementById("entryList");
let openRow = null;
let drag = null;

function setOffset(row, x, animate) {
  const el = row.querySelector(".entry");
  el.style.transition = animate ? "transform 0.2s ease" : "none";
  el.style.transform = `translateX(${x}px)`;
}

function closeOpenRow() {
  if (openRow) setOffset(openRow, 0, true);
  openRow = null;
}

entryList.addEventListener("pointerdown", e => {
  const row = e.target.closest(".entry-wrap");
  // 이월 내역은 자동 계산이라 수정/삭제 불가
  if (!row || row.classList.contains("carry") || e.target.closest(".entry-actions")) return;
  if (openRow && openRow !== row) closeOpenRow();
  drag = {
    row,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    base: openRow === row ? -ACTION_WIDTH : 0,
    moving: false,
    x: 0,
  };
});

entryList.addEventListener("pointermove", e => {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  if (!drag.moving) {
    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // 세로 스크롤
    if (Math.abs(dx) < 6) return;
    drag.moving = true;
    drag.row.setPointerCapture(e.pointerId);
  }
  drag.x = Math.min(0, Math.max(-ACTION_WIDTH - 30, drag.base + dx));
  setOffset(drag.row, drag.x, false);
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const { row, moving, x } = drag;
  drag = null;
  if (!moving) {
    // 열린 내역을 탭하면 닫기
    if (openRow === row) closeOpenRow();
    return;
  }
  if (x < -ACTION_WIDTH / 2) {
    setOffset(row, -ACTION_WIDTH, true);
    openRow = row;
  } else {
    setOffset(row, 0, true);
    if (openRow === row) openRow = null;
  }
}

entryList.addEventListener("pointerup", endDrag);
entryList.addEventListener("pointercancel", endDrag);

// 다른 곳을 누르면 열린 내역 닫기
document.addEventListener("pointerdown", e => {
  if (openRow && !openRow.contains(e.target)) closeOpenRow();
});

entryList.addEventListener("click", e => {
  const btn = e.target.closest(".action-btn");
  if (!btn) return;
  const id = btn.closest(".entry-wrap").dataset.id;
  const entry = entries.find(x => x.id === id);
  if (!entry) return;

  if (btn.dataset.action === "delete") {
    if (!confirm(`'${entry.title}' ${won(entry.amount)}원 내역을 삭제할까요?`)) {
      closeOpenRow();
      return;
    }
    entries.splice(entries.indexOf(entry), 1);
    saveEntries();
    openRow = null;
    render();
  } else {
    closeOpenRow();
    openModal(entry);
  }
});

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  selectedKey = toKey(new Date(viewYear, viewMonth, 1));
  render();
}

function render() {
  monthEntries = getMonthEntries();
  renderSummary();
  renderImpulse();
  renderGoal();
  renderCalendar();
  renderDetail();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ----- 내역 입력 창 -----
const modal = document.getElementById("modal");
const form = document.getElementById("entryForm");
const modalTitle = document.getElementById("modalTitle");
const fDate = document.getElementById("fDate");
const fAmount = document.getElementById("fAmount");
const fCategory = document.getElementById("fCategory");
const fMethod = document.getElementById("fMethod");
const fTitle = document.getElementById("fTitle");
const saveBtn = document.getElementById("saveBtn");
const excludeRow = document.getElementById("excludeRow");
const fExclude = document.getElementById("fExclude");
const impulseRow = document.getElementById("impulseRow");
const fImpulse = document.getElementById("fImpulse");
const typeBtns = document.querySelectorAll(".type-btn");
let formType = "expense";
let editingId = null; // 수정 중인 내역 id (새 내역이면 null)

function setFormType(type) {
  formType = type;
  typeBtns.forEach(b => b.classList.toggle("active", b.dataset.type === type));
  saveBtn.classList.toggle("income", type === "income");
  fCategory.innerHTML = Object.keys(CATEGORIES[type])
    .map(c => `<option>${c}</option>`).join("");
  updateExcludeRow();
}

// 분류가 '저축'일 때만 지출 제외 체크, 저축이 아닌 지출일 때만 충동구매 체크 표시
function updateExcludeRow() {
  const isExpense = formType === "expense";
  const isSaving = isExpense && fCategory.value === "저축";
  excludeRow.hidden = !isSaving;
  if (!isSaving) fExclude.checked = false;

  impulseRow.hidden = !isExpense || isSaving;
  if (impulseRow.hidden) fImpulse.checked = false;
}

fCategory.addEventListener("change", updateExcludeRow);

function openModal(entry) {
  form.reset();
  editingId = entry ? entry.id : null;
  modalTitle.textContent = entry ? "내역 수정" : "내역 추가";

  if (entry) {
    setFormType(entry.type);
    fDate.value = entry.date;
    fAmount.value = won(entry.amount);
    fCategory.value = entry.category;
    fMethod.value = entry.method;
    fTitle.value = entry.title;
    updateExcludeRow();
    fExclude.checked = !!entry.excludeFromExpense;
    fImpulse.checked = !!entry.impulse && !impulseRow.hidden;
  } else {
    setFormType("expense");
    fDate.value = selectedKey;
  }
  modal.hidden = false;
  fAmount.focus();
}

function closeModal() {
  modal.hidden = true;
}

typeBtns.forEach(b => b.addEventListener("click", () => setFormType(b.dataset.type)));

// 금액 입력 시 숫자만 남기고 천 단위 쉼표 표시
fAmount.addEventListener("input", () => {
  const digits = fAmount.value.replace(/\D/g, "").replace(/^0+/, "");
  fAmount.value = digits ? Number(digits).toLocaleString("ko-KR") : "";
});

form.addEventListener("submit", e => {
  e.preventDefault();
  const amount = Number(fAmount.value.replace(/\D/g, ""));
  if (!amount) {
    fAmount.focus();
    return;
  }
  const category = fCategory.value;
  const data = {
    date: fDate.value,
    type: formType,
    title: fTitle.value.trim() || category,
    category,
    method: fMethod.value,
    amount,
    icon: CATEGORIES[formType][category],
    excludeFromExpense: !excludeRow.hidden && fExclude.checked,
    impulse: !impulseRow.hidden && fImpulse.checked,
  };

  const existing = editingId && entries.find(x => x.id === editingId);
  if (existing) {
    Object.assign(existing, data);
  } else {
    entries.push({ id: newId(), ...data });
  }
  saveEntries();

  // 충동구매를 저장했는데 속도가 너무 빠르면 알림
  if (data.impulse && settings.impulse) {
    const [sy, sm] = data.date.split("-").map(Number);
    const s = getImpulseStatus(sy, sm - 1);
    if (s.level === "over") {
      showToast(`⛔ 충동구매 한도 초과! 이번 달 한도 ${won(s.limit)}원 중 ${won(s.spent)}원을 썼어요.`);
    } else if (s.level === "warn") {
      showToast(`⚠️ 충동구매 속도가 빨라요! 날짜는 ${Math.round(s.elapsed * 100)}% 지났는데 한도는 ${Math.round(s.used * 100)}% 썼어요.`);
    }
  }

  // 저장한 날짜로 달력 이동
  const [y, m] = fDate.value.split("-").map(Number);
  viewYear = y;
  viewMonth = m - 1;
  selectedKey = fDate.value;
  closeModal();
  render();
});

document.getElementById("addBtn").addEventListener("click", () => openModal());
document.getElementById("closeBtn").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!modal.hidden) closeModal();
  if (!settingsModal.hidden) settingsModal.hidden = true;
});

// ----- 설정 창 -----
const settingsModal = document.getElementById("settingsModal");
const optCarry = document.getElementById("optCarry");
const optCarryLimit = document.getElementById("optCarryLimit");
const optImpulse = document.getElementById("optImpulse");

const optImpulsePercent = document.getElementById("optImpulsePercent");
const optGoal = document.getElementById("optGoal");

// 저축 목표: 만원 단위로 입력 (저장은 원 단위), 입력하는 동안 바로 반영
optGoal.addEventListener("input", () => {
  const digits = optGoal.value.replace(/\D/g, "").replace(/^0+/, "");
  optGoal.value = digits ? Number(digits).toLocaleString("ko-KR") : "";
  settings.savingGoal = digits ? Number(digits) * 10000 : 0;
  saveSettings();
  render();
});

optImpulse.addEventListener("change", () => {
  settings.impulse = optImpulse.checked;
  saveSettings();
  syncSettingsUI();
  render();
});

// 입력하는 동안 바로 반영 (1~100 범위의 정수만)
optImpulsePercent.addEventListener("input", () => {
  const v = Math.round(Number(optImpulsePercent.value));
  if (v >= 1 && v <= 100) {
    settings.impulsePercent = v;
    saveSettings();
    render();
  }
});

// 입력을 마치면 범위를 벗어난 값은 1~100으로 맞춤
optImpulsePercent.addEventListener("change", () => {
  const v = Math.round(Number(optImpulsePercent.value));
  settings.impulsePercent = Number.isFinite(v) && optImpulsePercent.value !== "" ? Math.min(100, Math.max(1, v)) : settings.impulsePercent;
  optImpulsePercent.value = settings.impulsePercent;
  saveSettings();
  render();
});

function syncSettingsUI() {
  optCarry.checked = settings.carry;
  optCarryLimit.checked = settings.carryLimit;
  optImpulse.checked = settings.impulse;
  optImpulsePercent.value = settings.impulsePercent;
  optGoal.value = settings.savingGoal ? won(Math.floor(settings.savingGoal / 10000)) : "";
  optImpulsePercent.disabled = !settings.impulse;
  optImpulsePercent.closest(".setting-row").classList.toggle("disabled", !settings.impulse);
  // 이월을 끄면 '이번 달까지만' 옵션은 의미가 없으므로 비활성화
  optCarryLimit.disabled = !settings.carry;
  optCarryLimit.closest(".setting-row").classList.toggle("disabled", !settings.carry);
}

document.getElementById("settingsBtn").addEventListener("click", () => {
  syncSettingsUI();
  settingsModal.hidden = false;
});
document.getElementById("settingsClose").addEventListener("click", () => { settingsModal.hidden = true; });
settingsModal.addEventListener("click", e => { if (e.target === settingsModal) settingsModal.hidden = true; });

optCarry.addEventListener("change", () => {
  settings.carry = optCarry.checked;
  saveSettings();
  syncSettingsUI();
  render();
});

optCarryLimit.addEventListener("change", () => {
  settings.carryLimit = optCarryLimit.checked;
  saveSettings();
  render();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("모든 내역을 삭제할까요? 되돌릴 수 없습니다.")) return;
  entries.length = 0;
  saveEntries();
  settingsModal.hidden = true;
  render();
});

document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));

render();
