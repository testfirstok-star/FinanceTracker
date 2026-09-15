# Finance model fixes — implementation spec

This document is the single source of truth for the fixes that make the tracker's numbers
consistent and non-misleading. It is written for an agent (or person) who has not seen the
conversation that produced it. Every fix says **what is wrong, where in the code, exactly
what to change, how to migrate existing data, and how to verify it**.

Build the fixes **in the order listed**. Each one is a separate branch + commit + merge to
`main` (fast-forward only, after the owner says "yes"). Do not bundle fixes.

Conventions that already hold in this repo and must keep holding:

- Stack: React 19 + TypeScript + Vite + Tailwind v4, HashRouter, all state in one
  `AppData` blob in `localStorage` under key `finance-tracker-data-v1`
  (`src/storage/db.ts`). All mutations go through `useData()` in `src/hooks/DataContext.tsx`.
- Data migrations live in `loadData()` in `src/storage/db.ts`, are idempotent, and never
  overwrite an explicit user choice (only fill fields that are `undefined`).
- Before every commit: `npm run build` (tsc + vite) and `npm run lint` (oxlint) must be
  clean. The only acceptable warning is the pre-existing `only-export-components` warning
  on `src/hooks/DataContext.tsx`.
- Verify UI changes in a real browser with a Playwright script (Chromium is at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, package at
  `/opt/node22/lib/node_modules/playwright/index.mjs`, dev server
  `npm run dev -- --port 5173`, app served at `http://localhost:5173/FinanceTracker/`).
  Seed `localStorage` with `page.addInitScript` before navigating. Screenshot the result.
- Dates are `YYYY-MM-DD` strings compared lexically. Money is a plain `number`.

---

## 0. The money model (read first)

These definitions are what every page must agree on once the fixes are done.

| Term | Definition |
|---|---|
| **Actual entry** | A `Transaction` whose `confirmed` is not `false`. Entries logged with a future date are stored with `confirmed: false` and are **planned**, not actual. |
| **Income** | Sum of actual `income` transactions in the period. |
| **Expenses** | Sum of actual `expense` transactions in the period whose account **kind is `cash`**, or that have no account. Nothing else. |
| **Card purchases (tracked)** | Sum of actual `expense` transactions whose account kind is `card`. Shown for reference only. Never counted anywhere. The card **bill** you pay from a cash account *is* the expense (cash-basis accounting). |
| **Invested** | Expense transactions on accounts of kind `invest`, plus Investments-page deposits, minus Investments-page withdrawals. Money moved into investments. Not spending. |
| **Lent out / Repaid** | `LoanTransaction`s of type `lent` / `repaid`. Principal only. Never income, never expense. |
| **Loan interest** | An `income` transaction linked to a loan. This *is* income. |
| **Surplus** | `Income − Expenses`. What you kept. This is the only number allowed to be called savings. |
| **Cash change** | `Surplus − Invested − Lent out + Repaid`. What happened to your bank balance. |

Rule of thumb: **Surplus answers "did I live within my means"; Cash change answers "why did my
bank balance move".** Investing or lending never makes Surplus worse. Getting repaid never
makes it better.

---

## Fix 1 — One shared "what counts" helper

**Problem.** Four places compute totals with four different rules:
`src/pages/CashFlowPage.tsx` (excludes invest-tagged and toggled-off accounts),
`src/pages/DashboardPage.tsx` (excludes nothing — sums every expense),
`src/pages/ExpensesPage.tsx` (uses `isTrackingOnly` for the include-filter but the `recur`
*tag* for its "Recurring" tile), and `src/components/MonthCalendar.tsx` via Dashboard's
`totalsByDay` (excludes nothing, so daily spend limits count investment deposits as
overspending). Dashboard "Expenses" and Cash Flow "Expenses" are different numbers today.

**Change.** Create `src/lib/cashflow.ts` exporting:

