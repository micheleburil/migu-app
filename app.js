const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statuses = ["Pesquisando", "Escolhido", "Comprado"];

const defaultState = {
  settings: {
    homeTitle: "Inicio",
    primary: "#1b8a7a",
    accent: "#e88f5b",
    theme: "light",
    cardOrder: ["saved", "missing", "monthly", "furniture"]
  },
  goal: {
    total: 45000,
    saved: 12500,
    moveDate: "2026-12-30",
    monthlySaving: 5200
  },
  finance: {
    incomeA: 5200,
    incomeB: 5800,
    fixedCosts: 4100,
    debtPayments: 1300
  },
  furniture: [
    { id: crypto.randomUUID(), name: "Geladeira", category: "Cozinha", value: 3100, link: "", image: "", priority: "Essencial", status: "Escolhido" },
    { id: crypto.randomUUID(), name: "Sofa", category: "Sala", value: 2400, link: "", image: "", priority: "Importante", status: "Pesquisando" },
    { id: crypto.randomUUID(), name: "Cama casal", category: "Quarto", value: 1900, link: "", image: "", priority: "Essencial", status: "Comprado" }
  ],
  budgets: [],
  debts: [
    { id: crypto.randomUUID(), name: "Cartao", owner: "Mi", total: 4200, paid: 900, minimum: 450, dueDate: "2026-10-30" }
  ]
};

let state = loadState();
let activeView = "dashboard";
let editing = false;

function loadState() {
  const saved = localStorage.getItem("migu-state");
  return saved ? JSON.parse(saved) : structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem("migu-state", JSON.stringify(state));
}

function monthsUntil(dateString) {
  const now = new Date("2026-06-25T00:00:00");
  const target = new Date(`${dateString}T00:00:00`);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  return Math.max(1, months);
}

function calc() {
  const missing = Math.max(0, state.goal.total - state.goal.saved);
  const months = monthsUntil(state.goal.moveDate);
  const neededMonthly = missing / months;
  const income = Number(state.finance.incomeA) + Number(state.finance.incomeB);
  const commitments = Number(state.finance.fixedCosts) + Number(state.finance.debtPayments);
  const surplus = income - commitments;
  const furnitureTotal = state.furniture.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const percent = state.goal.total ? Math.min(100, (state.goal.saved / state.goal.total) * 100) : 0;
  const ratio = neededMonthly ? state.goal.monthlySaving / neededMonthly : 1;
  const signal = ratio >= 1 ? "Verde" : ratio >= 0.7 ? "Amarelo" : "Vermelho";
  return { missing, months, neededMonthly, income, commitments, surplus, furnitureTotal, percent, signal };
}

function applyTheme() {
  document.documentElement.style.setProperty("--primary", state.settings.primary);
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  document.body.classList.toggle("dark", state.settings.theme === "dark");
}

function render() {
  applyTheme();
  document.body.classList.toggle("editing", editing);
  document.getElementById("screenTitle").textContent = activeView === "dashboard" ? state.settings.homeTitle : titleFor(activeView);
  renderForms();
  renderDashboard();
  renderFurniture();
  renderBudgets();
  renderFinance();
  renderDebts();
  renderSettings();
}

function titleFor(view) {
  return {
    furniture: "Moveis",
    budget: "Orcamentos",
    finance: "Financeiro",
    debts: "Dividas",
    simulator: "Simulador",
    settings: "Editar app"
  }[view] || "Inicio";
}

function renderForms() {
  const goalForm = document.getElementById("goalForm");
  goalForm.goalTotal.value = state.goal.total;
  goalForm.savedTotal.value = state.goal.saved;
  goalForm.moveDate.value = state.goal.moveDate;
  goalForm.monthlySaving.value = state.goal.monthlySaving;

  const financeForm = document.getElementById("financeForm");
  financeForm.incomeA.value = state.finance.incomeA;
  financeForm.incomeB.value = state.finance.incomeB;
  financeForm.fixedCosts.value = state.finance.fixedCosts;
  financeForm.debtPayments.value = state.finance.debtPayments;

  const settingsForm = document.getElementById("settingsForm");
  settingsForm.homeTitle.value = state.settings.homeTitle;
  settingsForm.primary.value = state.settings.primary;
  settingsForm.accent.value = state.settings.accent;
  settingsForm.theme.value = state.settings.theme;
}

