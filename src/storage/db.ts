import type { Account, AppData, Category, Keyword, RecurringExpense } from '../types'
import { matchingSuggestionForCategory } from '../lib/tags'

const STORAGE_KEY = 'finance-tracker-data-v1'

export function newId(): string {
  return crypto.randomUUID()
}

function todayStrLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultCategories(): Category[] {
  const expenseNames = ['Dining', 'Groceries', 'Transport', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Other']
  const incomeNames = ['Salary', 'Freelance', 'Gift', 'Investment', 'Other']
  const categories: Category[] = []
  for (const name of expenseNames) categories.push({ id: newId(), name, type: 'expense' })
  for (const name of incomeNames) categories.push({ id: newId(), name, type: 'income' })
  return categories
}

function defaultKeywords(categories: Category[]): Keyword[] {
  const findCat = (name: string, type: 'expense' | 'income') =>
    categories.find((c) => c.name === name && c.type === type)!.id

  const map: Array<[string, string, 'expense' | 'income']> = [
    ['lunch', 'Dining', 'expense'],
    ['dinner', 'Dining', 'expense'],
    ['breakfast', 'Dining', 'expense'],
    ['coffee', 'Dining', 'expense'],
    ['restaurant', 'Dining', 'expense'],
    ['takeout', 'Dining', 'expense'],
    ['grocery', 'Groceries', 'expense'],
    ['groceries', 'Groceries', 'expense'],
    ['supermarket', 'Groceries', 'expense'],
    ['uber', 'Transport', 'expense'],
    ['taxi', 'Transport', 'expense'],
    ['gas', 'Transport', 'expense'],
    ['fuel', 'Transport', 'expense'],
    ['bus', 'Transport', 'expense'],
    ['train', 'Transport', 'expense'],
    ['parking', 'Transport', 'expense'],
    ['electric', 'Utilities', 'expense'],
    ['electricity', 'Utilities', 'expense'],
    ['water bill', 'Utilities', 'expense'],
    ['internet', 'Utilities', 'expense'],
    ['phone bill', 'Utilities', 'expense'],
    ['rent', 'Rent', 'expense'],
    ['movie', 'Entertainment', 'expense'],
    ['netflix', 'Entertainment', 'expense'],
    ['spotify', 'Entertainment', 'expense'],
    ['game', 'Entertainment', 'expense'],
    ['shopping', 'Shopping', 'expense'],
    ['clothes', 'Shopping', 'expense'],
    ['amazon', 'Shopping', 'expense'],
    ['pharmacy', 'Health', 'expense'],
    ['doctor', 'Health', 'expense'],
    ['medicine', 'Health', 'expense'],
    ['salary', 'Salary', 'income'],
    ['paycheck', 'Salary', 'income'],
    ['wage', 'Salary', 'income'],
    ['freelance', 'Freelance', 'income'],
    ['gift', 'Gift', 'income'],
  ]

  return map.map(([keyword, catName, type]) => ({
    id: newId(),
    keyword,
    categoryId: findCat(catName, type),
    type,
  }))
}

function defaultData(): AppData {
  const categories = defaultCategories()
  return {
    categories,
    keywords: defaultKeywords(categories),
    accounts: [],
    recurringExpenses: [],
    transactions: [],
    investmentAccounts: [],
    investmentTransactions: [],
    loans: [],
    loanTransactions: [],
    settings: {},
  }
}

interface LegacyFixedItem {
  id: string
  name: string
  amount: number
  categoryId: string
  type: 'expense' | 'income'
}

/** One-time migration: the old boolean isInvestment flag was replaced by a free-form tags list. */
function migrateAccountTags(accounts: Account[]): Account[] {
  return accounts.map((a) => {
    const legacy = a as Account & { isInvestment?: boolean }
    if (legacy.isInvestment === undefined) return a
    const tags = legacy.tags ?? []
    const nextTags = legacy.isInvestment && !tags.includes('invest') ? [...tags, 'invest'] : tags
    const { isInvestment, ...rest } = legacy
    void isInvestment
    return { ...rest, tags: nextTags }
  })
}

/** One-time migration: recurring items no longer carry a manual accountId — confirmed occurrences auto-post to the "recur"-tagged account. */
function migrateRecurringAccountId(items: RecurringExpense[]): RecurringExpense[] {
  return items.map((r) => {
    const legacy = r as RecurringExpense & { accountId?: string }
    if (legacy.accountId === undefined) return r
    const { accountId, ...rest } = legacy
    void accountId
    return rest
  })
}

/** One-time migration: the old "Fixed items" panel was replaced by Recurring items with a schedule. */
function migrateFixedItems(legacyFixedItems: unknown, existingRecurring: RecurringExpense[]): RecurringExpense[] {
  if (!Array.isArray(legacyFixedItems) || legacyFixedItems.length === 0) return existingRecurring
  const today = todayStrLocal()
  const migrated: RecurringExpense[] = legacyFixedItems
    .filter((f): f is LegacyFixedItem => f && typeof f === 'object' && typeof f.id === 'string')
    .map((f) => ({
      id: newId(),
      name: f.name,
      amount: f.amount,
      categoryId: f.categoryId,
      type: f.type,
      frequency: 'monthly',
      interval: 1,
      startDate: today,
    }))
  return [...existingRecurring, ...migrated]
}

/**
 * Backfill: a recurring item whose category name matches a known tag suggestion (e.g. "Insurance")
 * gets that tag if it doesn't already have it — so picking the category alone is enough, past or
 * future. Never removes a tag, so a manual override still sticks.
 */
function syncRecurringCategoryTags(items: RecurringExpense[], categories: Category[]): RecurringExpense[] {
  return items.map((item) => {
    const catName = categories.find((c) => c.id === item.categoryId)?.name
    const derived = catName ? matchingSuggestionForCategory(catName) : undefined
    if (!derived) return item
    const currentTags = item.tags ?? []
    if (currentTags.some((t) => t.toLowerCase() === derived)) return item
    return { ...item, tags: [...currentTags, derived] }
  })
}

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultData()
  try {
    const parsed = JSON.parse(raw) as Partial<AppData> & { fixedItems?: unknown }
    const categories = parsed.categories ?? []
    const recurringExpenses = migrateRecurringAccountId(migrateFixedItems(parsed.fixedItems, parsed.recurringExpenses ?? []))
    return {
      categories,
      keywords: parsed.keywords ?? [],
      accounts: migrateAccountTags(parsed.accounts ?? []),
      recurringExpenses: syncRecurringCategoryTags(recurringExpenses, categories),
      transactions: parsed.transactions ?? [],
      investmentAccounts: parsed.investmentAccounts ?? [],
      investmentTransactions: parsed.investmentTransactions ?? [],
      loans: parsed.loans ?? [],
      loanTransactions: parsed.loanTransactions ?? [],
      settings: parsed.settings ?? {},
    }
  } catch {
    return defaultData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
