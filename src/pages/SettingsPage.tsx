import Card from '../components/Card'
import PageTitle from '../components/PageTitle'
import { useData } from '../hooks/DataContext'
import { NAV_PAGES, getFullNavConfig } from '../lib/navPages'
import { accountKindSuffix } from '../lib/cashflow'
import { chartShown } from '../lib/investments'

export default function SettingsPage() {
  const { data, updateSettings, activeAccounts, setInvestmentChartEnabled } = useData()
  const accounts = activeAccounts()
  const config = getFullNavConfig(data.settings.navConfig)
  const byKey = new Map(NAV_PAGES.map((p) => [p.key, p]))

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= config.length) return
    const next = [...config]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateSettings({ navConfig: next })
  }

  function toggleHidden(index: number) {
    const next = config.map((c, i) => (i === index ? { ...c, hidden: !c.hidden } : c))
    updateSettings({ navConfig: next })
  }

  function resetToDefault() {
    updateSettings({ navConfig: undefined })
  }

  return (
    <div className="space-y-6">
      <PageTitle>Settings</PageTitle>

      <Card title="Default accounts">
        <p className="mb-3 text-xs text-muted">
          Where money lands when you don't pick an account. Anything Unassigned counts as Expenses, so if most of your spending
          goes on a card, make that card the default and log the bill from your cash account.
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="section-label mb-1 block">Default account for quick log</span>
            <select
              value={data.settings.defaultExpenseAccountId ?? ''}
              onChange={(e) => updateSettings({ defaultExpenseAccountId: e.target.value || undefined })}
              className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {accountKindSuffix(a.kind)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="section-label mb-1 block">Account for investment transfers</span>
            {accounts.some((a) => a.kind === 'invest') ? (
              <select
                value={data.settings.investmentTransferAccountId ?? ''}
                onChange={(e) => updateSettings({ investmentTransferAccountId: e.target.value || undefined })}
                className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-sm"
              >
                <option value="">Not linked</option>
                {accounts
                  .filter((a) => a.kind === 'invest')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            ) : (
              <p className="text-xs text-muted">
                No Invest account yet. Set an account's kind to Invest under Manage accounts on the Expenses page, then pick it
                here.
              </p>
            )}
            <span className="mt-1 block text-[10px] text-muted">
              Deposits and withdrawals you log on the Investments page show up under this account on the Expenses page. They stay
              recorded once, so nothing is counted twice.
            </span>
          </label>
          <label className="block">
            <span className="section-label mb-1 block">Default account for recurring expenses</span>
            <select
              value={data.settings.defaultRecurringAccountId ?? ''}
              onChange={(e) => updateSettings({ defaultRecurringAccountId: e.target.value || undefined })}
              className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {accountKindSuffix(a.kind)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card title="Investment charts">
        <p className="mb-3 text-xs text-muted">
          Which portfolios draw a value-over-time chart under their value log. Switch off the ones you'd rather just read as
          numbers.
        </p>
        {data.investmentAccounts.length === 0 ? (
          <p className="text-xs text-muted">No investments yet — add one on the Investments page.</p>
        ) : (
          <div className="space-y-1.5">
            {data.investmentAccounts.map((a) => {
              const shown = chartShown(a)
              return (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <span className={`text-sm ${shown ? 'text-text2' : 'text-muted'}`}>{a.name}</span>
                  <button
                    onClick={() => setInvestmentChartEnabled(a.id, !shown)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${shown ? 'bg-gold/20 text-gold' : 'border border-line text-muted'}`}
                  >
                    {shown ? 'Chart on' : 'Chart off'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Bottom navigation">
        <p className="mb-3 text-xs text-muted">Arrange, show, or hide the pages in the bottom bar.</p>
        <div className="space-y-1.5">
          {config.map((c, i) => {
            const def = byKey.get(c.key)
            if (!def) return null
            return (
              <div
                key={c.key}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${c.hidden ? 'border-line text-muted' : 'border-line text-text2'}`}
              >
                <span className="text-sm">{def.label}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded px-1.5 py-1 text-xs text-muted hover:text-gold disabled:opacity-30"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === config.length - 1}
                    className="rounded px-1.5 py-1 text-xs text-muted hover:text-gold disabled:opacity-30"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => toggleHidden(i)}
                    className={`ml-2 rounded-full px-2.5 py-1 text-xs font-medium ${c.hidden ? 'border border-line text-muted' : 'bg-gold/20 text-gold'}`}
                  >
                    {c.hidden ? 'Hidden' : 'Shown'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={resetToDefault} className="mt-3 text-xs text-muted hover:text-gold">
          Reset to default
        </button>
      </Card>
    </div>
  )
}
