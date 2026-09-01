import type { ReactNode, SVGProps } from 'react'
import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { DataProvider, useData } from './hooks/DataContext'
import LoggingPage from './pages/LoggingPage'
import DashboardPage from './pages/DashboardPage'
import CashFlowPage from './pages/CashFlowPage'
import ExpensesPage from './pages/ExpensesPage'
import IncomePage from './pages/IncomePage'
import LoansPage from './pages/LoansPage'
import InvestmentsPage from './pages/InvestmentsPage'
import SettingsPage from './pages/SettingsPage'
import {
  CashFlowIcon,
  DashboardIcon,
  ExpensesIcon,
  IncomeIcon,
  InvestmentsIcon,
  LoansIcon,
  LogIcon,
  SettingsIcon,
} from './components/icons'
import BackupRestoreControls from './components/BackupRestoreControls'
import { getVisibleNavPages } from './lib/navPages'

const NAV_ICONS: Record<string, (props: SVGProps<SVGSVGElement>) => ReactNode> = {
  log: LogIcon,
  dashboard: DashboardIcon,
  cashflow: CashFlowIcon,
  expenses: ExpensesIcon,
  income: IncomeIcon,
  loans: LoansIcon,
  investments: InvestmentsIcon,
}

function Layout({ children }: { children: ReactNode }) {
  const { data } = useData()
  const navItems = getVisibleNavPages(data.settings.navConfig)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-[max(1rem,env(safe-area-inset-left))] py-3">
          <span className="flex shrink-0 items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            <span className="section-label">Finance Tracker</span>
          </span>
          <div className="flex items-center gap-2">
            <BackupRestoreControls />
            <Link
              to="/settings"
              title="Settings"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold/40 hover:text-text"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl px-[env(safe-area-inset-left)]">
          {navItems.map((item) => {
            const Icon = NAV_ICONS[item.key] ?? LogIcon
            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-gold' : 'text-muted'
                  }`
                }
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LoggingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/cashflow" element={<CashFlowPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DataProvider>
  )
}

export default App
