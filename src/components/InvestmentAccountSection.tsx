import { useMemo, useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { InvestmentAccount, InvestmentEntryType } from '../types'
import { formatMoney, todayStr } from '../lib/format'
import Collapsible from './Collapsible'

const TYPE_LABELS: Record<InvestmentEntryType, string> = {
  investment_income: 'Investment income',
  investment_expense: 'Investment expense',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
}

export default function InvestmentAccountSection({ account }: { account: InvestmentAccount }) {
  const { data, addInvestmentTransaction, removeInvestmentTransaction, removeInvestmentAccount } = useData()

  const [date, setDate] = useState(todayStr())
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<InvestmentEntryType>('deposit')

  const [typeFilter, setTypeFilter] = useState<'all' | InvestmentEntryType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const transactions = useMemo(
    () =>
      data.investmentTransactions
        .filter((t) => t.accountId === account.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [data.investmentTransactions, account.id],
  )

  const categoryNames = useMemo(() => Array.from(new Set(transactions.map((t) => t.category))).sort(), [transactions])

  const filtered = transactions.filter(
    (t) => (typeFilter === 'all' || t.type === typeFilter) && (categoryFilter === 'all' || t.category === categoryFilter),
  )

  const totals = useMemo(() => {
    const deposits = transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
    const withdrawals = transactions.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)
    const income = transactions.filter((t) => t.type === 'investment_income').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'investment_expense').reduce((s, t) => s + t.amount, 0)
    const invested = deposits - withdrawals
    const net = invested + income - expenses
    return { invested, income, expenses, net }
  }, [transactions])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!description.trim() || !category.trim() || Number.isNaN(amt) || amt <= 0) return
    addInvestmentTransaction({ accountId: account.id, description, category, amount: amt, type, date })
    setDescription('')
    setCategory('')
    setAmount('')
  }

  return (
    <Collapsible
      title={
        <span>
          {account.name} <span className="ml-2 text-xs font-normal text-slate-400">net {formatMoney(totals.net)}</span>
        </span>
      }
      right={
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`Remove investment "${account.name}" and all its logged entries?`)) removeInvestmentAccount(account.id)
          }}
          className="text-slate-400 hover:text-red-500"
          title="Remove investment"
        >
          ✕
        </button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
          <div className="text-xs text-slate-400">Invested</div>
          <div className="font-semibold">{formatMoney(totals.invested)}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
          <div className="text-xs text-slate-400">Earnings</div>
          <div className="font-semibold text-green-600">{formatMoney(totals.income)}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
          <div className="text-xs text-slate-400">Expenses</div>
          <div className="font-semibold text-red-500">{formatMoney(totals.expenses)}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
          <div className="text-xs text-slate-400">Total net</div>
          <div className="font-semibold">{formatMoney(totals.net)}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (e.g. Dividend)"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InvestmentEntryType)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          Log
        </button>
      </form>

      <div className="mb-2 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | InvestmentEntryType)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">All categories</option>
          {categoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-72 overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="whitespace-nowrap px-3 py-2">{t.date}</td>
                <td className="px-3 py-2">{t.description}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{t.category}</span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{TYPE_LABELS[t.type]}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatMoney(t.amount)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => removeInvestmentTransaction(t.id)} className="text-slate-400 hover:text-red-500">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Collapsible>
  )
}
