import Card from '../components/Card'
import PageTitle from '../components/PageTitle'
import { useData } from '../hooks/DataContext'
import { NAV_PAGES, getFullNavConfig } from '../lib/navPages'

export default function SettingsPage() {
  const { data, updateSettings } = useData()
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
