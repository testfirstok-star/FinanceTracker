import type { NavConfigEntry } from '../types'

export interface NavPageDef {
  key: string
  label: string
  path: string
  end?: boolean
}

/** The full canonical set of pages that can appear in the bottom nav, in default order. */
export const NAV_PAGES: NavPageDef[] = [
  { key: 'log', label: 'Log', path: '/', end: true },
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'cashflow', label: 'Cash Flow', path: '/cashflow' },
  { key: 'expenses', label: 'Expenses', path: '/expenses' },
  { key: 'income', label: 'Income', path: '/income' },
  { key: 'loans', label: 'Loans', path: '/loans' },
  { key: 'investments', label: 'Investments', path: '/investments' },
]

/**
 * Every known page, in the user's configured order (falling back to default order), each with its
 * current hidden state. Used by the Settings page so every row — including hidden ones — can be
 * arranged and toggled. Pages added to the app after a user last saved their config are appended
 * at the end, visible by default.
 */
export function getFullNavConfig(stored: NavConfigEntry[] | undefined): NavConfigEntry[] {
  const known = new Set(NAV_PAGES.map((p) => p.key))
  const result: NavConfigEntry[] = []
  const seen = new Set<string>()
  for (const c of stored ?? []) {
    if (known.has(c.key) && !seen.has(c.key)) {
      result.push({ key: c.key, hidden: !!c.hidden })
      seen.add(c.key)
    }
  }
  for (const p of NAV_PAGES) {
    if (!seen.has(p.key)) {
      result.push({ key: p.key, hidden: false })
      seen.add(p.key)
    }
  }
  return result
}

/** The pages that actually render in the bottom nav, in order — hidden ones filtered out. */
export function getVisibleNavPages(stored: NavConfigEntry[] | undefined): NavPageDef[] {
  const byKey = new Map(NAV_PAGES.map((p) => [p.key, p]))
  return getFullNavConfig(stored)
    .filter((c) => !c.hidden)
    .map((c) => byKey.get(c.key))
    .filter((p): p is NavPageDef => p !== undefined)
}