```ts
import type { Account, AppData, Transaction } from '../types'

export type SpendBucket = 'expense' | 'card' | 'invest'

/** Planned (future-dated, unconfirmed) entries are not actual money movement. */
export function isActual(tx: Transaction): boolean {
  return tx.confirmed !== false
}

/** Which bucket an expense transaction lands in, by its account's kind. No account = 'expense'. */
export function bucketFor(tx: Transaction, accounts: Account[]): SpendBucket {
  if (tx.type !== 'expense' || !tx.accountId) return 'expense'
  const acc = accounts.find((a) => a.id === tx.accountId)
  if (!acc) return 'expense'
  return acc.kind === 'card' ? 'card' : acc.kind === 'invest' ? 'invest' : 'expense'
}

export function countsAsSpending(tx: Transaction, accounts: Account[]): boolean {
  return isActual(tx) && tx.type === 'expense' && bucketFor(tx, accounts) === 'expense'
}

export interface CashFlowSummary {
  income: number
  expenses: number
  cardTracked: number
  investedViaAccounts: number
  deposits: number
  withdrawals: number
  invested: number        // investedViaAccounts + deposits - withdrawals
  loansGiven: number
  loansRepaid: number
  loanInterest: number    // subset of income (transactions with loanId set)
  surplus: number         // income - expenses
  cashChange: number      // surplus - invested - loansGiven + loansRepaid
  planned: { income: number; expenses: number }  // confirmed === false, same date range
}

export function summarize(data: AppData, start: string, end: string): CashFlowSummary
```

`summarize` must contain the *only* implementation of these sums in the codebase. Move the
existing logic out of `CashFlowPage.tsx`'s `useMemo` into it. Every page below then calls
`summarize` or `bucketFor`/`countsAsSpending`. Grep for `.reduce((s, t) => s + t.amount` after
you are done; the only hits outside `cashflow.ts` should be in Investments/Loans pages that
compute portfolio or loan balances (those are not period cash-flow sums).

Note: this fix depends on `Account.kind` from **Fix 2**. Build Fix 2's data model first,
then Fix 1, then wire the pages (Fix 3). If you prefer, land Fixes 1–3 as three commits on
one branch.

**Verify.** Unit-level: seed one of each transaction type and assert `summarize` output by
hand in a Playwright `page.evaluate`, or simply assert via the UI in Fix 3. Build + lint clean.

---

## Fix 2 — Accounts get an explicit `kind`; retire tag-as-meaning and the toggle

**Problem.** Whether an account's spend counts is decided by a mix of the `invest` tag
(`hasTag(a,'invest')`) and the `excludeFromCashFlow` boolean, and routing for recurring items
by the `recur` tag. The credit-card case (purchases must not count because the bill is
logged separately) is expressed as "an account with Cash Flow switched off", which says
nothing about *why*. Anyone can flip the toggle and double count.

**Change — types (`src/types/index.ts`).**

```ts
export type AccountKind = 'cash' | 'card' | 'invest'

export interface Account {
  id: string
  name: string
  /**
   * cash   — bank/cash/wallet. Everything logged here counts as Expenses.
   * card   — credit card. Purchases are tracked for reference but never counted;
   *          the bill you pay from a cash account is the expense (cash-basis).
   * invest — brokerage/savings bridge. Money logged here counts as Invested, not spent.
   */
  kind: AccountKind
  /** Free-form labels for filtering only. They carry NO accounting meaning. */
  tags?: string[]
  archived?: boolean
  createdAt: number
}
```

Remove `excludeFromCashFlow` from the interface.

**Change — migration (`src/storage/db.ts`).** Add `migrateAccountKind(accounts)`, run after
`migrateAccountTags` and instead of `migrateRecurAccountExclusion` (delete that one):

```
if a.kind is already set → leave it
else if hasTag(a,'invest') → kind = 'invest'
else if a.excludeFromCashFlow === true → kind = 'card'
else → kind = 'cash'
then delete a.excludeFromCashFlow
```

Keep the `invest` and `recur` tags on the account (they are harmless labels now).

**Change — `src/lib/tags.ts`.** Delete `isTrackingOnly`. Keep `hasTag`,
`findFirstAccountWithTag` (still used for recurring routing until Fix 8),
`SUGGESTED_TAGS` (change to `['bank', 'recur']` — remove `'invest'` so nobody thinks the tag
still does something), and the category-derived-tag helpers.

**Change — `src/hooks/DataContext.tsx`.** `addAccount(name, kind, tags)` and
`updateAccount(id, patch: Partial<Pick<Account,'name'|'kind'|'tags'>>)`.

