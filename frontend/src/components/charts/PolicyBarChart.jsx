import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../Card'

const POLICY_COLOR = {
  fifo: '#64748b',
  static_priority: '#fbbf24',
  adaptive_priority: '#22d3ee',
  tail_drop: '#64748b',
  priority_displace: '#22d3ee',
}

export default function PolicyBarChart({ title, subtitle, data, unit = '' }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit={unit} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-panel-alt)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            formatter={(v) => [`${v}${unit}`, title]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={POLICY_COLOR[d.key] || '#38bdf8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
