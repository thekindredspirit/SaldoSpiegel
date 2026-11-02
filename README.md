# SaldoSpiegel

SaldoSpiegel helps you review monthly income, spending, and net cash flow. For now, the dashboard uses fictional transactions for September and October 2026.

SaldoSpiegel runs locally and is meant for one person. This version does not connect to a bank or save transactions you enter.

## Current milestone

**Dashboard foundation (v0.1.0)**

The current build includes:

- Monthly income, spending, and net cash flow summaries.
- A comparison with the previous sample month.
- Spending totals and shares grouped by category.
- A recent transaction table.
- A month selector for the included sample periods.
- Responsive layout and visible keyboard focus states.

This version is a read-only preview. All displayed transactions are fictional.

## Preview

Open the project through a local web server so the browser can load its JavaScript modules.

From this folder, run:

    py -m http.server 8000 --bind 127.0.0.1

Then open:

    http://localhost:8000

If the Python launcher on your system is named differently, use Python 3.8 or later to start its built-in HTTP server with the same bind address. Stop the server with Ctrl+C in the terminal.

No installation or build step is needed.

## Using the dashboard

Use the month selector near the page heading to switch between September and October 2026. The three summary cards show:

- **Income:** the sum of entries marked as income.
- **Spending:** the sum of entries marked as expenses.
- **Monthly net:** income minus spending for the selected month.

The spending panel groups expense entries by category and shows each category's share of the month's spending. The transaction table shows up to eight latest entries for the selected month.

Amounts are stored as integer euro cents in the sample data. This avoids floating-point arithmetic when adding transaction amounts. The interface formats those amounts as euros.

## Project structure

    index.html          Page structure and accessible labels
    styles.css          Layout, visual design, and responsive rules
    src/app.js          Monthly calculations and rendering
    src/data.js         Synthetic transaction records
    docs/architecture.md  How the dashboard is structured
    CHANGELOG.md          Release notes

## Data and privacy

The fictional sample records are in src/data.js. The browser loads that file when you open the page.

Do not use real personal financial information in screenshots, sample files, or public issue reports. The sample records are fictional and should not be used to make financial decisions.

## Current limitations

- Transactions cannot yet be created, edited, deleted, or saved.
- The dashboard only contains the two sample months in src/data.js.
- The monthly net figure is calculated from the listed transactions. It is not a bank account balance.
- The sample dataset is illustrative and should not be used for financial decisions.