**Change — `src/components/AccountManager.tsx`.** Replace the "Log into Cash Flow" checkbox
(both in the add form and on each row) with a three-way segmented control
`Cash · Card · Invest`. Under each account row show one fixed explanatory line by kind:

- cash: *"Counts as Expenses."*
- card: *"Purchases here are tracked only. Log the card bill from a Cash account — that's the expense."*
- invest: *"Counts as Invested, not spent."*

**Change — everywhere `excludeFromCashFlow` or `isTrackingOnly` is referenced**
(`CashFlowPage.tsx`, `ExpensesPage.tsx`, `RecurringManageList.tsx`,
`RecurringDueChecklist.tsx`): replace with `kind` checks via `bucketFor` from Fix 1. In the
recurring "Post to" dropdown, suffix options with ` — tracked only` for card accounts and
` — counts as Invested` for invest accounts.

**Verify.** Seed storage with three legacy accounts: `{tags:['invest']}`,
`{tags:['recur'], excludeFromCashFlow:true}`, `{}`. Reload. Assert kinds are
`invest`, `card`, `cash` and the field `excludeFromCashFlow` is gone from storage. Assert an
account that already has `kind:'cash'` plus `excludeFromCashFlow:true` stays `cash`
(explicit choice wins).

---

## Fix 3 — Every page uses the shared helper

**Problem.** See Fix 1. Concretely:

| Page / component | Today | Must become |
|---|---|---|
| `DashboardPage.tsx` Monthly report tiles (Income, Expenses, Net) | sums all expense tx | `summarize(data, monthStart, monthEnd)`: Income, Expenses, **Surplus** (rename "Net" → "Surplus") |
| `DashboardPage.tsx` Expenses calendar `totalsByDay` | all expense tx | only tx where `countsAsSpending(tx, accounts)` |
| `DashboardPage.tsx` Income calendar | all income tx | only `isActual(tx)` |
| `DashboardPage.tsx` Custom report tiles | all tx | `summarize(data, customStart, customEnd)` |
| `DashboardPage.tsx` pie charts | all tx | only actual tx; expense pie only bucket `'expense'` |
| `DashboardPage.tsx` Daily spend limits (via `MonthCalendar` `limits`) | compares against all-expense day totals | compares against the counted-only day totals above |
| `ExpensesPage.tsx` "Include accounts" default | `!isTrackingOnly(acc)` | `acc.kind === 'cash'` |
| `ExpensesPage.tsx` tiles | Total / Recurring (by `recur` tag) / Investment (by `invest` tag) | **Total** (counted, respecting include-filter) / **Card purchases** (bucket `card`) / **Invested** (bucket `invest`) |
| `ExpensesPage.tsx` Breakdown | included tx | unchanged, but only actual tx |
| `CashFlowPage.tsx` | own reduce logic | `summarize` (see Fix 5 for the new layout) |
| `IncomePage.tsx` Total income | all income tx | only actual |
| `GroupedTransactions.tsx` | lists all tx | unchanged list, but mark planned rows with a muted "planned" pill |

**Verify (single seeded scenario, reuse in later fixes).**
Seed for September 2026:
- accounts: `Bank` (cash), `Amex` (card), `Broker bridge` (invest)
- income `4608.27` on 2026-09-05
- expense `46.33` no account
- expense `13.98` on Amex
- expense `500` on Broker bridge
- expense `120` dated 2026-09-28 with `confirmed:false` (planned)
- investment deposit `2500` (Investments page)
- loan: lent `0`, repaid `2000`

Expected on **every** page that shows them:
| Figure | Value |
|---|---|
| Income | 4,608.27 |
| Expenses | 46.33 |
| Card purchases (tracked) | 13.98 |
| Invested | 3,000.00 (500 + 2500) |
| Surplus | 4,561.94 |
| Cash change | 3,561.94 (4,561.94 − 3,000 + 2,000) |
| Planned expenses | 120.00 (shown separately, counted nowhere) |

Dashboard calendar: 2026-09-05 shows 46.33, not 560.31. 2026-09-28 shows nothing (or a
muted planned marker if you add one — optional).

---

## Fix 4 — Planned entries never count as actual

**Problem.** `addTransaction` stores `confirmed:false` for future-dated entries, and
`UpcomingEntries.tsx` lets you tick them, but no total anywhere checks the flag. Log next
week's rent in advance and this month's Expenses already include it.

