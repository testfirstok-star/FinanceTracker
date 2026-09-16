import type { Account, AccountKind, AppData, Transaction } from '../types'

/**
 * THE one place that decides how money is counted. Every page reads its figures from here so the
 * Dashboard, Expenses, Income and Cash Flow pages can never disagree about what an expense is.
 *
 * The model, in one table:
 *   Income        actual income transactions
 *   Expenses      actual expense transactions on a cash account, or on no account at all
 *   Card tracked  actual expense transactions on a card account — reference only, counted nowhere
 *                 (the card bill you pay from a cash account is the expense)
 *   Invested      expense transactions on an invest account, plus portfolio deposits less withdrawals
 *   Lent / Repaid loan principal moving out and back — never income, never expense
 *   Surplus       Income - Expenses. What you kept. The only figure that may be called savings.
 *   Cash change   Surplus - Invested - Lent out + Repaid. Why your bank balance moved.
 *
 * Investing or lending never lowers Surplus; being repaid never raises it.
 */

/** Where an expense lands: counted as spending, tracked only, or treated as money invested. */
export type SpendBucket = 'expense' | 'card' | 'invest'

/** Planned (future-dated, still unconfirmed) entries are not actual money movement. */
export function isActual(tx: Transaction): boolean {
  return tx.confirmed !== false
}

/** True for a future-dated entry the user hasn't confirmed yet. */
export function isPlanned(tx: Transaction): boolean {
  return tx.confirmed === false
}

/** Which bucket an expense transaction lands in, by its account's kind. No account = counts as spending. */
export function bucketFor(tx: Transaction, accounts: Account[]): SpendBucket {
  if (tx.type !== 'expense' || !tx.accountId) return 'expense'
  const acc = accounts.find((a) => a.id === tx.accountId)
  if (!acc) return 'expense'
  return acc.kind === 'card' ? 'card' : acc.kind === 'invest' ? 'invest' : 'expense'
}

/** True only for actual expenses that belong in the Expenses total. */
export function countsAsSpending(tx: Transaction, accounts: Account[]): boolean {
  return isActual(tx) && tx.type === 'expense' && bucketFor(tx, accounts) === 'expense'
}

export interface CashFlowSummary {
  income: number
  expenses: number
  /** Card purchases in the period — shown for reference, counted nowhere. */
  cardTracked: number
  /** The slice of Expenses that is card bills being paid off — the counted side of card spending. */
  cardBillsPaid: number
  investedViaAccounts: number
  deposits: number
  withdrawals: number
  /** investedViaAccounts + deposits - withdrawals */
  invested: number
  loansGiven: number
  loansRepaid: number
  /** Subset of income: interest on money lent out. Real income, unlike the principal coming back. */
  loanInterest: number
  /** income - expenses */
  surplus: number
  /** surplus - invested - loansGiven + loansRepaid */
  cashChange: number
  /** Future-dated entries awaiting confirmation. Counted by nothing above. */
  planned: { income: number; expenses: number }
}

const sum = (rows: Array<{ amount: number }>) => rows.reduce((s, r) => s + r.amount, 0)

/** Every period figure the app shows, for one inclusive date range. */
export function summarize(data: AppData, start: string, end: string): CashFlowSummary {
  const inRange = data.transactions.filter((t) => t.date >= start && t.date <= end)
  const actual = inRange.filter(isActual)

  const income = sum(actual.filter((t) => t.type === 'income'))
  const loanInterest = sum(actual.filter((t) => t.type === 'income' && t.loanId))

  const expenseTx = actual.filter((t) => t.type === 'expense')
  const expenses = sum(expenseTx.filter((t) => bucketFor(t, data.accounts) === 'expense'))
  const cardTracked = sum(expenseTx.filter((t) => bucketFor(t, data.accounts) === 'card'))
  const cardBillCategoryId = data.categories.find((c) => c.role === 'card-bill')?.id
  const cardBillsPaid = cardBillCategoryId
    ? sum(expenseTx.filter((t) => t.categoryId === cardBillCategoryId && bucketFor(t, data.accounts) === 'expense'))
    : 0
  const investedViaAccounts = sum(expenseTx.filter((t) => bucketFor(t, data.accounts) === 'invest'))

  // Deposits and withdrawals logged on the Investments page are real money crossing between your
  // everyday cash and your portfolio, so they belong here too. Dividends and fees stay inside the
  // portfolio unless the user explicitly logged them as paid out to / from the bank.
  const investTx = data.investmentTransactions.filter((t) => t.date >= start && t.date <= end)
  const deposits = sum(investTx.filter((t) => t.type === 'deposit'))
  const withdrawals = sum(investTx.filter((t) => t.type === 'withdrawal'))
  const invested = investedViaAccounts + deposits - withdrawals

  const loanTx = data.loanTransactions.filter((t) => t.date >= start && t.date <= end)
  const loansGiven = sum(loanTx.filter((t) => t.type === 'lent'))
  const loansRepaid = sum(loanTx.filter((t) => t.type === 'repaid'))

  const plannedTx = inRange.filter(isPlanned)

  const surplus = income - expenses
  return {
    income,
    expenses,
    cardTracked,
    cardBillsPaid,
    investedViaAccounts,
    deposits,
    withdrawals,
    invested,
    loansGiven,
    loansRepaid,
    loanInterest,
    surplus,
    cashChange: surplus - invested - loansGiven + loansRepaid,
    planned: {
      income: sum(plannedTx.filter((t) => t.type === 'income')),
      expenses: sum(plannedTx.filter((t) => t.type === 'expense')),
    },
  }
}

/**
 * Actual expense totals for one period, split by bucket. The Expenses page shows these next to its
 * own include/exclude-aware total, which is the one figure summarize() can't express.
 */
export function expenseBucketTotals(data: AppData, start: string, end: string): Record<SpendBucket, number> {
  const rows = data.transactions.filter((t) => t.type === 'expense' && isActual(t) && t.date >= start && t.date <= end)
  return {
    expense: sum(rows.filter((t) => bucketFor(t, data.accounts) === 'expense')),
    card: sum(rows.filter((t) => bucketFor(t, data.accounts) === 'card')),
    invest: sum(rows.filter((t) => bucketFor(t, data.accounts) === 'invest')),
  }
}

/** Per-day totals of what actually counts as spending — for the Dashboard calendar and spend limits. */
export function spendingByDay(data: AppData, filter: (tx: Transaction) => boolean = () => true): Record<string, number> {
  const map: Record<string, number> = {}
  for (const t of data.transactions) {
    if (!countsAsSpending(t, data.accounts) || !filter(t)) continue
    map[t.date] = (map[t.date] ?? 0) + t.amount
  }
  return map
}

/** One-line description of how an account's spend is treated, shown wherever an account is picked. */
export function accountKindNote(kind: AccountKind, cardBillCategoryName = 'Credit card bill'): string {
  return kind === 'card'
    ? `Purchases here are tracked only. Log the bill from a Cash account under "${cardBillCategoryName}" — that's the expense.`
    : kind === 'invest'
      ? 'Counts as Invested, not spent.'
      : 'Counts as Expenses.'
}

/** Short suffix for an account name in a dropdown, so the consequence of picking it is visible. */
export function accountKindSuffix(kind: AccountKind): string {
  return kind === 'card' ? ' — tracked only' : kind === 'invest' ? ' — counts as Invested' : ''
}
