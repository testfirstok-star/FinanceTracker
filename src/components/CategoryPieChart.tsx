import { useMemo } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMoney } from '../lib/format'

const SLOT_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
]
const OTHER_COLOR = 'var(--series-other)'
const MAX_SLICES = 7

export default function CategoryPieChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const { slices, total } = useMemo(() => {
    const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)
    let result = sorted
    if (sorted.length > MAX_SLICES) {
      const top = sorted.slice(0, MAX_SLICES - 1)
      const rest = sorted.slice(MAX_SLICES - 1)
      const otherTotal = rest.reduce((s, d) => s + d.value, 0)
      result = [...top, { name: 'Other', value: otherTotal }]
    }
    const total = result.reduce((s, d) => s + d.value, 0)
    return { slices: result, total }
  }, [data])

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted">No entries for this period.</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={64}
            paddingAngle={2}
            cornerRadius={3}
            label={({ percent }) => (percent && percent > 0.1 ? `${Math.round(percent * 100)}%` : '')}
            labelLine={false}
          >
            {slices.map((s, i) => (
              <Cell key={s.name} fill={s.name === 'Other' ? OTHER_COLOR : SLOT_COLORS[i % SLOT_COLORS.length]} stroke="var(--chart-grid)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ fontSize: 12 }} />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: 12, color: 'var(--chart-text)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-sm text-muted">Total {formatMoney(total)}</p>
    </div>
  )
}
