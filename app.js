// 화면 확인용 샘플 데이터 (저장/입력 기능은 아직 없음)
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

function sumBy(entries, type) {
  return entries.filter(e => e.type === type).reduce((s, e) => s + e.amount, 0);
}

function renderSummary() {
  const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthEntries = sampleEntries.filter(e => e.date.startsWith(prefix));
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
    const dayEntries = sampleEntries.filter(e => e.date === key);
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

  const dayEntries = sampleEntries.filter(e => e.date === selectedKey);
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
        <div class="entry-title">${e.title}</div>
        <div class="entry-meta">${e.category} · ${e.method}</div>
      </div>
      <div class="entry-amount ${e.type}">${e.type === "income" ? "+" : "-"}${won(e.amount)}</div>
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

document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));

render();
