export type EntryType = 'expense' | 'income'
export type InvestmentEntryType = 'investment_income' | 'investment_expense' | 'deposit' | 'withdrawal'

/** Marks a category the app itself creates and looks up by purpose rather than by name. */
export type CategoryRole = 'loan-interest' | 'dividends' | 'invest-fees' | 'card-bill'

export interface Category {
  id: string
  name: string
  type: EntryType
  /** Set on built-in categories so the app can find them after a rename. */
  role?: CategoryRole
  /** Hidden categories no longer appear as pickable options, but past entries keep referencing them by id/name. */
  archived?: boolean
}

export interface Keyword {
  id: string
  keyword: string
  categoryId: string
  type: EntryType
}

/** What an account is, which decides how money logged against it is counted. */
export type AccountKind = 'cash' | 'card' | 'invest'

/**
 * A cash-flow account (checking, credit card, cash, ...) that expenses are logged against.
 * Income is tracked by category instead, not by account.
 */
export interface Account {
  id: string
  name: string
  /**
   * Decides how spend logged here is counted — see lib/cashflow.ts, the only place that reads it.
   * cash   — bank/cash/wallet. Everything logged here counts as Expenses.
   * card   — credit card. Purchases are tracked for reference but never counted; the card bill you
   *          pay from a cash account is the expense (cash-basis accounting, no double counting).
   * invest — brokerage/savings bridge. Money logged here counts as Invested, not spent.
   */
  kind: AccountKind
  /** Free-form labels for filtering the Expenses summary. They carry NO accounting meaning. */
  tags?: string[]
  /** Hidden accounts no longer appear as pickable options, but past entries keep referencing them by id/name. */
  archived?: boolean
  createdAt: number
}

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringExpense {
  id: string
  name: string
  amount: number
  categoryId: string
  type: EntryType
  frequency: RecurrenceFrequency
  /** Occurs every N frequency units, e.g. interval 2 + frequency 'monthly' = every 2 months. */
  interval: number
  /** First occurrence date, YYYY-MM-DD — also the anchor for the day-of-week/month/year. */
  startDate: string
  /** Date (YYYY-MM-DD) of the most recently resolved occurrence (logged or skipped). Unset until the first one is resolved. */
  lastResolvedDate?: string
  /** Paused items are excluded from the due checklist but keep their schedule for when resumed. */
  paused?: boolean
  /** Free-form labels (e.g. "insurance") used to pull a subset of recurring items into their own dedicated checklist. */
  tags?: string[]
  /**
   * Expense-type only. Which account confirmed occurrences post to. Unset (the default) routes to
   * the first account tagged "recur". How that spend is counted depends entirely on the destination
   * account's kind — post to a cash account for it to count as an Expense, or to a card account to
   * have it tracked only, while either way it stays on the recurring checklist.
   */
  accountId?: string
}

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  description: string
  categoryId: string
  categoryName: string // snapshotted at creation time so removing a category doesn't break history
  amount: number
  type: EntryType
  createdAt: number
  /**
   * Only set when logged with a future date in advance; false until the user reviews/confirms it.
   * A transaction with confirmed === false is "planned" and is counted by nothing — see
   * isActual() in lib/cashflow.ts. Absent (the normal case) means actual.
   */
  confirmed?: boolean
  /** Expense-type only. Absent means "Unassigned" — shown in its own bucket until reassigned. */
  accountId?: string
  /** Set when this transaction was created by confirming a recurring occurrence as incurred. */
  recurringExpenseId?: string
  /**
   * Income-type only. Set when this is interest earned on money lent out, linking it to that loan.
   * Loan principal coming back is never a transaction — only interest is real income.
   */
  loanId?: string
}

export interface InvestmentAccount {
  id: string
  name: string
  createdAt: number
  /** User-entered current market value of the whole portfolio; drives auto gain/loss vs invested. */
  currentValue?: number
}

export interface InvestmentTransaction {
  id: string
  accountId: string
  date: string // YYYY-MM-DD
  description: string
  category: string
  amount: number
  type: InvestmentEntryType
  createdAt: number
}

/** Money lent to a specific person — created "like an account", one per person. */
export interface Loan {
  id: string
  personName: string
  createdAt: number
  /** Fully settled/no-longer-tracked loans are hidden but keep their history. */
  archived?: boolean
}

export type LoanEntryType = 'lent' | 'repaid'

export interface LoanTransaction {
  id: string
  loanId: string
  date: string // YYYY-MM-DD
  type: LoanEntryType
  amount: number
  description?: string
  createdAt: number
}

/** One row of the bottom nav's arrange/hide configuration — order in the array is display order. */
export interface NavConfigEntry {
  key: string
  hidden?: boolean
}

export interface AppSettings {
  weekdayExpenseLimit?: number
  weekendExpenseLimit?: number
  navConfig?: NavConfigEntry[]
}

export interface AppData {
  categories: Category[]
  keywords: Keyword[]
  accounts: Account[]
  recurringExpenses: RecurringExpense[]
  transactions: Transaction[]
  investmentAccounts: InvestmentAccount[]
  investmentTransactions: InvestmentTransaction[]
  loans: Loan[]
  loanTransactions: LoanTransaction[]
  settings: AppSettings
}
