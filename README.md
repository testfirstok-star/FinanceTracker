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

## How the numbers work

Every page reads its figures from `src/lib/cashflow.ts`, so they always agree.

| Term | Definition |
|---|---|
| **Actual entry** | A transaction that isn't planned. Entries logged with a future date are **planned** until you confirm them, and are counted by nothing. |
| **Income** | Actual income in the period. |
| **Expenses** | Actual expenses on a **cash** account, or on no account at all. Nothing else. |
| **Card purchases** | Actual expenses on a **card** account. Tracked for reference, counted nowhere — the card bill you pay from a cash account is the expense. |
| **Invested** | Expenses on an **invest** account, plus portfolio deposits less withdrawals. Money moved, not spent. |
| **Lent out / Repaid** | Loan principal leaving and coming back. Never income, never expense. |
| **Loan interest** | Income earned on money lent out. This *is* income. |
| **Surplus** | `Income − Expenses`. What you kept. The only figure that means savings. |
| **Cash change** | `Surplus − Invested − Lent out + Repaid`. Why your bank balance moved. |

Surplus answers "did I live within my means"; Cash change answers "why did my bank balance
move". Investing or lending never lowers Surplus, and being repaid never raises it.

Each account has a **kind** that decides all of this: Cash counts as Expenses, Card is tracked
only, Invest counts as Invested. Dividends and fees stay inside a portfolio unless you tick
"paid out to / paid from my bank" when logging them.

## Planned work

[docs/FINANCE_MODEL_FIXES.md](docs/FINANCE_MODEL_FIXES.md) is the implementation spec for
making every page agree on Income, Expenses, Invested, Surplus and Cash change. Build the
fixes in the order listed there.
