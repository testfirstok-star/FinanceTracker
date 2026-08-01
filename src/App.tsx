import type { ReactNode } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { DataProvider } from './hooks/DataContext'
import LoggingPage from './pages/LoggingPage'
import DashboardPage from './pages/DashboardPage'
import ExpensesPage from './pages/ExpensesPage'
import IncomePage from './pages/IncomePage'
import InvestmentsPage from './pages/InvestmentsPage'
import { DashboardIcon, ExpensesIcon, IncomeIcon, InvestmentsIcon, LogIcon } from './components/icons'
import BackupRestoreControls from './components/BackupRestoreControls'

const navItems = [
  { to: '/', label: 'Log', end: true, icon: LogIcon },
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/expenses', label: 'Expenses', icon: ExpensesIcon },
  { to: '/income', label: 'Income', icon: IncomeIcon },
  { to: '/investments', label: 'Investments', icon: InvestmentsIcon },
]

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-[max(1rem,env(safe-area-inset-left))] py-3">
          <span className="flex shrink-0 items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            <span className="section-label">Finance Tracker</span>
          </span>
          <BackupRestoreControls />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl px-[env(safe-area-inset-left)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-gold' : 'text-muted'
                }`
              }
            >
              <item.icon className="h-6 w-6" />
              {item.label}
            </NavLink>
          ))}
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
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DataProvider>
  )
}

export default App
