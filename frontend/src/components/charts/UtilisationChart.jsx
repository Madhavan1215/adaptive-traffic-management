import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../Card'

export default function UtilisationChart({ history }) {
  const data = (history || []).map(([t, u]) => ({ t, utilisation: Math.round(u * 1000) / 10 }))

  return (
    <Card title="Queue utilisation over time" subtitle="Queued packets / capacity, per time step">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            label={{ value: 'time step', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-muted)' }}
          />
          <YAxis
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            domain={[0, 100]}
            unit="%"
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-panel-alt)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            formatter={(v) => [`${v}%`, 'Utilisation']}
            labelFormatter={(t) => `t = ${t}`}
          />
          <Line type="monotone" dataKey="utilisation" stroke="var(--accent)" strokeWidth={1.75} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
