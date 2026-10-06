import { useMemo, useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { InvestmentAccount, InvestmentEntryType } from '../types'
import type { Period } from '../hooks/usePeriod'
import { formatMoney, todayStr } from '../lib/format'
import { chartShown, latestValue, moneyAtWork, periodView, valuesFor, valueSeries } from '../lib/investments'
import Collapsible from './Collapsible'
import InvestmentValueChart from './InvestmentValueChart'

const TYPE_LABELS: Record<InvestmentEntryType, string> = {
  investment_income: 'Investment income',
  investment_expense: 'Investment expense',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
}

export default function InvestmentAccountSection({ account, period }: { account: InvestmentAccount; period: Period }) {
  const { data, addInvestmentTransaction, removeInvestmentTransaction, removeInvestmentAccount, addInvestmentValue, removeInvestmentValue } =
    useData()

  const [date, setDate] = useState(todayStr())
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<InvestmentEntryType>('deposit')
  const [paidOut, setPaidOut] = useState(false)

  const [typeFilter, setTypeFilter] = useState<'all' | InvestmentEntryType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [valueDraft, setValueDraft] = useState('')
  const [valueDate, setValueDate] = useState(todayStr())

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

  const values = useMemo(() => valuesFor(data.investmentValues, account.id).slice().reverse(), [data.investmentValues, account.id])
  const series = useMemo(
    () => valueSeries(account.id, data.investmentTransactions, data.investmentValues),
    [account.id, data.investmentTransactions, data.investmentValues],
  )

  const view = useMemo(() => periodView(series, period.start, period.end), [series, period.start, period.end])

  const totals = useMemo(() => {
    const deposits = transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
    const withdrawals = transactions.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)
    const income = transactions.filter((t) => t.type === 'investment_income').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'investment_expense').reduce((s, t) => s + t.amount, 0)
    const invested = deposits - withdrawals
    const currentValue = latestValue(account, data.investmentValues) ?? invested
    // Total net = market value of holdings + income received - expenses paid.
    const totalNet = currentValue + income - expenses
    const gain = totalNet - invested
    const gainPct = invested !== 0 ? (gain / invested) * 100 : 0
    return { invested, income, expenses, currentValue, totalNet, gain, gainPct }
  }, [transactions, account, data.investmentValues])

  function logValue(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(valueDraft)
    if (Number.isNaN(amt) || amt < 0 || !valueDate) return
    addInvestmentValue({ accountId: account.id, value: amt, date: valueDate })
    setValueDraft('')
    setValueDate(todayStr())
  }

  const amountValid = !Number.isNaN(parseFloat(amount)) && parseFloat(amount) > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    // Only the amount is genuinely needed. Requiring a description and a category used to drop the
    // entry silently, which looked exactly like deposits not being recorded at all.
    if (!amountValid) return
    const isTransfer = type === 'deposit' || type === 'withdrawal'
    addInvestmentTransaction({
      accountId: account.id,
      description: description.trim() || TYPE_LABELS[type],
      category: category.trim() || (isTransfer ? 'Transfer' : 'Uncategorized'),
      amount: amt,
      type,
      date,
      paidOut,
    })
    setDescription('')
    setCategory('')
    setAmount('')
    setPaidOut(false)
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
          className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel-hover hover:text-accent-red"
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

      <div className="mb-4 rounded-lg border border-line p-3">
        <div className="section-label mb-2">In {period.label}</div>
        {view.tooFewPoints ? (
          <p className="text-xs text-muted">
            {series.length === 0
              ? 'No value logged yet, so there is nothing to measure.'
              : 'Needs a logged value at each end of this range. Widen the range, or log one more.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-panel-hover p-2">
                <div className="text-xs text-muted">Gain</div>
                <div className={`font-figure font-semibold ${view.gain >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {view.gain >= 0 ? '+' : ''}
                  {formatMoney(view.gain)}
                </div>
              </div>
              <div className="rounded-md bg-panel-hover p-2">
                <div className="text-xs text-muted">You added</div>
                <div className="font-figure font-semibold">{formatMoney(view.deposited)}</div>
              </div>
              <div className="rounded-md bg-panel-hover p-2">
                <div className="text-xs text-muted">Return</div>
                <div className={`font-figure font-semibold ${view.gain >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {view.returnPct === undefined ? '—' : `${view.returnPct >= 0 ? '+' : ''}${view.returnPct.toFixed(2)}%`}
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-muted">
              {view.opening && view.opening.date < period.start ? (
                <>
                  Measured from your {view.opening.date} value, the last one logged before this range, through{' '}
                  {view.closing?.date}. Log a value nearer the start of the range for a tighter answer.
                </>
              ) : (
                <>
                  Measured between the values you logged on {view.opening?.date} and {view.closing?.date}.
                </>
              )}{' '}
              Worked out on {formatMoney(moneyAtWork(view))} at work, with your own top-ups cancelled out, so this is what the
              market did.
            </p>
          </>
        )}
      </div>

      <div className="mb-4">
        <div className="section-label mb-1">Log what it's worth</div>
        <form onSubmit={logValue} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={valueDate}
            onChange={(e) => setValueDate(e.target.value)}
            className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value)}
            placeholder={formatMoney(totals.invested)}
            className="w-36 rounded-md border border-line bg-panel-hover px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-dark">
            Log value
          </button>
        </form>
        <p className="mt-1 text-[10px] text-muted">
          Check the balance and write it down, as often as you like. Logging the same date again replaces it. This records what
          the portfolio is worth — it never counts as income or spending.
        </p>

        {values.length > 0 && (
          <div className="mt-2">
            {chartShown(account) ? (
              <InvestmentValueChart
                points={series}
                highlight={view.opening && view.closing ? { from: view.opening.date, to: view.closing.date } : undefined}
              />
            ) : (
              series.length >= 2 && <p className="py-2 text-xs text-muted">Chart hidden — turn it back on under Settings.</p>
            )}
            <Collapsible title={`Value log (${values.length})`}>
              <div className="space-y-1">
                {values.map((v) => {
                  const point = series.find((p) => p.date === v.date)
                  return (
                    <div key={v.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-1.5 text-xs">
                      <span className="text-muted">{v.date}</span>
                      <div className="flex items-center gap-2">
                        {point && (
                          <span className={point.gain >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                            {point.gain >= 0 ? '+' : ''}
                            {formatMoney(point.gain)}
                          </span>
                        )}
                        <span className="font-figure font-medium">{formatMoney(v.value)}</span>
                        <button
                          onClick={() => removeInvestmentValue(v.id)}
                          className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel-hover hover:text-accent-red"
                          title="Delete this snapshot"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Collapsible>
          </div>
        )}
      </div>

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
            placeholder="Description (optional)"
            className="rounded-md border border-line px-2 py-1.5 text-sm bg-panel-hover"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
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
          <button
            type="submit"
            disabled={!amountValid}
            className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-40"
            title={amountValid ? undefined : 'Enter an amount first'}
          >
            Log
          </button>
          {(type === 'investment_income' || type === 'investment_expense') && (
            <label className="flex items-center gap-2 text-xs text-muted sm:col-span-6">
              <input type="checkbox" checked={paidOut} onChange={(e) => setPaidOut(e.target.checked)} className="accent-gold" />
              {type === 'investment_income'
                ? 'Paid out to my bank (count as Income)'
                : 'Paid from my bank (count as Expense)'}
            </label>
          )}
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
                    <td className="px-3 py-2 text-xs text-muted">
                      {TYPE_LABELS[t.type]}
                      {t.paidOut && (
                        <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold" title="Also counted on Cash Flow">
                          bank
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatMoney(t.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeInvestmentTransaction(t.id)}
                        className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel-hover hover:text-accent-red"
                      >
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
