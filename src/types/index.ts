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

export interface FixedItem {
  id: string
  name: string
  amount: number
  categoryId: string
  type: EntryType
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

export interface AppSettings {
  weekdayExpenseLimit?: number
  weekendExpenseLimit?: number
}

export interface AppData {
  categories: Category[]
  keywords: Keyword[]
  fixedItems: FixedItem[]
  recurringExpenses: RecurringExpense[]
  transactions: Transaction[]
  investmentAccounts: InvestmentAccount[]
  investmentTransactions: InvestmentTransaction[]
  settings: AppSettings
}
