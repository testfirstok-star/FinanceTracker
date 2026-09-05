import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Account,
  AppData,
  AppSettings,
  Category,
  EntryType,
  InvestmentAccount,
  InvestmentEntryType,
  InvestmentTransaction,
  Keyword,
  Loan,
  LoanEntryType,
  LoanTransaction,
  RecurrenceFrequency,
  RecurringExpense,
  Transaction,
} from '../types'
import { loadData, newId, saveData } from '../storage/db'
import { todayStr } from '../lib/format'
import { findFirstAccountWithTag } from '../lib/tags'

interface DataContextValue {
  data: AppData
  replaceData: (next: AppData) => void
  updateSettings: (patch: Partial<AppSettings>) => void

  // categories
  addCategory: (name: string, type: EntryType) => Category
  renameCategory: (id: string, name: string) => void
  archiveCategory: (id: string) => void
  restoreCategory: (id: string) => void
  activeCategories: (type: EntryType) => Category[]

  // keywords
  addKeyword: (keyword: string, categoryId: string, type: EntryType) => void
  updateKeyword: (id: string, keyword: string, categoryId: string) => void
  removeKeyword: (id: string) => void

  // accounts (expense cash-flow accounts — income is tracked by category instead)
  addAccount: (name: string, tags: string[], excludeFromCashFlow?: boolean) => Account
  updateAccount: (id: string, patch: Partial<Pick<Account, 'name' | 'tags' | 'excludeFromCashFlow'>>) => void
  archiveAccount: (id: string) => void
  restoreAccount: (id: string) => void
  activeAccounts: () => Account[]

  // recurring expenses
  addRecurringExpense: (input: {
    name: string
    amount: number
    categoryId: string
    type: EntryType
    frequency: RecurrenceFrequency
    interval: number
    startDate: string
    tags?: string[]
    accountId?: string
  }) => void
  updateRecurringExpense: (
    id: string,
    patch: Partial<Pick<RecurringExpense, 'name' | 'amount' | 'categoryId' | 'frequency' | 'interval' | 'startDate' | 'tags' | 'accountId'>>,
  ) => void
  removeRecurringExpense: (id: string) => void
  toggleRecurringExpensePaused: (id: string) => void
  /** Resolves one due occurrence: when logged is true it's added to the transaction log, either way the occurrence is marked resolved. */
  resolveRecurringOccurrence: (id: string, occurrenceDate: string, logged: boolean, amount?: number) => void

  // transactions
  addTransaction: (input: {
    description: string
    categoryId: string
    amount: number
    type: EntryType
    date?: string
    accountId?: string
  }) => Transaction
  updateTransaction: (
    id: string,
    patch: Partial<Pick<Transaction, 'date' | 'description' | 'categoryId' | 'categoryName' | 'amount' | 'confirmed' | 'accountId'>>,
  ) => void
  removeTransaction: (id: string) => void

  // investments
  addInvestmentAccount: (name: string) => InvestmentAccount
  removeInvestmentAccount: (id: string) => void
  updateInvestmentAccountValue: (id: string, currentValue: number | undefined) => void
  addInvestmentTransaction: (input: { accountId: string; description: string; category: string; amount: number; type: InvestmentEntryType; date?: string }) => void
  updateInvestmentTransaction: (id: string, patch: Partial<Pick<InvestmentTransaction, 'date' | 'description' | 'category' | 'amount' | 'type'>>) => void
  removeInvestmentTransaction: (id: string) => void

