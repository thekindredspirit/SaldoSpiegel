import { transactions as sampleTransactions } from "./data.js";
import { initBudgets } from "./budgets.js";

const STORAGE_KEY = "saldospiegel.transactions.v1";
const BACKUP_FORMAT = "saldospiegel-backup";
const BACKUP_VERSION = 1;
const THEME_STORAGE_KEY = "saldospiegel.theme.v1";
const EXPENSE_CATEGORIES = [
  "Housing", "Groceries", "Transport", "Utilities", "Dining", "Education",
  "Subscriptions", "Health", "Leisure", "Shopping", "Fitness"
];
const CATEGORIES = { expense: EXPENSE_CATEGORIES, income: ["Income"] };
const currency = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

const monthFilter = document.querySelector("#month-filter");
const dialog = document.querySelector("#transaction-dialog");
const form = document.querySelector("#transaction-form");
const typeField = document.querySelector("#transaction-type");
const categoryField = document.querySelector("#transaction-category");
const dateField = document.querySelector("#transaction-date");
const amountField = document.querySelector("#transaction-amount");
const searchField = document.querySelector("#transaction-search");
const categoryFilter = document.querySelector("#transaction-category-filter");
const typeFilter = document.querySelector("#transaction-type-filter");
const clearFiltersButton = document.querySelector("#clear-transaction-filters");
const backupFileField = document.querySelector("#backup-file");
const backupReview = document.querySelector("#backup-review");
const restoreBackupButton = document.querySelector("#restore-backup");
const themeToggle = document.querySelector("#theme-toggle");
let editingId = null;
let monthKeys = [];
let pendingBackup = null;

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTransaction(item) {
  return item && typeof item.id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(item.id) &&
    validDate(item.date) && typeof item.description === "string" &&
    item.description.trim().length > 0 && item.description.length <= 100 &&
    typeof item.merchant === "string" && item.merchant.length <= 100 &&
    (item.type === "income" || item.type === "expense") &&
    CATEGORIES[item.type].includes(item.category) &&
    Number.isSafeInteger(item.amountCents) && item.amountCents > 0;
}

function validTransactionList(items) {
  if (!Array.isArray(items)) return false;
  const ids = new Set();
  return items.every((item) => {
    if (!validTransaction(item) || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

function copyTransaction(item) {
  return {
    id: item.id,
    date: item.date,
    description: item.description,
    merchant: item.merchant,
    category: item.category,
    type: item.type,
    amountCents: item.amountCents
  };
}

function transactionWord(count) {
  return count === 1 ? "entry" : "entries";
}

function loadSavedTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return { items: sampleTransactions.map((item) => ({ ...item })), loaded: false, warning: "" };
    }
    const items = JSON.parse(saved);
    if (!validTransactionList(items)) throw new Error("Invalid saved data");
    return { items, loaded: true, warning: "" };
  } catch (error) {
    const warning = error instanceof SyntaxError || error.message === "Invalid saved data"
      ? "Saved data could not be read. Sample entries are shown; saving a change will replace the unreadable data."
      : "Browser storage is unavailable. Changes will only last for this tab.";
    return { items: sampleTransactions.map((item) => ({ ...item })), loaded: false, warning };
  }
}

const initialData = loadSavedTransactions();
let transactions = initialData.items;
const budgetController = initBudgets({ getTransactions: () => transactions, getMonth: () => monthFilter.value, categories: EXPENSE_CATEGORIES, onStatus: status });

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch {
    return false;
  }
}

function formatMonth(key) {
  return monthFormatter.format(new Date(key + "-15T12:00:00"));
}

function formatMoney(cents) {
  return currency.format(cents / 100);
}

function formatDate(value) {
  return dateFormatter.format(new Date(value + "T12:00:00"));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function categorySlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function status(message) {
  setText("#app-status", message);
}

function backupStatus(message) {
  setText("#backup-message", message);
}

function readTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.textContent = dark ? "Light mode" : "Dark mode";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#17211d" : "#f4f6f3";
}

function thisMonth() {
  const date = new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function refreshMonthOptions(preferred) {
  const months = new Set(transactions.map((item) => item.date.slice(0, 7)));
  if (preferred) months.add(preferred);
  if (!months.size) months.add(thisMonth());
  monthKeys = [...months].sort().reverse();
  monthFilter.replaceChildren();
  monthKeys.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = formatMonth(key);
    monthFilter.append(option);
  });
  monthFilter.value = monthKeys.includes(preferred) ? preferred : monthKeys[0];
  return monthFilter.value;
}