function renderDashboard() {
  const data = calc();
  const signal = document.getElementById("goalSignal");
  signal.querySelector("strong").textContent = data.signal;
  signal.style.background = data.signal === "Verde" ? "var(--green)" : data.signal === "Amarelo" ? "var(--yellow)" : "var(--red)";
  document.getElementById("heroMessage").textContent = data.signal === "Verde" ? "O plano fecha para a data de voces." : data.signal === "Amarelo" ? "Esta quase fechando, falta ajustar um pouco." : "A meta precisa de um novo combinado.";
  document.getElementById("heroSub").textContent = `Faltam ${money.format(data.missing)} e o necessario e ${money.format(data.neededMonthly)} por mes.`;
  document.getElementById("goalPercent").textContent = `${Math.round(data.percent)}%`;
  document.getElementById("goalProgress").style.width = `${data.percent}%`;

  const cards = {
    saved: ["Guardado", money.format(state.goal.saved)],
    missing: ["Falta", money.format(data.missing)],
    monthly: ["Necessario por mes", money.format(data.neededMonthly)],
    furniture: ["Moveis planejados", money.format(data.furnitureTotal)]
  };
  document.getElementById("dashboardCards").innerHTML = state.settings.cardOrder.map(key => `<article class="metric-card"><span>${cards[key][0]}</span><strong>${cards[key][1]}</strong></article>`).join("");

  const pending = state.furniture.filter(item => item.status !== "Comprado");
  document.getElementById("pendingCount").textContent = `${pending.length} itens`;
  document.getElementById("quickFurniture").innerHTML = pending.slice(0, 4).map(item => compactRow(item.name, money.format(item.value))).join("") || "<p>Nenhum item pendente.</p>";
}

function renderFurniture() {
  document.getElementById("furnitureBoard").innerHTML = statuses.map(status => {
    const cards = state.furniture.filter(item => item.status === status).map(item => furnitureCard(item)).join("");
    return `<section class="kanban-column" data-status="${status}"><h3>${status}</h3>${cards || "<p>Nenhum item aqui.</p>"}</section>`;
  }).join("");

  document.querySelectorAll(".item-card[data-id]").forEach(card => {
    card.draggable = editing;
    card.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", card.dataset.id));
  });

  document.querySelectorAll(".kanban-column").forEach(column => {
    column.addEventListener("dragover", event => event.preventDefault());
    column.addEventListener("drop", event => {
      if (!editing) return;
      const item = state.furniture.find(entry => entry.id === event.dataTransfer.getData("text/plain"));
      if (item) {
        item.status = column.dataset.status;
        saveState();
        render();
      }
    });
  });

  const select = document.getElementById("budgetItemSelect");
  select.innerHTML = state.furniture.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
}

function furnitureCard(item) {
  const image = item.image ? `<img src="${item.image}" alt="">` : "";
  const link = item.link ? `<a href="${item.link}" target="_blank" rel="noreferrer">Abrir link</a>` : "";
  return `<article class="item-card" data-id="${item.id}">
    ${image}
    <strong>${item.name}</strong>
    <span>${money.format(item.value || 0)}</span>
    <div class="pill-row"><span class="pill">${item.category || "Sem categoria"}</span><span class="pill">${item.priority}</span></div>
    ${link}
  </article>`;
}

function renderBudgets() {
  document.getElementById("budgetList").innerHTML = state.budgets.map(budget => {
    const item = state.furniture.find(entry => entry.id === budget.itemId);
    const total = Number(budget.product || 0) + Number(budget.shipping || 0);
    return `<article class="item-card"><strong>${item?.name || "Item"}</strong><span>${budget.store}</span><span>${money.format(total)}</span>${budget.link ? `<a href="${budget.link}" target="_blank" rel="noreferrer">Abrir loja</a>` : ""}</article>`;
  }).join("") || `<div class="result-card">Adicione orcamentos para comparar lojas e valores.</div>`;
}

