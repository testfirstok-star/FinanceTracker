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
  const { data, addInvestmentTransaction, removeInvestmentTransaction, removeInvestmentAccount, updateInvestmentAccountValue } = useData()

  const [date, setDate] = useState(todayStr())
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<InvestmentEntryType>('deposit')

  const [typeFilter, setTypeFilter] = useState<'all' | InvestmentEntryType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [valueDraft, setValueDraft] = useState(String(account.currentValue ?? ''))

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
    const currentValue = account.currentValue ?? invested
    // Total net = market value of holdings + income received - expenses paid.
    const totalNet = currentValue + income - expenses
    const gain = totalNet - invested
    const gainPct = invested !== 0 ? (gain / invested) * 100 : 0
    return { invested, income, expenses, currentValue, totalNet, gain, gainPct }
  }, [transactions, account.currentValue])

  function commitValue() {
    const amt = parseFloat(valueDraft)
    updateInvestmentAccountValue(account.id, valueDraft.trim() === '' || Number.isNaN(amt) ? undefined : amt)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!description.trim() || !category.trim() || Number.isNaN(amt) || amt <= 0) return
    addInvestmentTransaction({ accountId: account.id, description, category, amount: amt, type, date })
    setDescription('')
    setCategory('')
    setAmount('')
  }

  const gainTone = totals.gain >= 0 ? 'text-accent-green' : 'text-accent-red'
  const gainSign = totals.gain >= 0 ? '+' : ''

  return (
    <Collapsible
      title={
        <span>
          {account.name}{' '}
          <span className={`ml-2 text-xs font-medium ${gainTone}`}>
            {gainSign}
            {totals.gainPct.toFixed(2)}%
          </span>{' '}
          <span className="font-figure text-xs text-muted">{formatMoney(totals.gain)}</span>
        </span>
      }
      right={
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`Remove investment "${account.name}" and all its logged entries?`)) removeInvestmentAccount(account.id)
          }}
          className="text-muted hover:text-accent-red"
          title="Remove investment"
        >
          ✕
        </button>
      }
    >
      <div className="mb-3 rounded-lg bg-panel-hover p-4 text-center">
        <div className="section-label">Total net</div>
        <div className="font-figure text-2xl font-semibold text-gold">{formatMoney(totals.totalNet)}</div>
        <div className={`mt-1 text-sm font-medium ${gainTone}`}>
          {gainSign}
          {totals.gainPct.toFixed(2)}%
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-md bg-panel-hover p-2">
          <div className="text-xs text-muted">Invested</div>
          <div className="font-figure font-semibold">{formatMoney(totals.invested)}</div>
        </div>
        <div className="rounded-md bg-panel-hover p-2">
          <div className="text-xs text-muted">Gain / Loss</div>
          <div className={`font-figure font-semibold ${gainTone}`}>{formatMoney(totals.gain)}</div>
        </div>
        <div className="rounded-md bg-panel-hover p-2">
          <div className="text-xs text-muted">Expenses</div>
          <div className="font-figure font-semibold text-accent-red">{formatMoney(totals.expenses)}</div>
        </div>
      </div>

      <label className="mb-4 block">
        <span className="section-label mb-1 block">Current portfolio value</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={valueDraft}
          onChange={(e) => setValueDraft(e.target.value)}
          onBlur={commitValue}
          placeholder={formatMoney(totals.invested)}
          className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-sm sm:w-56"
        />
      </label>

      <Collapsible title="Log a transaction">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-line px-2 py-1.5 text-sm bg-panel-hover"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="rounded-md border border-line px-2 py-1.5 text-sm bg-panel-hover"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g. Dividend)"
            className="rounded-md border border-line px-2 py-1.5 text-sm bg-panel-hover"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InvestmentEntryType)}
            className="rounded-md border border-line px-2 py-1.5 text-sm bg-panel-hover"
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
            className="rounded-md border border-line px-2 py-1.5 text-sm bg-panel-hover"
          />
          <button type="submit" className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-dark">
            Log
          </button>
        </form>
      </Collapsible>

      <div className="mt-3">
        <Collapsible title={`Transaction log (${transactions.length})`}>
          <div className="mb-2 flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | InvestmentEntryType)}
              className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
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
              className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
            >
              <option value="all">All categories</option>
              {categoryNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-72 overflow-auto rounded-md border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-panel-hover">
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
                  <tr key={t.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-3 py-2">{t.date}</td>
                    <td className="px-3 py-2">{t.description}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-panel-hover px-2 py-0.5 text-xs">{t.category}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{TYPE_LABELS[t.type]}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatMoney(t.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeInvestmentTransaction(t.id)} className="text-muted hover:text-accent-red">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      No entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Collapsible>
      </div>
    </Collapsible>
  )
}
