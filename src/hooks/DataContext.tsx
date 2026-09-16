import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Account,
  AccountKind,
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
  addAccount: (name: string, kind: AccountKind, tags: string[]) => Account
  updateAccount: (id: string, patch: Partial<Pick<Account, 'name' | 'kind' | 'tags'>>) => void
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
  /**
   * paidOut marks a dividend that actually landed in the bank, or a fee actually paid from it. That
   * side is real Income/Expenses, so a matching Transaction is created and linked to this one.
   */
  addInvestmentTransaction: (input: {
    accountId: string
    description: string
    category: string
    amount: number
    type: InvestmentEntryType
    date?: string
    paidOut?: boolean
  }) => void
  updateInvestmentTransaction: (id: string, patch: Partial<Pick<InvestmentTransaction, 'date' | 'description' | 'category' | 'amount' | 'type'>>) => void
  removeInvestmentTransaction: (id: string) => void

  // loans — money lent to a person, kept separate from Income/Expenses
  addLoan: (personName: string, initialAmount: number, date?: string) => Loan
  renameLoan: (id: string, personName: string) => void
  archiveLoan: (id: string) => void
  restoreLoan: (id: string) => void
  addLoanTransaction: (input: { loanId: string; type: LoanEntryType; amount: number; date?: string; description?: string }) => void
  /**
   * Interest earned on money lent out. Unlike the principal coming back, this IS income, so it
   * lands in the transaction log as an income entry linked to the loan. The loan balance, which
   * tracks principal only, is deliberately untouched.
   */
  addLoanInterest: (input: { loanId: string; amount: number; date?: string; description?: string }) => void
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

      addAccount: (name, kind, tags) => {
        const acc: Account = {
          id: newId(),
          name: name.trim(),
          kind,
          tags: tags.length ? tags : undefined,
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
        // account. How that spend is counted is decided by the destination account's kind — see
        // lib/cashflow.ts — not by anything here.
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
          // Logging an occurrence ahead of its date makes it planned, exactly like any other
          // future-dated entry — it stays out of every total until the user confirms it.
          ...(occurrenceDate > todayStr() ? { confirmed: false } : {}),
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
        setData((d) => {
          const linked = d.transactions.find((t) => t.id === id)?.investmentTransactionId
          return {
            ...d,
            transactions: d.transactions.filter((t) => t.id !== id),
            // The portfolio entry and its bank-side entry are two views of one event: drop both.
            investmentTransactions: linked ? d.investmentTransactions.filter((t) => t.id !== linked) : d.investmentTransactions,
          }
        })
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
        const when = input.date ?? todayStr()
        const tx: InvestmentTransaction = {
          id: newId(),
          accountId: input.accountId,
          date: when,
          description: input.description.trim(),
          category: input.category.trim(),
          amount: input.amount,
          type: input.type,
          createdAt: Date.now(),
          paidOut: input.paidOut || undefined,
        }
        // Money that crossed between the portfolio and the bank is real income or real spending, so
        // it gets a normal transaction too. Anything reinvested stays portfolio-internal.
        const crossesToBank = input.paidOut && (input.type === 'investment_income' || input.type === 'investment_expense')
        const isIncomeSide = input.type === 'investment_income'
        const role = isIncomeSide ? 'dividends' : 'invest-fees'
        const category = data.categories.find((c) => c.role === role)
        const mirror: Transaction | undefined = crossesToBank
          ? {
              id: newId(),
              date: when,
              description: tx.description || (isIncomeSide ? 'Dividend' : 'Investment fee'),
              categoryId: category?.id ?? '',
              categoryName: category?.name ?? (isIncomeSide ? 'Dividends' : 'Investment fees'),
              amount: input.amount,
              type: isIncomeSide ? 'income' : 'expense',
              createdAt: Date.now(),
              investmentTransactionId: tx.id,
              ...(when > todayStr() ? { confirmed: false } : {}),
            }
          : undefined
        setData((d) => ({
          ...d,
          investmentTransactions: [tx, ...d.investmentTransactions],
          transactions: mirror ? [mirror, ...d.transactions] : d.transactions,
        }))
      },
      updateInvestmentTransaction: (id, patch) => {
        setData((d) => ({
          ...d,
          investmentTransactions: d.investmentTransactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
      },
      removeInvestmentTransaction: (id) => {
        setData((d) => ({
          ...d,
          investmentTransactions: d.investmentTransactions.filter((t) => t.id !== id),
          transactions: d.transactions.filter((t) => t.investmentTransactionId !== id),
        }))
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
      addLoanInterest: ({ loanId, amount, date, description }) => {
        const category = data.categories.find((c) => c.role === 'loan-interest')
        const personName = data.loans.find((l) => l.id === loanId)?.personName
        const when = date ?? todayStr()
        const tx: Transaction = {
          id: newId(),
          date: when,
          description: description?.trim() || `Interest — ${personName ?? 'loan'}`,
          categoryId: category?.id ?? '',
          categoryName: category?.name ?? 'Loan interest',
          amount,
          type: 'income',
          createdAt: Date.now(),
          loanId,
          ...(when > todayStr() ? { confirmed: false } : {}),
        }
        setData((d) => ({ ...d, transactions: [tx, ...d.transactions] }))
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
