# Application architecture

## Overview

SaldoSpiegel is a static browser application. It has no backend, database, build tool, package installation, or runtime dependency. The browser loads the page, stylesheet, sample module, and application module from the local web server.

## Files

- index.html contains the dashboard, transaction form, backup controls, and accessible labels.
- styles.css contains the visual styles, responsive layout, focus states, and reduced-motion handling.
- src/data.js exports the fictional sample transaction list.
- src/app.js loads saved transactions when available, calculates selected-month totals, updates the month selector, renders the category breakdown and transaction list, applies list filters, validates backups, handles transaction changes, and remembers the appearance choice.
- src/budgets.js validates, stores, and displays monthly spending limits for expense categories.

## Transaction data

Each transaction has an id, ISO date (YYYY-MM-DD), description, optional merchant, category, type, and positive integer amountCents. The type is either income or expense; it determines where an amount is included in the dashboard. Income uses the Income category. Expense categories are selected from the fixed list in the application.

Sample transactions are exported from src/data.js. Until the user makes a change, the dashboard uses a copy of those records. After a successful add, edit, delete, or restore, the full transaction list is saved as JSON under the saldospiegel.transactions.v1 key in browser local storage. On later visits to the same site address and browser profile, the saved list takes precedence over the sample list.

Local storage is not encrypted. The app does not transmit transaction data to a server or external service. If browser storage is unavailable, changes remain in memory only and the interface reports that they were not saved. If saved JSON is malformed, the app falls back to sample entries and reports that saving a change will replace the unreadable value.

## Calculations

For the selected month, transactions are filtered by the YYYY-MM prefix of their date. Income and expenses are summed separately, then:

    monthly net = income total - expense total

Category shares are each category's expense total divided by total spending for that month. Month-to-month comparisons use the closest earlier month present in the transaction list.

## Interface updates

The month selector is rebuilt after a transaction change so a new date can become the selected month. Summary cards, category totals, and transaction rows are then rendered from the current in-memory list. Changes are written to local storage after the interface state is updated. A storage error is reported to the user and the current tab continues to show the in-memory change.

Search matches transaction descriptions and merchants. Category and type filters apply only to the transaction
table; monthly summaries and category totals continue to use every transaction in the selected month. Filter settings
last for the current page view and are not saved.

## Backups

Downloads use a versioned JSON format with a format name, version number, export time, and transaction list. Restore
checks the format version, every transaction field, and duplicate IDs before showing a preview. Confirming restore
replaces the current list and saves it in browser local storage. SaldoSpiegel does not upload backup files; the
browser saves them to its configured download location, which may be synced elsewhere. The files are not encrypted.

## Monthly budgets

Budgets are stored separately from transactions under the saldospiegel.budgets.v1 local storage key. Each month can have a positive euro-cent limit for any of the fixed expense categories. The dashboard compares each limit with the selected month's recorded expenses in that category. A budget applies only to its month and is not copied into later months. Progress is capped at the limit and changes color when spending exceeds it; the amount above the limit remains visible in text. The meter exposes a currency-formatted value description for assistive technology. Budget values are not included in transaction backups.

## Appearance

The page uses the light theme unless a saved choice is available. The top-bar control switches between light and dark themes and stores the selection under the saldospiegel.theme.v1 key in browser local storage. If browser storage is unavailable, the selected theme remains active for the current page only. The theme setting is separate from transaction and budget data.
