# Finance Tracker

A personal finance tracker: log expenses/income by chatting ("lunch 12"), track fixed
recurring items, browse a monthly dashboard, and manage per-account investments.

All data is stored locally in your browser (`localStorage`) — nothing is sent to a server.

## Pages

- **Log** — chat-style entry with keyword auto-categorization, plus one-click fixed
  expense/income items.
- **Dashboard** — monthly income/expense report with category pie charts, daily spend
  and income calendars, and an investments summary.
- **Expenses** / **Income** — full logging form, filterable history table, and category
  management (categories can be added/renamed/removed; removing one keeps past entries
  labeled as they were).
- **Investments** — create any number of investment accounts, each with its own
  collapsible log of deposits, withdrawals, investment income, and investment expenses.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Pushing to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml),
which builds the app and publishes it to GitHub Pages. Enable Pages once, under
**Settings → Pages → Source: GitHub Actions**.