function renderFinance() {
  const data = calc();
  document.getElementById("financeCards").innerHTML = [
    ["Receita total", money.format(data.income)],
    ["Compromissos", money.format(data.commitments)],
    ["Sobra mensal", money.format(data.surplus)],
    ["Aporte da meta", money.format(state.goal.monthlySaving)]
  ].map(([label, value]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderDebts() {
  document.getElementById("debtList").innerHTML = state.debts.map(debt => {
    const remaining = Math.max(0, Number(debt.total || 0) - Number(debt.paid || 0));
    const monthly = remaining / monthsUntil(debt.dueDate);
    return `<article class="item-card"><strong>${debt.name}</strong><span>${debt.owner || "Casal"}</span><span>Saldo: ${money.format(remaining)}</span><span>Para quitar: ${money.format(monthly)} por mes</span><div class="pill-row"><span class="pill">Minimo ${money.format(debt.minimum || 0)}</span></div></article>`;
  }).join("") || `<div class="result-card">Nenhuma divida cadastrada.</div>`;
}

function renderSettings() {
  document.getElementById("cardOrder").innerHTML = state.settings.cardOrder.map((key, index) => {
    const names = { saved: "Guardado", missing: "Falta", monthly: "Necessario por mes", furniture: "Moveis planejados" };
    return `<div class="compact-row"><strong>${names[key]}</strong><div class="row-actions"><button data-move="${index}" data-dir="-1">↑</button><button data-move="${index}" data-dir="1">↓</button></div></div>`;
  }).join("");
}

function compactRow(left, right) {
  return `<div class="compact-row"><strong>${left}</strong><span>${right}</span></div>`;
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
    document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === activeView));
    render();
  });
});

document.getElementById("toggleEdit").addEventListener("click", () => {
  editing = !editing;
  document.getElementById("toggleEdit").textContent = editing ? "Usando" : "Editar";
  render();
});

document.getElementById("toggleTheme").addEventListener("click", () => {
  state.settings.theme = state.settings.theme === "light" ? "dark" : "light";
  saveState();
  render();
});

document.getElementById("goalForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  state.goal = {
    total: Number(form.goalTotal.value),
    saved: Number(form.savedTotal.value),
    moveDate: form.moveDate.value,
    monthlySaving: Number(form.monthlySaving.value)
  };
  saveState();
  render();
});

document.getElementById("furnitureForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  state.furniture.push({ id: crypto.randomUUID(), name: form.name.value, category: form.category.value, value: Number(form.value.value), link: form.link.value, image: form.image.value, priority: form.priority.value, status: "Pesquisando" });
  form.reset();
  saveState();
  render();
});

document.getElementById("budgetForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  state.budgets.push({ id: crypto.randomUUID(), itemId: form.itemId.value, store: form.store.value, product: Number(form.product.value), shipping: Number(form.shipping.value), link: form.link.value, image: form.image.value });
  form.reset();
  saveState();
  render();
});

document.getElementById("financeForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  state.finance = { incomeA: Number(form.incomeA.value), incomeB: Number(form.incomeB.value), fixedCosts: Number(form.fixedCosts.value), debtPayments: Number(form.debtPayments.value) };
  saveState();
  render();
});

document.getElementById("debtForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  state.debts.push({ id: crypto.randomUUID(), name: form.name.value, owner: form.owner.value, total: Number(form.total.value), paid: Number(form.paid.value), minimum: Number(form.minimum.value), dueDate: form.dueDate.value });
  form.reset();
  saveState();
  render();
});

document.getElementById("simForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const missing = Math.max(0, Number(form.target.value) - Number(form.saved.value));
  const months = monthsUntil(form.date.value);
  const needed = missing / months;
  const current = Number(form.monthly.value);
  const closes = current >= needed;
  document.getElementById("simResult").textContent = closes
    ? `Fecha sim: voces precisam de ${money.format(needed)} por mes e informaram ${money.format(current)}.`
    : `Ainda nao fecha: faltam ${money.format(needed - current)} por mes para bater a data.`;
});

document.getElementById("settingsForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  state.settings.homeTitle = form.homeTitle.value;
  state.settings.primary = form.primary.value;
  state.settings.accent = form.accent.value;
  state.settings.theme = form.theme.value;
  saveState();
  render();
});

document.getElementById("resetApp").addEventListener("click", () => {
  state = structuredClone(defaultState);
  saveState();
  render();
});

document.getElementById("cardOrder").addEventListener("click", event => {
  const button = event.target.closest("button[data-move]");
  if (!button) return;
  const from = Number(button.dataset.move);
  const to = from + Number(button.dataset.dir);
  if (to < 0 || to >= state.settings.cardOrder.length) return;
  const [item] = state.settings.cardOrder.splice(from, 1);
  state.settings.cardOrder.splice(to, 0, item);
  saveState();
  render();
});

render();