function summaryFor(key) {
  const items = transactions.filter((item) => item.date.startsWith(key));
  const incomeItems = items.filter((item) => item.type === "income");
  const expenseItems = items.filter((item) => item.type === "expense");
  const income = incomeItems.reduce((sum, item) => sum + item.amountCents, 0);
  const spending = expenseItems.reduce((sum, item) => sum + item.amountCents, 0);
  return { items, incomeItems, expenseItems, income, spending, net: income - spending };
}

function comparison(current, previous, previousMonth) {
  if (previous === null) return { text: "No earlier month", className: "no-history" };
  if (previous === 0) return { text: "No earlier total", className: "no-history" };
  const change = (current - previous) / Math.abs(previous) * 100;
  const magnitude = Math.abs(change) < 0.05 ? "0.0" : Math.abs(change).toFixed(1);
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return { text: sign + magnitude + "% vs " + formatMonth(previousMonth).split(" ")[0], className: "" };
}

function renderCategories(summary, month) {
  setText("#category-month", formatMonth(month));
  setText("#category-total", formatMoney(summary.spending));
  const totals = new Map();
  summary.expenseItems.forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.amountCents));
  const categories = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const list = document.querySelector("#category-list");
  if (!categories.length) {
    list.innerHTML = '<p class="empty-row">No expenses recorded for this month.</p>';
    return;
  }
  list.innerHTML = categories.map(([name, cents]) => {
    const share = summary.spending ? cents / summary.spending * 100 : 0;
    const safeName = escapeHtml(name);
    const slug = categorySlug(name);
    return '<div class="category-item">' +
      '<span class="category-name"><span class="category-dot category-' + slug + '" aria-hidden="true"></span>' + safeName + '</span>' +
      '<span class="category-track" aria-hidden="true"><span class="category-fill category-' + slug + '" style="width: ' + share.toFixed(1) + '%"></span></span>' +
      '<span class="category-amount"><span>' + formatMoney(cents) + '</span><small>' + share.toFixed(1) + '%</small></span></div>';
  }).join("");
}

function hasActiveTransactionFilters() {
  return Boolean(searchField.value.trim() || categoryFilter.value || typeFilter.value);
}

function filterTransactions(items) {
  const query = searchField.value.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const searchableText = (item.description + " " + item.merchant).toLocaleLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    const matchesCategory = !categoryFilter.value || item.category === categoryFilter.value;
    const matchesType = !typeFilter.value || item.type === typeFilter.value;
    return matchesSearch && matchesCategory && matchesType;
  });
}

function populateTransactionCategoryFilter() {
  categoryFilter.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All categories";
  categoryFilter.append(allOption);

  [...EXPENSE_CATEGORIES, "Income"].forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.append(option);
  });
}

function renderTransactions(summary) {
  const rows = document.querySelector("#transaction-rows");
  const activeFilters = hasActiveTransactionFilters();
  const items = filterTransactions(summary.items).sort((a, b) => b.date.localeCompare(a.date));
  const entryLabel = transactionWord(summary.items.length);
  setText("#transaction-count", activeFilters
    ? items.length + " of " + summary.items.length + " " + entryLabel
    : summary.items.length + " " + entryLabel);
  clearFiltersButton.hidden = !activeFilters;

  if (!items.length) {
    const message = summary.items.length
      ? "No transactions match these filters. Try changing or clearing them."
      : "No transactions recorded for this month.";
    rows.innerHTML = '<tr><td colspan="5" class="empty-row">' + message + '</td></tr>';
    return;
  }

  rows.innerHTML = items.map((item) => {
    const name = escapeHtml(item.description);
    const category = escapeHtml(item.category);
    const merchant = escapeHtml(item.merchant);
    const id = escapeHtml(item.id);
    const income = item.type === "income";
    return '<tr><td><div class="transaction-primary"><span class="category-symbol category-' + categorySlug(item.category) + '" aria-hidden="true">' +
      escapeHtml(item.category.slice(0, 1)) + '</span><span class="transaction-name"><strong>' + name + '</strong>' +
      (merchant ? '<span>' + merchant + '</span>' : '') + '</span></div></td>' +
      '<td><span class="category-label">' + category + '</span></td><td class="date-cell">' + formatDate(item.date) + '</td>' +
      '<td class="amount-cell ' + (income ? "income" : "expense") + '">' + (income ? "+" : "−") + formatMoney(item.amountCents) + '</td>' +
      '<td class="transaction-actions"><button type="button" class="row-action" data-action="edit" data-id="' + id + '" aria-label="Edit ' + name + '">Edit</button>' +
      '<button type="button" class="row-action delete-action" data-action="delete" data-id="' + id + '" aria-label="Delete ' + name + '">Delete</button></td></tr>';
  }).join("");
}

