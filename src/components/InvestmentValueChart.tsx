import { CartesianGrid, Area, AreaChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValuePoint } from '../lib/investments'
import { formatMoney } from '../lib/format'

/**
 * Two stacked panels sharing one x-axis, never a second y-scale: money (invested vs value) and
 * gain/loss sit orders of magnitude apart, and putting them on one plot would invent a relationship
 * that isn't in the data.
 *
 * Top: what you put in (dashed) against what it's worth (solid) — the gap between the lines is the
 * whole story. Bottom: that gap on its own scale, green above the zero line, red below, which is
 * the only way to see whether it's really gaining while you keep adding money.
 */

const INVESTED = 'var(--series-1)'
const VALUE = 'var(--series-2)'
const GAIN = 'var(--color-accent-green)'
const LOSS = 'var(--color-accent-red)'
const AXIS = { stroke: 'var(--chart-text)', fontSize: 10 }
/** Both panels share this so their plot areas line up under one x-axis. */
const MARGIN = { top: 8, right: 14, bottom: 0, left: 0 }
const Y_WIDTH = 56

function shortDate(date: string): string {
  const [y, m] = date.split('-')
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]} ${y.slice(2)}`
}

function compactMoney(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${sign}$${Math.round(abs)}`
}

function Rows({ point }: { point: ValuePoint }) {
  const rows: Array<[string, string, string]> = [
    ['Invested', formatMoney(point.invested), INVESTED],
    ['Value', formatMoney(point.value), VALUE],
    [
      point.gain >= 0 ? 'Gain' : 'Loss',
      `${formatMoney(point.gain)}${point.gainPct === undefined ? '' : ` · ${point.gain >= 0 ? '+' : ''}${point.gainPct.toFixed(1)}%`}`,
      point.gain >= 0 ? GAIN : LOSS,
    ],
  ]
  return (
    <div className="rounded-md border border-line bg-panel px-2.5 py-2 text-xs shadow-lg">
      <div className="mb-1 text-[10px] text-muted">{point.date}</div>
      {rows.map(([label, value, color]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="text-muted">{label}</span>
          <span className="ml-auto font-figure text-text2">{value}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * A gradient fills by each element's own box, so a dot below zero would still take the green stop.
 * Colour every marker from its own sign instead.
 */
function GainDot({ cx, cy, payload, active }: { cx?: number; cy?: number; payload?: ValuePoint; active?: boolean }) {
  if (cx === undefined || cy === undefined || !payload) return null
  const color = payload.gain >= 0 ? GAIN : LOSS
  return (
    <circle cx={cx} cy={cy} r={active ? 5 : 3} fill="var(--color-panel)" stroke={color} strokeWidth={2} />
  )
}

/** Same tooltip on both panels, so a hover anywhere answers the same three questions. */
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ValuePoint }> }) {
  if (!active || !payload?.length) return null
  return <Rows point={payload[0].payload} />
}

export default function InvestmentValueChart({ points }: { points: ValuePoint[] }) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-xs text-muted">
        Log the value on at least two dates and the chart appears here.
      </p>
    )
  }

  const gains = points.map((p) => p.gain)
  const maxGain = Math.max(...gains)
  const minGain = Math.min(...gains)
  // Split the fill exactly at zero so gains read green and losses red on one continuous area.
  const zeroOffset = maxGain <= 0 ? 0 : minGain >= 0 ? 1 : maxGain / (maxGain - minGain)

  return (
    <div>
      <div className="section-label mb-1">Invested vs value</div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={points} margin={MARGIN}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis tickFormatter={compactMoney} width={Y_WIDTH} tickLine={false} axisLine={false} {...AXIS} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }} />
          <Legend
            verticalAlign="top"
            height={22}
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, color: 'var(--chart-text)' }}
          />
          <Line
            type="monotone"
            dataKey="invested"
            name="Invested"
            stroke={INVESTED}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 4, fill: INVESTED, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: 'var(--color-panel)', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="Value"
            stroke={VALUE}
            strokeWidth={2}
            dot={{ r: 4, fill: VALUE, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: 'var(--color-panel)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="section-label mb-1 mt-2">Gain / loss</div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={points} margin={MARGIN}>
          <defs>
            <linearGradient id="gainSplit" x1="0" y1="0" x2="0" y2="1">
              <stop offset={zeroOffset} stopColor={GAIN} stopOpacity={0.35} />
              <stop offset={zeroOffset} stopColor={LOSS} stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="gainStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={zeroOffset} stopColor={GAIN} />
              <stop offset={zeroOffset} stopColor={LOSS} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} minTickGap={16} {...AXIS} />
          <YAxis tickFormatter={compactMoney} width={Y_WIDTH} tickLine={false} axisLine={false} {...AXIS} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }} />
          <ReferenceLine y={0} stroke="var(--chart-text)" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="gain"
            name="Gain / loss"
            stroke="url(#gainStroke)"
            strokeWidth={2}
            fill="url(#gainSplit)"
            dot={<GainDot />}
            activeDot={<GainDot active />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
