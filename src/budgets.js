const STORAGE_KEY = "saldospiegel.budgets.v1";
const currency = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

function validMonth(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function validBudgets(value, categories) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([month, entries]) => {
    if (!validMonth(month) || !entries || typeof entries !== "object" || Array.isArray(entries)) return false;
    return Object.entries(entries).every(([category, cents]) => categories.includes(category) && Number.isSafeInteger(cents) && cents > 0);
  });
}

function readBudgets(categories) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return { items: {}, warning: "" };
    const value = JSON.parse(saved);
    if (!validBudgets(value, categories)) throw new Error("Invalid budget data");
    return { items: value, warning: "" };
  } catch {
    return { items: {}, warning: "Saved budgets could not be read. No budgets are shown; saving a budget will replace the unreadable data." };
  }
}

export function initBudgets({ getTransactions, getMonth, categories, onStatus }) {
  const data = readBudgets(categories);
  let budgets = data.items;
  const form = document.querySelector("#budget-form");
  const categoryField = document.querySelector("#budget-category");
  const amountField = document.querySelector("#budget-amount");
  const list = document.querySelector("#budget-list");

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryField.append(option);
  });

  function formatMoney(cents) {
    return currency.format(cents / 100);
  }

  function parseAmount(value) {
    const match = value.trim().match(/^(\d+)(?:[.,](\d{1,2}))?$/);
    if (!match) return null;
    const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  function showSelectedBudget() {
    const monthBudgets = budgets[getMonth()] || {};
    const cents = monthBudgets[categoryField.value];
    amountField.value = cents ? (cents / 100).toFixed(2) : "";
  }

  function render(_summary, month) {
    document.querySelector("#budget-month-label").textContent = monthFormatter.format(new Date(month + "-15T12:00:00"));
    showSelectedBudget();
    const monthBudgets = budgets[month] || {};
    const spent = new Map();
    getTransactions().forEach((item) => {
      if (item.type === "expense" && item.date.startsWith(month)) {
        spent.set(item.category, (spent.get(item.category) || 0) + item.amountCents);
      }
    });
    list.replaceChildren();
    const entries = categories.filter((category) => monthBudgets[category]);
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "budget-empty";
      empty.textContent = "No budgets set for this month. Choose a category and monthly limit above.";
      list.append(empty);
      return;
    }

    entries.forEach((category) => {
      const limit = monthBudgets[category];
      const amountSpent = spent.get(category) || 0;
      const percentage = amountSpent / limit * 100;
      const row = document.createElement("article");
      row.className = "budget-item";
      const heading = document.createElement("div");
      heading.className = "budget-item-heading";
      const name = document.createElement("strong");
      name.textContent = category;
      const amounts = document.createElement("span");
      amounts.className = "budget-amounts";
      amounts.textContent = formatMoney(amountSpent) + " / " + formatMoney(limit);
      heading.append(name, amounts);
      const track = document.createElement("div");
      track.className = "budget-track";
      track.setAttribute("role", "meter");
      track.setAttribute("aria-label", category + " budget used");
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(limit));
      track.setAttribute("aria-valuenow", String(Math.min(amountSpent, limit)));
      const fill = document.createElement("span");
      fill.className = "budget-fill" + (amountSpent > limit ? " over" : "");
      fill.style.width = Math.min(percentage, 100).toFixed(1) + "%";
      track.append(fill);
      const foot = document.createElement("div");
      foot.className = "budget-item-foot";
      foot.textContent = amountSpent > limit
        ? formatMoney(amountSpent - limit) + " over budget"
        : formatMoney(limit - amountSpent) + " remaining";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "budget-remove";
      remove.dataset.category = category;
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + category + " budget");
      row.append(heading, track, foot, remove);
      list.append(row);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const cents = parseAmount(amountField.value);
    if (cents === null) {
      amountField.setCustomValidity("Enter a positive monthly limit with no more than two decimal places.");
      amountField.reportValidity();
      return;
    }
    amountField.setCustomValidity("");
    const month = getMonth();
    if (!budgets[month]) budgets[month] = {};
    budgets[month][categoryField.value] = cents;
    render(null, month);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
      onStatus("Monthly " + categoryField.value + " budget saved in this browser.");
    } catch {
      onStatus("The browser could not save this budget. It will be lost when this tab closes.");
    }
  });
  categoryField.addEventListener("change", showSelectedBudget);
  amountField.addEventListener("input", () => amountField.setCustomValidity(""));
  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    const month = getMonth();
    delete budgets[month][button.dataset.category];
    if (!Object.keys(budgets[month]).length) delete budgets[month];
    render(null, month);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
      onStatus(button.dataset.category + " budget removed.");
    } catch {
      onStatus("The browser could not save this change. The budget will return when this tab closes.");
    }
  });

  return { render, warning: data.warning };
}
