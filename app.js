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

function loadEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* 저장소를 못 쓰면 샘플로 시작 */ }
  return sampleEntries.slice();
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) { /* 저장 실패 시 화면에서만 유지 */ }
}

const entries = loadEntries();

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

function renderSummary() {
  const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter(e => e.date.startsWith(prefix));
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
    const dayEntries = entries.filter(e => e.date === key);
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

  const dayEntries = entries.filter(e => e.date === selectedKey);
  document.getElementById("dayIncome").textContent = won(sumBy(dayEntries, "income"));
  document.getElementById("dayExpense").textContent = won(sumBy(dayEntries, "expense"));

  const list = document.getElementById("entryList");
  if (dayEntries.length === 0) {
    list.innerHTML = `<li class="empty-msg">내역이 없습니다</li>`;
    return;
  }

  list.innerHTML = dayEntries.map(e => `
    <li class="entry">
      <div class="entry-icon">${e.icon}</div>
      <div class="entry-info">
        <div class="entry-title">${escapeHtml(e.title)}</div>
        <div class="entry-meta">${escapeHtml(e.category)} · ${escapeHtml(e.method)}${e.excludeFromExpense ? " · 지출 제외" : ""}</div>
      </div>
      <div class="entry-amount ${e.excludeFromExpense ? "excluded" : e.type}">${e.type === "income" ? "+" : "-"}${won(e.amount)}</div>
    </li>
  `).join("");
}

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  selectedKey = toKey(new Date(viewYear, viewMonth, 1));
  render();
}

function render() {
  renderSummary();
  renderCalendar();
  renderDetail();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ----- 내역 입력 창 -----
const modal = document.getElementById("modal");
const form = document.getElementById("entryForm");
const fDate = document.getElementById("fDate");
const fAmount = document.getElementById("fAmount");
const fCategory = document.getElementById("fCategory");
const fMethod = document.getElementById("fMethod");
const fTitle = document.getElementById("fTitle");
const saveBtn = document.getElementById("saveBtn");
const excludeRow = document.getElementById("excludeRow");
const fExclude = document.getElementById("fExclude");
const typeBtns = document.querySelectorAll(".type-btn");
let formType = "expense";

function setFormType(type) {
  formType = type;
  typeBtns.forEach(b => b.classList.toggle("active", b.dataset.type === type));
  saveBtn.classList.toggle("income", type === "income");
  fCategory.innerHTML = Object.keys(CATEGORIES[type])
    .map(c => `<option>${c}</option>`).join("");
  updateExcludeRow();
}

// 분류가 '저축'일 때만 체크 항목 표시
function updateExcludeRow() {
  const isSaving = formType === "expense" && fCategory.value === "저축";
  excludeRow.hidden = !isSaving;
  if (!isSaving) fExclude.checked = false;
}

fCategory.addEventListener("change", updateExcludeRow);

function openModal() {
  form.reset();
  setFormType("expense");
  fDate.value = selectedKey;
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
  entries.push({
    date: fDate.value,
    type: formType,
    title: fTitle.value.trim() || category,
    category,
    method: fMethod.value,
    amount,
    icon: CATEGORIES[formType][category],
    excludeFromExpense: !excludeRow.hidden && fExclude.checked,
  });
  saveEntries();

  // 저장한 날짜로 달력 이동
  const [y, m] = fDate.value.split("-").map(Number);
  viewYear = y;
  viewMonth = m - 1;
  selectedKey = fDate.value;
  closeModal();
  render();
});

document.getElementById("addBtn").addEventListener("click", openModal);
document.getElementById("closeBtn").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));

render();
