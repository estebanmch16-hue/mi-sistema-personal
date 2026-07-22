import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { todayISO } from '../../shared/utils/dates.js';

const NAMESPACE = 'finanzas';
const EXPENSE_CATEGORIES = ['Comida', 'Transporte', 'Vivienda', 'Servicios', 'Salud', 'Entretenimiento', 'Otros'];
const INCOME_CATEGORIES = ['Salario', 'Freelance', 'Inversiones', 'Otros'];

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function formatDay(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

function loadTransactions() {
  return storage.get(NAMESPACE, []);
}

function saveTransactions(transactions) {
  storage.set(NAMESPACE, transactions);
}

function createTransaction(type, amount, category, description, date) {
  return { id: crypto.randomUUID(), type, amount, category, description, date, createdAt: new Date().toISOString() };
}

function computeStats(transactions) {
  const currentMonth = todayISO().slice(0, 7);
  let balance = 0;
  let monthIncome = 0;
  let monthExpense = 0;

  for (const t of transactions) {
    balance += t.type === 'ingreso' ? t.amount : -t.amount;
    if (t.date.slice(0, 7) === currentMonth) {
      if (t.type === 'ingreso') monthIncome += t.amount;
      else monthExpense += t.amount;
    }
  }

  return { balance, monthIncome, monthExpense };
}

function groupByMonth(transactions) {
  const map = new Map();
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return map;
}

let state = { transactions: [] };
let els = {};

function updateCategoryOptions(type) {
  const categories = type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  els.categorySelect.innerHTML = categories.map((c) => `<option value="${c}">${c}</option>`).join('');
}

function renderTransactions() {
  const groups = groupByMonth(state.transactions);
  const sortedKeys = Array.from(groups.keys()).sort().reverse();

  els.history.innerHTML = '';

  if (sortedKeys.length === 0) {
    els.history.innerHTML = '<p class="finance-empty">Aún no hay movimientos. Agrega el primero arriba.</p>';
    return;
  }

  for (const key of sortedKeys) {
    const monthTransactions = [...groups.get(key)].sort((a, b) => b.date.localeCompare(a.date));
    const monthLabel = new Date(`${key}-01T00:00:00`).toLocaleDateString('es', { month: 'long', year: 'numeric' });
    const monthNet = monthTransactions.reduce((sum, t) => sum + (t.type === 'ingreso' ? t.amount : -t.amount), 0);

    const section = document.createElement('div');
    section.className = 'finance-month-group';
    section.innerHTML = `
      <div class="finance-month-header">
        <span class="finance-month-label">${monthLabel}</span>
        <span class="finance-month-net ${monthNet >= 0 ? 'is-income' : 'is-expense'}">${formatCurrency(monthNet)}</span>
      </div>
      <ul class="finance-list"></ul>
    `;
    const ul = section.querySelector('.finance-list');

    for (const t of monthTransactions) {
      const li = document.createElement('li');
      li.className = 'finance-item';
      li.dataset.id = t.id;
      li.innerHTML = `
        <span class="finance-item-date">${formatDay(t.date)}</span>
        <span class="finance-item-category">${escapeHtml(t.category)}</span>
        <span class="finance-item-description">${escapeHtml(t.description || '')}</span>
        <span class="finance-item-amount ${t.type === 'ingreso' ? 'is-income' : 'is-expense'}">${
          t.type === 'ingreso' ? '+' : '-'
        }${formatCurrency(t.amount)}</span>
        <button type="button" class="finance-delete icon-button" aria-label="Eliminar movimiento">${iconSvg('trash')}</button>
      `;
      ul.appendChild(li);
    }

    els.history.appendChild(section);
  }
}

function render() {
  const stats = computeStats(state.transactions);

  els.statBalance.textContent = formatCurrency(stats.balance);
  els.statBalance.classList.toggle('is-income', stats.balance >= 0);
  els.statBalance.classList.toggle('is-expense', stats.balance < 0);
  els.statIncome.textContent = formatCurrency(stats.monthIncome);
  els.statExpense.textContent = formatCurrency(stats.monthExpense);

  renderTransactions();
}

function persist() {
  saveTransactions(state.transactions);
  render();
}

function resetFormUI() {
  els.form.reset();
  els.dateInput.value = todayISO();
  els.typeInput.value = 'gasto';
  els.typeButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.type === 'gasto'));
  updateCategoryOptions('gasto');
}

