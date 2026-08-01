import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  AppData,
  AppSettings,
  Category,
  EntryType,
  FixedItem,
  InvestmentAccount,
  InvestmentEntryType,
  InvestmentTransaction,
  Keyword,
  Transaction,
} from '../types'
import { loadData, newId, saveData } from '../storage/db'

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

  // fixed items
  addFixedItem: (name: string, amount: number, categoryId: string, type: EntryType) => void
  updateFixedItem: (id: string, name: string, amount: number, categoryId: string) => void
  removeFixedItem: (id: string) => void

  // transactions
  addTransaction: (input: { description: string; categoryId: string; amount: number; type: EntryType; date?: string }) => Transaction
  updateTransaction: (id: string, patch: Partial<Pick<Transaction, 'date' | 'description' | 'categoryId' | 'categoryName' | 'amount'>>) => void
  removeTransaction: (id: string) => void

  // investments
  addInvestmentAccount: (name: string) => InvestmentAccount
  removeInvestmentAccount: (id: string) => void
  updateInvestmentAccountValue: (id: string, currentValue: number | undefined) => void
  addInvestmentTransaction: (input: { accountId: string; description: string; category: string; amount: number; type: InvestmentEntryType; date?: string }) => void
  updateInvestmentTransaction: (id: string, patch: Partial<Pick<InvestmentTransaction, 'date' | 'description' | 'category' | 'amount' | 'type'>>) => void
  removeInvestmentTransaction: (id: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

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
          fixedItems: next.fixedItems ?? [],
          transactions: next.transactions ?? [],
          investmentAccounts: next.investmentAccounts ?? [],
          investmentTransactions: next.investmentTransactions ?? [],
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

      addFixedItem: (name, amount, categoryId, type) => {
        const item: FixedItem = { id: newId(), name: name.trim(), amount, categoryId, type }
        setData((d) => ({ ...d, fixedItems: [...d.fixedItems, item] }))
      },
      updateFixedItem: (id, name, amount, categoryId) => {
        setData((d) => ({
          ...d,
          fixedItems: d.fixedItems.map((f) => (f.id === id ? { ...f, name: name.trim(), amount, categoryId } : f)),
        }))
      },
      removeFixedItem: (id) => {
        setData((d) => ({ ...d, fixedItems: d.fixedItems.filter((f) => f.id !== id) }))
      },

      addTransaction: (input) => {
        const category = data.categories.find((c) => c.id === input.categoryId)
        const tx: Transaction = {
          id: newId(),
          date: input.date ?? todayStr(),
          description: input.description.trim(),
          categoryId: input.categoryId,
          categoryName: category?.name ?? 'Uncategorized',
          amount: input.amount,
          type: input.type,
          createdAt: Date.now(),
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
    }
  }, [data])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
