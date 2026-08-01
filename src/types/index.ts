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

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  description: string
  categoryId: string
  categoryName: string // snapshotted at creation time so removing a category doesn't break history
  amount: number
  type: EntryType
  createdAt: number
}

export interface InvestmentAccount {
  id: string
  name: string
  createdAt: number
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

export interface AppData {
  categories: Category[]
  keywords: Keyword[]
  fixedItems: FixedItem[]
  transactions: Transaction[]
  investmentAccounts: InvestmentAccount[]
  investmentTransactions: InvestmentTransaction[]
}
