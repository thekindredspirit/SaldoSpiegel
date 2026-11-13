# SaldoSpiegel

SaldoSpiegel is a small personal finance dashboard for reviewing monthly income, spending, and net cash flow. It starts with fictional transactions so the dashboard can be explored before any personal entries are added.

The app runs in a browser and does not connect to a bank. Transaction, budget, and appearance preferences stay in the browser you are using.

## Current milestone

**Interface polish and dark mode (v0.6.0)**

This milestone builds on the dashboard foundation with:

- Monthly income, spending, and net cash flow summaries.
- Spending totals and shares grouped by category.
- Month-to-month comparisons when an earlier month is available.
- A month selector and a full transaction list for the selected month.
- Search by description or merchant, and filter the list by category or transaction type.
- A result count, a clear-filters button, and separate empty messages for empty months and unmatched filters.
- Download a versioned JSON backup and validate a backup file before restoring it.
- Set monthly spending limits for expense categories, see how much has been spent, and remove limits when they are no longer needed.
- Switch between light and dark appearance; the selection is remembered in this browser.
- Forms to add and edit income or expense transactions, and remove entries.
- Browser storage for transactions after the first change.
- Responsive layout and visible keyboard focus states.

The initial entries are fictional. After the first successful change, the dashboard uses the list saved in this
browser. Restoring a backup replaces that list with the entries from the selected file. Category budgets are stored
separately for each month in the same browser profile and are not included in transaction backups.

## Run locally

Open a terminal in this folder and start a local web server:

    py -m http.server 8000 --bind 127.0.0.1

Then open http://localhost:8000 in a browser. If the Python launcher is named differently on your system, use Python 3.8 or later to run its built-in HTTP server with the same bind address. Stop the server with Ctrl+C in the terminal.

No package installation or build step is needed.

## Using the dashboard

Choose a month near the page heading to review its transactions. Use **Add transaction** to enter an income or expense. Existing entries can be edited or deleted from the table.

Enter a positive amount in euros, using either a dot or comma and up to two decimal places. An entry's type determines whether the amount contributes to income or spending. Monthly net is calculated as income minus spending; it is not a bank account balance. Category shares are calculated from that month's expenses.

In the transaction panel, search by description or merchant, then filter by category or type. These controls narrow
the table only; monthly cards and the category breakdown continue to use every transaction in the selected month.

Use the **Dark mode** button in the top bar to change the appearance. The selection is remembered in this browser.

Use **Download JSON backup** to save a copy of your entries. To restore, choose a SaldoSpiegel backup and review its
entry count. Restoring replaces the current transaction list after confirmation. Backup files contain transaction
details and are not encrypted, so keep them somewhere private.

Amounts are kept as integer euro cents to avoid common floating-point rounding errors. The dashboard currently uses one currency and a fixed set of categories.

## Data and privacy

Your changes are saved in this browser's local storage for the current site address. They stay in this browser
profile and are not sent to a bank or an external service. Local storage is not encrypted, is tied to the browser
profile and site address, and can be removed when browser data is cleared. SaldoSpiegel does not upload backup files;
the browser saves them to its configured download location, which may be synced elsewhere. Backups contain
transaction details and are not encrypted.

The light or dark theme choice is saved in browser storage separately from transactions and budgets.

Do not use real personal financial information in screenshots, sample files, or public issue reports. The sample records are fictional and should not be used to make financial decisions.

## Project structure

    index.html            Page structure, dashboard, transaction form, and backup controls
    styles.css            Layout, visual design, and responsive rules
    src/app.js            Calculations, transaction storage, backup validation, theme preference, and interface behavior
    src/budgets.js        Monthly category budget storage and display
    src/data.js           Fictional sample transactions
    docs/architecture.md  Application structure and data flow
    CHANGELOG.md          Milestone notes
    LICENSE               MIT License

## Current limitations

- Transactions must be entered manually so each entry can be reviewed before saving.
- Restoring a backup replaces the current transaction list; there is no merge option.
- Data is stored in one browser profile and is not encrypted.
- Categories and currency are fixed to the options in the form.
- Search and filter settings are temporary and reset when the page is reloaded.
- The dashboard is a personal record-keeping tool, not financial advice or a bank balance tracker.

## License

SaldoSpiegel is licensed under the MIT License. See [LICENSE](LICENSE) for the full text.