function renderDashboard(key) {
  const summary = summaryFor(key);
  const previousMonth = monthKeys[monthKeys.indexOf(key) + 1] || null;
  const previous = previousMonth ? summaryFor(previousMonth) : null;
  setText("#income-total", formatMoney(summary.income));
  setText("#spending-total", formatMoney(summary.spending));
  setText("#net-total", formatMoney(summary.net));
  document.querySelector("#net-total").classList.toggle("is-negative", summary.net < 0);
  const comparisons = [
    comparison(summary.income, previous ? previous.income : null, previousMonth),
    comparison(summary.spending, previous ? previous.spending : null, previousMonth),
    comparison(summary.net, previous ? previous.net : null, previousMonth)
  ];
  ["#income-change", "#spending-change", "#net-change"].forEach((selector, index) => {
    const element = document.querySelector(selector);
    element.textContent = comparisons[index].text;
    element.className = "trend-chip " + comparisons[index].className;
  });
  setText("#income-detail", summary.incomeItems.length + " income entries");
  setText("#spending-detail", summary.expenseItems.length + " expense entries");
  setText("#net-detail", summary.income ? (summary.net / summary.income * 100).toFixed(1) + "% of income left after spending" : "No income entries recorded");
  renderCategories(summary, key);
  budgetController.render(summary, key);
  renderTransactions(summary);
  document.title = "SaldoSpiegel — " + formatMonth(key);
}

function updateCategories(selected) {
  categoryField.replaceChildren();
  CATEGORIES[typeField.value].forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categoryField.append(option);
  });
  categoryField.value = CATEGORIES[typeField.value].includes(selected) ? selected : CATEGORIES[typeField.value][0];
}

function openForm(item) {
  form.reset();
  amountField.setCustomValidity("");
  dateField.setCustomValidity("");
  document.querySelector("#transaction-description").setCustomValidity("");
  editingId = item ? item.id : null;
  setText("#transaction-form-title", item ? "Edit transaction" : "Add transaction");
  setText("#transaction-form-description", item ? "Update the details below." : "Enter the details for this transaction.");
  typeField.value = item ? item.type : "expense";
  updateCategories(item ? item.category : "Groceries");
  const today = new Date();
  dateField.value = item ? item.date : today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  document.querySelector("#transaction-description").value = item ? item.description : "";
  document.querySelector("#transaction-merchant").value = item ? item.merchant : "";
  amountField.value = item ? Math.floor(item.amountCents / 100) + "." + String(item.amountCents % 100).padStart(2, "0") : "";
  dialog.showModal();
  document.querySelector("#transaction-description").focus();
}

function parseAmount(value) {
  const match = value.trim().match(/^(\d+)(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function applyChanges(next, month, message, reportStatus = status) {
  transactions = next;
  renderDashboard(refreshMonthOptions(month));
  if (saveTransactions()) reportStatus(message + " Saved in this browser.");
  else reportStatus("The browser could not save this change. It will be lost when this tab closes.");
}

function clearTransactionFilters() {
  searchField.value = "";
  categoryFilter.value = "";
  typeFilter.value = "";
}

function backupFileDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return [date.getFullYear(), month, day].join("-");
}

function downloadBackup() {
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: transactions.map(copyTransaction)
  };
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "saldospiegel-backup-" + backupFileDate() + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  backupStatus("Backup download started with " + transactions.length + " transaction " + transactionWord(transactions.length) + ". Keep the file somewhere private.");
}

function clearBackupReview() {
  pendingBackup = null;
  backupReview.hidden = true;
  setText("#backup-review-name", "");
  setText("#backup-review-summary", "");
  restoreBackupButton.disabled = true;
}

async function reviewBackupFile(file) {
  clearBackupReview();
  backupStatus("");
  if (!file) return;

  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    backupStatus("The selected file could not be read as JSON.");
    return;
  } finally {
    backupFileField.value = "";
  }

  if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    backupStatus("This is not a supported SaldoSpiegel backup file.");
    return;
  }
  if (!validTransactionList(backup.transactions)) {
    backupStatus("The backup contains invalid or duplicate transaction entries.");
    return;
  }

  pendingBackup = backup.transactions.map(copyTransaction);
  const backupCount = pendingBackup.length;
  const currentCount = transactions.length;
  const backupLabel = transactionWord(backupCount);
  const currentLabel = transactionWord(currentCount);
  setText("#backup-review-name", file.name);
  setText("#backup-review-summary", "This backup has " + backupCount + " " + backupLabel + ". Restoring it will replace your current list of " + currentCount + " " + currentLabel + ".");
  backupReview.hidden = false;
  restoreBackupButton.disabled = false;
  backupStatus("Backup checked. Review the replacement details before restoring it.");
}