  // loans — money lent to a person, kept separate from Income/Expenses
  addLoan: (personName: string, initialAmount: number, date?: string) => Loan
  renameLoan: (id: string, personName: string) => void
  archiveLoan: (id: string) => void
  restoreLoan: (id: string) => void
  addLoanTransaction: (input: { loanId: string; type: LoanEntryType; amount: number; date?: string; description?: string }) => void
  updateLoanTransaction: (id: string, patch: Partial<Pick<LoanTransaction, 'date' | 'amount' | 'description'>>) => void
  removeLoanTransaction: (id: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const value = useMemo<DataContextValue>(() => {
    return {
      data,
      replaceData: (next) => {
        setData({
          categories: next.categories ?? [],
          keywords: next.keywords ?? [],
          accounts: next.accounts ?? [],
          recurringExpenses: next.recurringExpenses ?? [],
          transactions: next.transactions ?? [],
          investmentAccounts: next.investmentAccounts ?? [],
          investmentTransactions: next.investmentTransactions ?? [],
          loans: next.loans ?? [],
          loanTransactions: next.loanTransactions ?? [],
          settings: next.settings ?? {},
        })
      },
      updateSettings: (patch) => {
        setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
      },

      addCategory: (name, type) => {
        const cat: Category = { id: newId(), name: name.trim(), type }
        setData((d) => ({ ...d, categories: [...d.categories, cat] }))
        return cat
      },
      renameCategory: (id, name) => {
        setData((d) => ({
          ...d,
          categories: d.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
        }))
      },
      archiveCategory: (id) => {
        setData((d) => ({
          ...d,
          categories: d.categories.map((c) => (c.id === id ? { ...c, archived: true } : c)),
        }))
      },
      restoreCategory: (id) => {
        setData((d) => ({
          ...d,
          categories: d.categories.map((c) => (c.id === id ? { ...c, archived: false } : c)),
        }))
      },
      activeCategories: (type) => data.categories.filter((c) => c.type === type && !c.archived),

      addKeyword: (keyword, categoryId, type) => {
        const kw: Keyword = { id: newId(), keyword: keyword.trim().toLowerCase(), categoryId, type }
        setData((d) => ({ ...d, keywords: [...d.keywords, kw] }))
      },
      updateKeyword: (id, keyword, categoryId) => {
        setData((d) => ({
          ...d,
          keywords: d.keywords.map((k) => (k.id === id ? { ...k, keyword: keyword.trim().toLowerCase(), categoryId } : k)),
        }))
      },
      removeKeyword: (id) => {
        setData((d) => ({ ...d, keywords: d.keywords.filter((k) => k.id !== id) }))
      },

      addAccount: (name, tags, excludeFromCashFlow) => {
        const acc: Account = {
          id: newId(),
          name: name.trim(),
          tags: tags.length ? tags : undefined,
          excludeFromCashFlow: excludeFromCashFlow || undefined,
          createdAt: Date.now(),
        }
        setData((d) => ({ ...d, accounts: [...d.accounts, acc] }))
        return acc
      },
      updateAccount: (id, patch) => {
        setData((d) => ({
          ...d,
          accounts: d.accounts.map((a) =>
            a.id === id ? { ...a, ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) } : a,
          ),
        }))
      },
      archiveAccount: (id) => {
        setData((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, archived: true } : a)) }))
      },
      restoreAccount: (id) => {
        setData((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, archived: false } : a)) }))
      },
      activeAccounts: () => data.accounts.filter((a) => !a.archived),

      addRecurringExpense: ({ name, amount, categoryId, type, frequency, interval, startDate, tags, accountId }) => {
        const item: RecurringExpense = {
          id: newId(),
          name: name.trim(),
          amount,
          categoryId,
          type,
          frequency,
          interval: Math.max(1, Math.round(interval) || 1),
          startDate,
          tags: tags && tags.length ? tags : undefined,
          accountId,
        }
        setData((d) => ({ ...d, recurringExpenses: [...d.recurringExpenses, item] }))
      },
      updateRecurringExpense: (id, patch) => {
        setData((d) => ({
          ...d,
          recurringExpenses: d.recurringExpenses.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
                  ...(patch.interval !== undefined ? { interval: Math.max(1, Math.round(patch.interval) || 1) } : {}),
                }
              : r,
          ),
        }))
      },
      removeRecurringExpense: (id) => {
        setData((d) => ({ ...d, recurringExpenses: d.recurringExpenses.filter((r) => r.id !== id) }))
      },
      toggleRecurringExpensePaused: (id) => {
        setData((d) => ({
          ...d,
          recurringExpenses: d.recurringExpenses.map((r) => (r.id === id ? { ...r, paused: !r.paused } : r)),
        }))
      },
      resolveRecurringOccurrence: (id, occurrenceDate, logged, amount) => {
        const item = data.recurringExpenses.find((r) => r.id === id)
        if (!item) return
        if (!logged) {
          setData((d) => ({
            ...d,
            recurringExpenses: d.recurringExpenses.map((r) => (r.id === id ? { ...r, lastResolvedDate: occurrenceDate } : r)),
          }))
          return
        }
        const category = data.categories.find((c) => c.id === item.categoryId)
        // An item's own accountId wins if set; otherwise it auto-routes to the "recur"-tagged
        // account. Whether that account's spend counts toward Cash Flow is entirely up to the
        // account's own excludeFromCashFlow switch, not anything decided here.
        const targetAccountId =
          item.type === 'expense' ? (item.accountId ?? findFirstAccountWithTag(data.accounts, 'recur')?.id) : undefined
        const tx: Transaction = {
          id: newId(),
          date: occurrenceDate,
          description: item.name,
          categoryId: item.categoryId,
          categoryName: category?.name ?? 'Uncategorized',
          amount: amount ?? item.amount,
          type: item.type,
          createdAt: Date.now(),
          accountId: targetAccountId,
          recurringExpenseId: item.id,
        }
        setData((d) => ({
          ...d,
          transactions: [tx, ...d.transactions],
          recurringExpenses: d.recurringExpenses.map((r) => (r.id === id ? { ...r, lastResolvedDate: occurrenceDate } : r)),
        }))
      },

      addTransaction: (input) => {
        const category = data.categories.find((c) => c.id === input.categoryId)
        const date = input.date ?? todayStr()
        const tx: Transaction = {
          id: newId(),
          date,
          description: input.description.trim(),
          categoryId: input.categoryId,
          categoryName: category?.name ?? 'Uncategorized',
          amount: input.amount,
          type: input.type,
          createdAt: Date.now(),
          accountId: input.accountId,
          ...(date > todayStr() ? { confirmed: false } : {}),
        }
        setData((d) => ({ ...d, transactions: [tx, ...d.transactions] }))
        return tx
      },
      updateTransaction: (id, patch) => {
        setData((d) => ({
          ...d,
          transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
      },
      removeTransaction: (id) => {
        setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }))
      },

      addInvestmentAccount: (name) => {
        const acc: InvestmentAccount = { id: newId(), name: name.trim(), createdAt: Date.now() }
        setData((d) => ({ ...d, investmentAccounts: [...d.investmentAccounts, acc] }))
        return acc
      },
      removeInvestmentAccount: (id) => {
        setData((d) => ({
          ...d,
          investmentAccounts: d.investmentAccounts.filter((a) => a.id !== id),
          investmentTransactions: d.investmentTransactions.filter((t) => t.accountId !== id),
        }))
      },
      updateInvestmentAccountValue: (id, currentValue) => {
        setData((d) => ({
          ...d,
          investmentAccounts: d.investmentAccounts.map((a) => (a.id === id ? { ...a, currentValue } : a)),
        }))
      },
      addInvestmentTransaction: (input) => {
        const tx: InvestmentTransaction = {
          id: newId(),
          accountId: input.accountId,
          date: input.date ?? todayStr(),
          description: input.description.trim(),
          category: input.category.trim(),
          amount: input.amount,
          type: input.type,
          createdAt: Date.now(),
        }
        setData((d) => ({ ...d, investmentTransactions: [tx, ...d.investmentTransactions] }))
      },
      updateInvestmentTransaction: (id, patch) => {
        setData((d) => ({
          ...d,
          investmentTransactions: d.investmentTransactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
      },
      removeInvestmentTransaction: (id) => {
        setData((d) => ({ ...d, investmentTransactions: d.investmentTransactions.filter((t) => t.id !== id) }))
      },

      addLoan: (personName, initialAmount, date) => {
        const loan: Loan = { id: newId(), personName: personName.trim(), createdAt: Date.now() }
        const tx: LoanTransaction = {
          id: newId(),
          loanId: loan.id,
          date: date ?? todayStr(),
          type: 'lent',
          amount: initialAmount,
          createdAt: Date.now(),
        }
        setData((d) => ({ ...d, loans: [...d.loans, loan], loanTransactions: [tx, ...d.loanTransactions] }))
        return loan
      },
      renameLoan: (id, personName) => {
        setData((d) => ({ ...d, loans: d.loans.map((l) => (l.id === id ? { ...l, personName: personName.trim() } : l)) }))
      },
      archiveLoan: (id) => {
        setData((d) => ({ ...d, loans: d.loans.map((l) => (l.id === id ? { ...l, archived: true } : l)) }))
      },
      restoreLoan: (id) => {
        setData((d) => ({ ...d, loans: d.loans.map((l) => (l.id === id ? { ...l, archived: false } : l)) }))
      },
      addLoanTransaction: (input) => {
        const tx: LoanTransaction = {
          id: newId(),
          loanId: input.loanId,
          date: input.date ?? todayStr(),
          type: input.type,
          amount: input.amount,
          description: input.description?.trim() || undefined,
          createdAt: Date.now(),
        }
        setData((d) => ({ ...d, loanTransactions: [tx, ...d.loanTransactions] }))
      },
      updateLoanTransaction: (id, patch) => {
        setData((d) => ({
          ...d,
          loanTransactions: d.loanTransactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
      },
      removeLoanTransaction: (id) => {
        setData((d) => ({ ...d, loanTransactions: d.loanTransactions.filter((t) => t.id !== id) }))
      },
    }
  }, [data])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
