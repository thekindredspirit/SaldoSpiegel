# Foundation architecture

## Overview

SaldoSpiegel currently runs as a static browser application. It has no backend, database, third-party service, build tool, or runtime dependency.

## Files

- index.html supplies the page structure and accessible labels.
- styles.css supplies the visual system, layout, responsive behavior, and reduced-motion handling.
- src/data.js exports the synthetic transaction list.
- src/app.js derives monthly totals from that list, populates the month selector, and renders the category breakdown and recent activity.

## Sample transaction shape

Each sample record has:

- id: a stable identifier within the sample list.
- date: an ISO date in YYYY-MM-DD form.
- description and merchant: the text shown in the activity table.
- category: a display category.
- type: either income or expense.
- amountCents: a positive integer amount in euro cents.

The amount stays positive in the data. The type field controls whether it contributes to income or spending, and the interface adds the appropriate sign when displaying it.

## Calculations

For a selected month, the dashboard filters entries by the YYYY-MM portion of their date. It sums income and expense entries separately, then calculates:

    monthly net = income total - expense total

Category shares use each category's expense total divided by total spending for the selected month. Month-to-month percentages use the previous sample month when one is available.

## Data flow

The browser imports the sample records when the page loads. A month selection triggers a fresh calculation from those records and updates the summary cards, category list, and recent transaction rows. The page does not mutate or save the sample data.