**Change.**
- `isActual` from Fix 1 is applied in `summarize`, `bucketFor` callers, and every list total.
  (Most of this lands with Fix 3; this fix is the audit that nothing was missed.)
- `summarize().planned` is surfaced on the Cash Flow page as one muted line under the tiles:
  *"Planned, not yet counted: +$X income · −$Y expenses"*, only when either is non-zero.
- When today's date passes a planned entry's date and it is still unconfirmed, it stays
  **unconfirmed and uncounted**. Do not auto-confirm. `UpcomingEntries` already shows it for
  review; add a small red "overdue" pill on rows whose `date < todayStr()`.
- `resolveRecurringOccurrence` creates transactions dated on the occurrence date. If that date
  is in the future (the "Log now" button on a recurring item), the created transaction must
  also get `confirmed:false`. Today it does not. Fix by routing it through the same
  `date > todayStr() ? { confirmed:false } : {}` rule `addTransaction` uses.

**Verify.** With the Fix 3 seed, the 120.00 entry is absent from all totals and calendars,
appears in Upcoming expenses, and moves into Expenses the moment its checkbox is ticked.

---

## Fix 5 — Cash Flow page: Surplus is the headline; Investment and Loans are allocations

**Problem.** The hero figure is called "Savings" but is computed as
`income − expenses − investment − netLoanOut`. Putting money into a brokerage lowers it;
lending money lowers it; being repaid raises it. None of those are earning or spending.
The owner explicitly asked whether a loan repayment is "temporary income". It is not, and
the page should make that impossible to misread.

**Change — layout of `src/pages/CashFlowPage.tsx`** (top to bottom):

1. **Hero tile: `Surplus`** = `summary.surplus`. Green if ≥ 0, red if < 0. Sublabel:
   `"{pct}% of income kept"` or `"Overspent by $X"`. Use the existing `StatTile big` prop.
2. **Row of two:** `Income` (green) · `Expenses` (red, sublabel "% of income").
3. **Section "Where the surplus went"** — a stacked bar over `max(surplus, 0)`:
   - gold `Invested` = `summary.invested` (clamp at 0 for the bar; negative = net withdrawal, show as a note instead)
   - blue `Lent out` = `summary.loansGiven`
   - green `Kept as cash` = `surplus − invested − loansGiven` (clamp ≥ 0)
   If `invested + loansGiven > surplus`, the bar is 100% gold/blue and a caption says
   *"Funded $X from existing cash"*. Legend entries only render when their value > 0.
   Delete the old "Where the money went" bar entirely.
4. **Row of three small tiles:** `Invested` (gold dot) · `Lent out` (blue dot) ·
   `Repaid to you` (blue dot, green text). Each with a one-word sublabel: "allocation",
   "allocation", "inflow".
5. **Line: `Cash change`** = `summary.cashChange`, monospace, with the formula spelled out in
   the sublabel text: *"Surplus − Invested − Lent out + Repaid"*.
6. **Planned line** from Fix 4, if any.
7. **Card purchases callout** (replaces "Tracked separately"): *"Card purchases tracked:
   $X — covered by card bills you log from a Cash account, so not counted above."* Only when
   `cardTracked > 0`.
8. Keep the existing "Tip" card about investment sources, but reword "tag an account
   'invest'" → "set an account's kind to Invest".

Remove from this page: `netLoanOut`, the `pool`/`denom` overflow logic, the "Savings" label.

**Verify.** With the Fix 3 seed: Surplus 4,561.94 · Invested 3,000.00 · Lent out 0 ·
Repaid 2,000.00 · Kept as cash 1,561.94 · Cash change 3,561.94. The bar is gold ~66% / green
~34%. Overspend seed (income 1,000, expenses 1,800): Surplus −800.00 red, bar hidden,
caption "Overspent by $800.00". Screenshot both.

---

## Fix 6 — Loan interest has a place

**Problem.** `LoanTransaction.type` is only `lent | repaid`. If a repayment exceeds the
balance, the loan goes negative and the excess is treated as principal returned. There is no
way to record interest as income.