function restoreBackup() {
  if (!pendingBackup) return;
  const backupCount = pendingBackup.length;
  const currentCount = transactions.length;
  const backupLabel = transactionWord(backupCount);
  const currentLabel = transactionWord(currentCount);
  const confirmed = window.confirm("Restore " + backupCount + " " + backupLabel + "? This will replace all " + currentCount + " current " + currentLabel + ".");
  if (!confirmed) return;

  const restored = pendingBackup.map(copyTransaction);
  const latestMonth = restored.reduce((latest, item) => {
    const month = item.date.slice(0, 7);
    return month > latest ? month : latest;
  }, "") || null;
  clearBackupReview();
  clearTransactionFilters();
  applyChanges(restored, latestMonth, "Backup restored.", backupStatus);
  document.querySelector("#download-backup").focus();
}

monthFilter.addEventListener("change", (event) => renderDashboard(event.currentTarget.value));
const renderCurrentMonthTransactions = () => renderTransactions(summaryFor(monthFilter.value));
searchField.addEventListener("input", renderCurrentMonthTransactions);
categoryFilter.addEventListener("change", renderCurrentMonthTransactions);
typeFilter.addEventListener("change", renderCurrentMonthTransactions);
clearFiltersButton.addEventListener("click", () => {
  clearTransactionFilters();
  renderCurrentMonthTransactions();
  searchField.focus();
});
document.querySelector("#download-backup").addEventListener("click", downloadBackup);
backupFileField.addEventListener("change", (event) => reviewBackupFile(event.currentTarget.files[0]));
document.querySelector("#discard-backup").addEventListener("click", () => {
  clearBackupReview();
  backupStatus("Backup selection cleared. Your current transactions were not changed.");
  backupFileField.focus();
});
restoreBackupButton.addEventListener("click", restoreBackup);
applyTheme(readTheme());
themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    status("The theme changed for this tab, but the browser could not remember your choice.");
  }
});
document.querySelector("#add-transaction").addEventListener("click", () => openForm(null));
typeField.addEventListener("change", () => updateCategories(null));
amountField.addEventListener("input", () => amountField.setCustomValidity(""));
document.querySelector("#transaction-description").addEventListener("input", (event) => event.currentTarget.setCustomValidity(""));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const cents = parseAmount(amountField.value);
  if (cents === null) {
    amountField.setCustomValidity("Enter a positive amount with no more than two decimal places.");
    amountField.reportValidity();
    return;
  }
  amountField.setCustomValidity("");
  const date = dateField.value;
  const descriptionField = document.querySelector("#transaction-description");
  const description = descriptionField.value.trim();
  if (!description) {
    descriptionField.setCustomValidity("Enter a description.");
    descriptionField.reportValidity();
    return;
  }
  descriptionField.setCustomValidity("");
  if (!validDate(date)) {
    dateField.setCustomValidity("Choose a valid date.");
    dateField.reportValidity();
    return;
  }
  dateField.setCustomValidity("");
  const item = {
    id: editingId || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "transaction-" + Date.now()),
    date,
    description,
    merchant: document.querySelector("#transaction-merchant").value.trim(),
    category: categoryField.value,
    type: typeField.value,
    amountCents: cents
  };
  const next = editingId ? transactions.map((existing) => existing.id === editingId ? item : existing) : [...transactions, item];
  applyChanges(next, date.slice(0, 7), editingId ? "Transaction updated." : "Transaction added.");
  dialog.close();
});

document.querySelector("#close-transaction-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancel-transaction").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelector("#transaction-rows").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = transactions.find((transaction) => transaction.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "edit") {
    openForm(item);
  } else if (window.confirm("Delete \"" + item.description + "\"? This change cannot be undone.")) {
    applyChanges(transactions.filter((transaction) => transaction.id !== item.id), monthFilter.value, "Transaction deleted.");
  }
});

populateTransactionCategoryFilter();
renderDashboard(refreshMonthOptions(null));
if (initialData.warning) status(initialData.warning);
else if (budgetController.warning) status(budgetController.warning);
else if (initialData.loaded) status("Your saved transactions are loaded from this browser.");
else status("Sample transactions are shown. Your changes will be saved in this browser.");
