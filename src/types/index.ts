export type EntryType = 'expense' | 'income'
export type InvestmentEntryType = 'investment_income' | 'investment_expense' | 'deposit' | 'withdrawal'

export interface Category {
  id: string
  name: string
  type: EntryType
  /** Hidden categories no longer appear as pickable options, but past entries keep referencing them by id/name. */
  archived?: boolean
}

export interface Keyword {
  id: string
  keyword: string
  categoryId: string
  type: EntryType
}

/**
 * A cash-flow account (checking, credit card, cash, ...) that expenses are logged against.
 * Income is tracked by category instead, not by account.
 */
export interface Account {
  id: string
  name: string
  /**
   * Free-form, user-extensible labels (e.g. "bank", "recur", "invest") used to filter the Expenses
   * summary and, for "recur", to identify the default account recurring items auto-post to (see
   * RecurringExpense.accountId). "invest" carries built-in meaning — see lib/tags.ts — accounts
   * tagged "invest" count toward the Investment bucket on Cash Flow instead of Expenses.
   */
  tags?: string[]
  /**
   * Explicit, visible switch: when true, money logged to this account doesn't count toward the
   * Expenses total or Cash Flow's Savings figure — it's tracked separately instead. Off (the
   * default) for a normal account. This is independent of tags/routing, so a "recur" account can
   * still count normally if you want a particular recurring item's spend to hit Cash Flow.
   */
  excludeFromCashFlow?: boolean
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
   * Expense-type only. Which account confirmed occurrences post to. Unset (the default) auto-routes
   * to the first account tagged "recur". Whether that counts toward Cash Flow depends entirely on
   * that account's own excludeFromCashFlow switch — pick a different account here (or flip that
   * switch) to have a specific item's spend count normally while still showing on this checklist.
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
  /** Only set when logged with a future date in advance; false until the user reviews/confirms it. */
  confirmed?: boolean
  /** Expense-type only. Absent means "Unassigned" — shown in its own bucket until reassigned. */
  accountId?: string
  /** Set when this transaction was created by confirming a recurring occurrence as incurred. */
  recurringExpenseId?: string
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