function handleTypeToggle(e) {
  const btn = e.target.closest('[data-type]');
  if (!btn) return;
  const type = btn.dataset.type;
  els.typeInput.value = type;
  els.typeButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
  updateCategoryOptions(type);
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const amount = Number(data.get('amount'));
  if (!amount || amount <= 0) return;

  const type = String(data.get('type'));
  const category = String(data.get('category'));
  const description = String(data.get('description') || '').trim();
  const date = String(data.get('date')) || todayISO();

  state.transactions.push(createTransaction(type, amount, category, description, date));
  resetFormUI();
  persist();
}

function handleHistoryClick(e) {
  if (!e.target.closest('.finance-delete')) return;
  const li = e.target.closest('.finance-item');
  state.transactions = state.transactions.filter((t) => t.id !== li.dataset.id);
  persist();
}

export default {
  id: 'finanzas',
  label: 'Finanzas',
  icon: 'dollar',
  group: 'Productividad',
  route: '#/finanzas',

  mount(container) {
    loadModuleStyles('modules/finanzas/finanzas.css');
    state = { transactions: loadTransactions() };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Finanzas</h1>
        <p class="view-subtitle">Registra tus ingresos y gastos.</p>
      </div>

      <div class="finance-stats">
        <div class="card finance-stat">
          <span class="finance-stat-label">Balance total</span>
          <span class="finance-stat-value" id="stat-balance"></span>
        </div>
        <div class="card finance-stat">
          <span class="finance-stat-label">Ingresos este mes</span>
          <span class="finance-stat-value is-income" id="stat-income"></span>
        </div>
        <div class="card finance-stat">
          <span class="finance-stat-label">Gastos este mes</span>
          <span class="finance-stat-value is-expense" id="stat-expense"></span>
        </div>
      </div>

      <form class="card finance-form">
        <input type="hidden" name="type" value="gasto" />
        <div class="finance-type-toggle">
          <button type="button" class="btn-ghost is-active" data-type="gasto">Gasto</button>
          <button type="button" class="btn-ghost" data-type="ingreso">Ingreso</button>
        </div>
        <div class="finance-form-row">
          <input type="number" name="amount" placeholder="Monto" min="0.01" step="0.01" required />
          <select name="category" id="finance-category"></select>
          <input type="text" name="description" placeholder="Descripción (opcional)" autocomplete="off" />
          <input type="date" name="date" required />
          <button type="submit" class="btn-primary">Agregar</button>
        </div>
      </form>

      <div class="finance-history" id="finance-history"></div>
    `;

    els = {
      form: container.querySelector('.finance-form'),
      typeInput: container.querySelector('input[name="type"]'),
      typeButtons: Array.from(container.querySelectorAll('.finance-type-toggle [data-type]')),
      categorySelect: container.querySelector('#finance-category'),
      dateInput: container.querySelector('input[name="date"]'),
      statBalance: container.querySelector('#stat-balance'),
      statIncome: container.querySelector('#stat-income'),
      statExpense: container.querySelector('#stat-expense'),
      history: container.querySelector('#finance-history'),
    };

    els.dateInput.value = todayISO();
    updateCategoryOptions('gasto');

    container.querySelector('.finance-type-toggle').addEventListener('click', handleTypeToggle);
    els.form.addEventListener('submit', handleFormSubmit);
    els.history.addEventListener('click', handleHistoryClick);

    render();
  },

  unmount() {
    els = {};
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/finanzas/finanzas.css');
      const stats = computeStats(loadTransactions());

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('dollar')}
          <h3>Finanzas</h3>
          <a href="#/finanzas" class="widget-link">Ver todo</a>
        </div>
        <p class="widget-stat ${stats.balance >= 0 ? 'is-income' : 'is-expense'}">${formatCurrency(stats.balance)}</p>
        <p class="widget-empty">Este mes: +${formatCurrency(stats.monthIncome)} / -${formatCurrency(stats.monthExpense)}</p>
      `;
    },
  },
};