**Change — types.**
- `Transaction.loanId?: string` — set when an income transaction is interest on a loan.
- `Category.role?: 'loan-interest' | 'dividends' | 'card-bill'` — optional marker so the
  app can find/seed its built-in categories by role instead of by name. (See also Fix 7, Fix 9.)

**Change — migration.** `ensureRoleCategories(categories)`: if no category has
`role:'loan-interest'`, append `{ id, name:'Loan interest', type:'income', role:'loan-interest' }`.
Idempotent.

**Change — `DataContext`.** Add
`addLoanInterest(loanId: string, amount: number, date?: string, description?: string): void`
which calls the same code path as `addTransaction` with `type:'income'`, the
`loan-interest` role category, `loanId` set, and description defaulting to
`"Interest — {personName}"`. Loan balance is untouched.

**Change — `src/components/LoanCard.tsx`.**
- Add a third button `+ Log interest` next to `+ Log repayment` / `+ Log more loan`.
  Same inline form (amount, date, description).
- In the card's ledger, list interest entries (transactions with this `loanId`) in green with
  an "interest" pill, sorted with the loan transactions by date.
- Guard on repayment: if `amount > balance`, show an inline prompt
  *"This is $X more than they owe. Log the extra as interest?"* with **Yes** (splits into a
  `repaid` of `balance` plus interest of the excess) and **No, all principal** (current
  behavior).
- Under the balance, show *"Interest received: $X"* when > 0.

**Change — `summarize`.** `loanInterest` = sum of actual income tx with `loanId` set. It is
already inside `income`; the field exists so the Cash Flow page can add the sublabel
*"incl. $X loan interest"* to the Income tile when > 0.

**Verify.** Loan of 1,000; log repayment 1,050 → prompt appears → Yes → balance 0, interest
50 appears in the ledger, Income on Cash Flow rises by 50, Surplus rises by 50, Cash change
rises by 1,050.

---

## Fix 7 — Dividends and fees: one explicit rule

**Problem.** `investment_income` and `investment_expense` on the Investments page never reach
Cash Flow. Correct if reinvested inside the portfolio; wrong if a dividend is paid to your
bank, which is real income.

**Change.**
- Seed a built-in income category `{ name:'Dividends', type:'income', role:'dividends' }` via
  `ensureRoleCategories` (Fix 6).
- On `InvestmentAccountSection.tsx`'s "Log a transaction" form, when type is
  `investment_income`, show a checkbox **"Paid out to my bank (count as Income)"**, default
  off. When on, *also* create a normal income `Transaction` with the Dividends category and
  a new optional field `Transaction.investmentAccountId?: string`, and store on the
  `InvestmentTransaction` a new optional `paidOut?: true` so the two stay linked. Deleting
  either side deletes the other (implement in `removeInvestmentTransaction` /
  `removeTransaction`).
- Same for `investment_expense` with **"Paid from my bank (count as Expense)"** → creates an
  expense `Transaction`, category `Investment fees` (seed it, role `'invest-fees'`, type
  `expense`), no account (so it counts).
- One sentence on the Investments page under the Overview tiles: *"Dividends and fees stay
  inside the portfolio unless you tick 'paid out / paid from my bank' when logging them."*

**Verify.** Log a 100 dividend with the box ticked → Income on Cash Flow +100; delete the
investment transaction → the income transaction disappears too, and vice versa.

---

## Fix 8 — Default accounts for quick log and for recurring items

**Problem.** `ChatLogger.tsx` and `TransactionForm.tsx` default `accountId` to `''`
(Unassigned), and Unassigned always counts as Expenses. A card purchase quick-logged without
picking the card account double counts with the bill. Recurring routing depends on a magic
`recur` tag lookup (`findFirstAccountWithTag`).

**Change — settings (`AppSettings`).**
```ts
defaultExpenseAccountId?: string     // preselected in ChatLogger and TransactionForm
defaultRecurringAccountId?: string   // used when RecurringExpense.accountId is unset
```

**Change — `SettingsPage.tsx`.** Two dropdowns listing active accounts, labelled
*"Default account for quick log"* and *"Default account for recurring expenses"*, each with
an "Unassigned" option.

**Change — loggers.** `ChatLogger` and `TransactionForm` initialise `accountId` from
`settings.defaultExpenseAccountId` (if that account still exists and is not archived).

