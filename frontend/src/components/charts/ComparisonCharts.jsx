import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { POLICY_INFO, TRAFFIC_CLASSES } from '../../constants'
import { AXIS, GRID, TOOLTIP } from './chartTheme'

export function ChartCard({ title, description, children, note }) {
  return (
    <figure className="surface flex flex-col p-5">
      <figcaption className="mb-4">
        <h4 className="text-sm font-semibold">{title}</h4>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{description}</p>}
      </figcaption>
      <div className="flex-1">{children}</div>
      {note && <p className="mt-3 text-xs leading-relaxed text-ink-muted">{note}</p>}
    </figure>
  )
}

const legendStyle = { fontSize: 12, color: 'var(--color-ink-muted)', paddingTop: 8 }

/** One bar per compared policy. */
export function PolicyBars({ results, accessor, format, label, domain }) {
  const data = Object.keys(results).map((key) => ({ key, name: POLICY_INFO[key].label, value: accessor(results[key]) }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="name" {...AXIS} interval={0} tick={{ ...AXIS.tick, fontSize: 10 }} />
        <YAxis {...AXIS} domain={domain} tickFormatter={(v) => format(v, true)} width={52} />
        <Tooltip {...TOOLTIP} formatter={(v) => [format(v), label]} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((d) => (
            <Cell key={d.key} fill={POLICY_INFO[d.key].color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Traffic classes on the x-axis, one bar per policy. */
export function ClassGroupedBars({ results, accessor, format, height = 260 }) {
  const policies = Object.keys(results)
  const data = TRAFFIC_CLASSES.map((c) => ({
    name: c.label,
    ...Object.fromEntries(policies.map((p) => [p, accessor(results[p], c.key)])),
  }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="name" {...AXIS} interval={0} tick={{ ...AXIS.tick, fontSize: 10 }} />
        <YAxis {...AXIS} tickFormatter={(v) => format(v, true)} width={52} />
        <Tooltip {...TOOLTIP} formatter={(v, key) => [format(v), POLICY_INFO[key].label]} />
        <Legend formatter={(key) => POLICY_INFO[key].label} wrapperStyle={legendStyle} iconType="circle" iconSize={8} itemSorter={null} />
        {policies.map((p) => (
          <Bar key={p} dataKey={p} fill={POLICY_INFO[p].color} radius={[4, 4, 0, 0]} maxBarSize={22} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Queue utilisation over time. Identical series are drawn once and labelled as such. */
export function UtilisationLines({ results, identical }) {
  const policies = Object.keys(results)
  const length = results[policies[0]].utilisation_history.length
  const data = Array.from({ length }, (_, t) => ({
    t,
    ...Object.fromEntries(policies.map((p) => [p, Math.round(results[p].utilisation_history[t] * 1000) / 10])),
  }))
  const shown = identical ? [policies[0]] : policies
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 34, left: -8, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="t" {...AXIS} minTickGap={48} label={{ value: 'time step', position: 'insideBottomRight', offset: -2, fill: 'var(--color-ink-faint)', fontSize: 11 }} />
        <YAxis {...AXIS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" width={52} />
        <ReferenceLine y={50} stroke="var(--color-line-strong)" strokeDasharray="4 4" label={{ value: '50%', fill: 'var(--color-ink-faint)', fontSize: 10, position: 'right' }} />
        <ReferenceLine y={80} stroke="var(--color-line-strong)" strokeDasharray="4 4" label={{ value: '80%', fill: 'var(--color-ink-faint)', fontSize: 10, position: 'right' }} />
        <Tooltip
          {...TOOLTIP}
          labelFormatter={(t) => `Step ${t}`}
          formatter={(v, key) => [`${v}%`, identical ? 'All policies' : POLICY_INFO[key].label]}
        />
        {shown.map((p) => (
          <Line
            key={p}
            type="stepAfter"
            dataKey={p}
            stroke={identical ? 'var(--color-accent)' : POLICY_INFO[p].color}
            strokeWidth={1.4}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
