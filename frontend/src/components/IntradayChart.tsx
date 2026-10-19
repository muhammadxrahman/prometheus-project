import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { IntradayRow } from '../api/intraday'
import { formatDay, formatDayShort, formatPrice, formatVolume, formatVolumeCompact } from '../utils/format'

// validated as a pair on the white page surface (CVD and contrast checks pass)
const COLORS = {
  range: '#2a78d6',
  volume: '#eb6834',
  surface: '#ffffff',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#6c757d',
}

// syncs the hover position across both panels so they read as one chart
const SYNC_ID = 'intraday'
// equal y-axis widths keep both panels' days lined up vertically
const Y_AXIS_WIDTH = 64
const tick = { fill: COLORS.muted, fontSize: 12 }

interface IntradayChartProps {
  ticker: string
  rows: IntradayRow[]
}

function TooltipRow({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <span style={{ width: 12, height: 2, background: color, borderRadius: 1 }} aria-hidden="true" />
      <strong className="font-monospace">{value}</strong>
      <span className="text-body-secondary">{label}</span>
    </div>
  )
}

// one readout for the whole day, whichever panel is hovered
function DayTooltip({ active, payload }: TooltipContentProps) {
  const row = payload?.[0]?.payload as IntradayRow | undefined
  if (!active || !row) return null
  return (
    <div className="card shadow-sm small">
      <div className="card-body py-2 px-3">
        <div className="fw-semibold mb-1">{formatDay(row.day)}</div>
        <TooltipRow color={COLORS.range} value={formatPrice(row.highAverage)} label="High avg" />
        <TooltipRow color={COLORS.range} value={formatPrice(row.lowAverage)} label="Low avg" />
        <TooltipRow color={COLORS.volume} value={formatVolume(row.volume)} label="Volume" />
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="d-inline-flex align-items-center gap-2">
      <span style={{ width: 12, height: 12, background: color, borderRadius: 2 }} aria-hidden="true" />
      {label}
    </span>
  )
}

// Price range and volume have different scales, so they get stacked panels on a shared day axis
// rather than two y-axes on one plot.
function IntradayChart({ ticker, rows }: IntradayChartProps) {
  return (
    <figure className="mb-0" aria-label={`${ticker} daily price range and volume chart`}>
      <div className="d-flex flex-wrap gap-3 small text-body-secondary mb-2">
        <LegendItem color={COLORS.range} label="Daily range (low avg to high avg)" />
        <LegendItem color={COLORS.volume} label="Volume" />
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} syncId={SYNC_ID} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          {/* band scale like the bar panel below, so each day's points sit above its volume bar */}
          <XAxis dataKey="day" scale="band" hide />
          <YAxis
            width={Y_AXIS_WIDTH}
            domain={['auto', 'auto']}
            tickFormatter={(value: number) => formatPrice(value)}
            tick={tick}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={DayTooltip} cursor={{ stroke: COLORS.axis, strokeWidth: 1 }} isAnimationActive={false} />
          <Area
            dataKey={(row: IntradayRow) => [row.lowAverage, row.highAverage]}
            stroke="none"
            fill={COLORS.range}
            fillOpacity={0.12}
            activeDot={false}
            isAnimationActive={false}
          />
          {(['highAverage', 'lowAverage'] as const).map((key) => (
            <Line
              key={key}
              dataKey={key}
              stroke={COLORS.range}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.range, stroke: COLORS.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={rows} syncId={SYNC_ID} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDayShort}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: COLORS.axis }}
            minTickGap={16}
          />
          <YAxis
            width={Y_AXIS_WIDTH}
            tickFormatter={formatVolumeCompact}
            tick={tick}
            tickLine={false}
            axisLine={false}
          />
          {/* the price panel's tooltip shows all three values; this one only draws the hover column */}
          <Tooltip content={() => null} cursor={{ fill: 'rgba(11, 11, 11, 0.04)' }} />
          <Bar dataKey="volume" fill={COLORS.volume} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}

export default IntradayChart