**Change — recurring routing.** In `resolveRecurringOccurrence`,
`targetAccountId = item.accountId ?? settings.defaultRecurringAccountId`. Delete
`findFirstAccountWithTag` and every `'recur'` lookup. `RecurringDueChecklist`'s "No account is
tagged recur" notice becomes *"No default account set for recurring expenses — set one in
Settings, or pick one per item."* `RecurringManageList`'s "Auto" option label becomes
`Default ({name})` or `Default (Unassigned)`.

**Migration.** If `settings.defaultRecurringAccountId` is undefined and exactly one active
account has the `recur` tag, set it to that account's id. Leave the tag in place.

**Verify.** Set default quick-log account to Amex; quick-log "coffee 5" → transaction has
Amex's id and Cash Flow Expenses do not change; Card purchases tracked rises by 5.

---

## Fix 9 — Make the card-bill convention visible (low priority)

**Problem.** The whole credit-card model rests on "log the bill from a Cash account". Nothing
in the UI says so, and the Expenses breakdown cannot tell a bill from any other expense.

**Change.**
- Seed expense category `{ name:'Credit card bill', type:'expense', role:'card-bill' }`.
- `ExpensesPage.tsx` Summary: under the Total tile, sublabel *"incl. $X card bills"* when
  any counted expense uses a `card-bill` category.
- Cash Flow card-purchases callout (Fix 5 item 7) additionally shows
  *"Card bills paid this period: $Y"* so the owner can eyeball tracked purchases vs. bills.
- `AccountManager` card-kind explanatory line links the words "card bill" to this category
  by name.

**Verify.** Log a 300 expense with the Credit card bill category from Bank → Expenses Total
shows 346.33 with sublabel "incl. $300.00 card bills"; Cash Flow callout shows both figures.

---

## Fix 10 — Leftover cleanup after Fixes 1–9

Do these in the same branch as the last fix that touches each file.

- Delete `migrateRecurAccountExclusion`, `isTrackingOnly`, `findFirstAccountWithTag`,
  `TRACKING_TAGS` (if any remain), and every `hasTag(a, 'invest')` / `hasTag(a, 'recur')`
  used for *logic* (filtering chips on the Expenses page may keep using tags — that is
  display, not accounting).
- `src/types/index.ts` doc comments on `Account`, `RecurringExpense.accountId`, and
  `Transaction.confirmed` must describe the final behaviour, not the history.
- README: add a short "How the numbers work" section that is a copy of section 0 above.
- Grep for the strings `Savings`, `Tracked separately`, `Log into Cash Flow`,
  `excludeFromCashFlow`, `tagged "recur"`, `tag an account "invest"` — none should remain.

---

## Order of work and dependency graph

```
Fix 2 (Account.kind + migration)  ──►  Fix 1 (cashflow.ts)  ──►  Fix 3 (wire pages)
                                                                   │
                                          Fix 4 (planned) ◄────────┘
                                                                   │
                                          Fix 5 (Cash Flow layout) ◄┘
Fix 6 (loan interest)      — needs Fix 1 (summarize.loanInterest), Fix 5 (Income sublabel)
Fix 7 (dividends/fees)     — needs Fix 6 (Category.role, ensureRoleCategories)
Fix 8 (default accounts)   — needs Fix 2
Fix 9 (card-bill category) — needs Fix 6 (Category.role), Fix 5 (callout)
Fix 10 (cleanup)           — last
```

Recommended branches: `claude/fm-1-account-kind-and-helper` (Fixes 2 + 1 + 3 + 4),
`claude/fm-2-cashflow-layout` (Fix 5), `claude/fm-3-loan-interest` (Fix 6),
`claude/fm-4-dividends` (Fix 7), `claude/fm-5-default-accounts` (Fix 8),
`claude/fm-6-card-bill` (Fix 9 + 10).

## Definition of done for the whole programme

1. The Fix 3 seed produces identical Income / Expenses / Invested / Surplus figures on
   Dashboard, Expenses, Income, and Cash Flow.
2. No page ever shows a number labelled "Savings".
3. Lending money, being repaid, and investing never change Surplus.
4. A future-dated entry never changes any total until it is confirmed.
5. Every account has a `kind`; no `excludeFromCashFlow` field exists in storage.
6. Build and lint are clean; every fix has a Playwright screenshot in its commit message
   description or PR.
