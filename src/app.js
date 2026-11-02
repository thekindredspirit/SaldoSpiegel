import { transactions } from "./data.js";

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR"
});
const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric"
});
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short"
});

const monthFilter = document.querySelector("#month-filter");
const monthKeys = [...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))]
  .sort()
  .reverse();

function monthDate(monthKey) {
  return new Date(monthKey + "-15T12:00:00");
}

function formatMonth(monthKey) {
  return monthFormatter.format(monthDate(monthKey));
}

function formatMoney(amountCents) {
  return currencyFormatter.format(amountCents / 100);
}

function formatDate(dateString) {
  return dateFormatter.format(new Date(dateString + "T12:00:00"));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

function monthSummary(monthKey) {
  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const incomeItems = monthTransactions.filter((transaction) => transaction.type === "income");
  const expenseItems = monthTransactions.filter((transaction) => transaction.type === "expense");
  const incomeCents = incomeItems.reduce((sum, transaction) => sum + transaction.amountCents, 0);
  const spendingCents = expenseItems.reduce((sum, transaction) => sum + transaction.amountCents, 0);

  return {
    monthTransactions,
    incomeItems,
    expenseItems,
    incomeCents,
    spendingCents,
    netCents: incomeCents - spendingCents
  };
}

function getPreviousMonth(monthKey) {
  const monthIndex = monthKeys.indexOf(monthKey);
  return monthKeys[monthIndex + 1] || null;
}

function comparisonText(currentCents, previousCents, previousMonth) {
  if (previousCents === null) {
    return { text: "No earlier month", className: "no-history" };
  }
  if (previousCents === 0) {
    return { text: "No earlier total", className: "no-history" };
  }

  const change = ((currentCents - previousCents) / Math.abs(previousCents)) * 100;
  const magnitude = Math.abs(change) < 0.05 ? "0.0" : Math.abs(change).toFixed(1);
  const direction = change > 0 ? "+" : change < 0 ? "−" : "";
  const previousLabel = formatMonth(previousMonth).split(" ")[0];
  return { text: direction + magnitude + "% vs " + previousLabel, className: "" };
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function categorySlug(category) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderCategories(summary, monthKey) {
  setText("#category-month", formatMonth(monthKey));
  setText("#category-total", formatMoney(summary.spendingCents));

  const totalsByCategory = new Map();
  summary.expenseItems.forEach((transaction) => {
    const current = totalsByCategory.get(transaction.category) || 0;
    totalsByCategory.set(transaction.category, current + transaction.amountCents);
  });

  const categories = [...totalsByCategory.entries()].sort((left, right) => right[1] - left[1]);
  const list = document.querySelector("#category-list");

  if (categories.length === 0) {
    list.innerHTML = '<p class="empty-row">No expenses recorded for this month.</p>';
    return;
  }

  list.innerHTML = categories.map(([category, amountCents]) => {
    const share = summary.spendingCents > 0 ? (amountCents / summary.spendingCents) * 100 : 0;
    const safeCategory = escapeHtml(category);
    const slug = categorySlug(category);
    return '<div class="category-item">' +
      '<span class="category-name"><span class="category-dot category-' + slug + '" aria-hidden="true"></span>' + safeCategory + '</span>' +
      '<span class="category-track" aria-hidden="true"><span class="category-fill category-' + slug + '" style="width: ' + share.toFixed(1) + '%"></span></span>' +
      '<span class="category-amount"><span>' + formatMoney(amountCents) + '</span><small>' + share.toFixed(1) + '%</small></span>' +
      '</div>';
  }).join("");
}

function renderTransactions(summary) {
  const rows = document.querySelector("#transaction-rows");
  const recent = [...summary.monthTransactions]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 8);

  setText("#transaction-count", summary.monthTransactions.length + " entries");

  if (recent.length === 0) {
    rows.innerHTML = '<tr><td colspan="4" class="empty-row">No transactions recorded for this month.</td></tr>';
    return;
  }

  rows.innerHTML = recent.map((transaction) => {
    const isIncome = transaction.type === "income";
    const sign = isIncome ? "+" : "−";
    const category = escapeHtml(transaction.category);
    const description = escapeHtml(transaction.description);
    const merchant = escapeHtml(transaction.merchant);
    const marker = escapeHtml(transaction.category.slice(0, 1));
    const amountClass = isIncome ? "income" : "expense";

    return '<tr>' +
      '<td><div class="transaction-primary">' +
      '<span class="category-symbol category-' + categorySlug(transaction.category) + '" aria-hidden="true">' + marker + '</span>' +
      '<span class="transaction-name"><strong>' + description + '</strong><span>' + merchant + '</span></span>' +
      '</div></td>' +
      '<td><span class="category-label">' + category + '</span></td>' +
      '<td class="date-cell">' + formatDate(transaction.date) + '</td>' +
      '<td class="amount-cell ' + amountClass + '">' + sign + formatMoney(transaction.amountCents) + '</td>' +
      '</tr>';
  }).join("");
}

function renderDashboard(monthKey) {
  const summary = monthSummary(monthKey);
  const previousMonth = getPreviousMonth(monthKey);
  const previousSummary = previousMonth ? monthSummary(previousMonth) : null;

  setText("#income-total", formatMoney(summary.incomeCents));
  setText("#spending-total", formatMoney(summary.spendingCents));
  setText("#net-total", formatMoney(summary.netCents));

  const netElement = document.querySelector("#net-total");
  netElement.classList.toggle("is-negative", summary.netCents < 0);

  const comparisons = [
    comparisonText(summary.incomeCents, previousSummary ? previousSummary.incomeCents : null, previousMonth),
    comparisonText(summary.spendingCents, previousSummary ? previousSummary.spendingCents : null, previousMonth),
    comparisonText(summary.netCents, previousSummary ? previousSummary.netCents : null, previousMonth)
  ];
  ["#income-change", "#spending-change", "#net-change"].forEach((selector, index) => {
    const element = document.querySelector(selector);
    element.textContent = comparisons[index].text;
    element.className = "trend-chip " + comparisons[index].className;
  });

  setText("#income-detail", summary.incomeItems.length + " income entries");
  setText("#spending-detail", summary.expenseItems.length + " expense entries");

  if (summary.incomeCents > 0) {
    const savingsRate = (summary.netCents / summary.incomeCents) * 100;
    setText("#net-detail", savingsRate.toFixed(1) + "% of income left after spending");
  } else {
    setText("#net-detail", "No income entries recorded");
  }

  renderCategories(summary, monthKey);
  renderTransactions(summary);
  document.title = "SaldoSpiegel — " + formatMonth(monthKey);
}

monthKeys.forEach((monthKey) => {
  const option = document.createElement("option");
  option.value = monthKey;
  option.textContent = formatMonth(monthKey);
  monthFilter.append(option);
});

monthFilter.value = monthKeys[0] || "";
monthFilter.addEventListener("change", (event) => {
  renderDashboard(event.currentTarget.value);
});

if (monthKeys.length > 0) {
  renderDashboard(monthKeys[0]);
}
