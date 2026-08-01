export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthKey(date: string): string {
  return date.slice(0, 7) // YYYY-MM
}

export function formatMonthLabel(monthKeyStr: string): string {
  const [y, m] = monthKeyStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function daysInMonth(monthKeyStr: string): number {
  const [y, m] = monthKeyStr.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function shiftMonth(monthKeyStr: string, delta: number): string {
  const [y, m] = monthKeyStr.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
