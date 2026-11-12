# Changelog

## v0.5.0

- Add monthly spending limits for expense categories, with progress and over-budget amounts.
- Save budgets by month in browser storage, separately from transaction data.

## v0.4.0

- Download a versioned JSON backup of the current transaction list.
- Validate a selected backup and preview its entry count before restoring.
- Require confirmation before replacing the current list with a backup.
- Document local backup handling and the replacement behavior.

## v0.3.0

- Add search by description or merchant, plus category and transaction type filters.
- Show the filtered result count and provide a clear-filters control with helpful empty states.
- Keep monthly summaries and category totals based on all transactions in the selected month.

## v0.2.0

- Add forms to create and edit income and expense transactions, and remove existing entries.
- Save transaction changes in browser local storage and report storage errors in the interface.
- Show every transaction for the selected month and refresh monthly summaries after changes.
- Document browser storage, current limitations, and the MIT License.

## v0.1.0

- Add a responsive local dashboard for income, spending, monthly net, category shares, and recent transactions.
- Add a month selector and comparison with the previous sample month.
- Document setup, calculations, data handling, and current limitations.
