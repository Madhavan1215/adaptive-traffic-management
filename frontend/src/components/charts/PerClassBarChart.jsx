import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CLASS_COLOR, TRAFFIC_CLASSES } from '../../constants'
import Card from '../Card'

/** Generic per-traffic-class bar chart, reused for delay-by-class and
 * drops-by-class -- both are "one number per class" views. */
export default function PerClassBarChart({ title, subtitle, valuesByClass, valueLabel, unit = '' }) {
  const data = TRAFFIC_CLASSES.map((tc) => ({
    key: tc.key,
    label: tc.label,
    value: valuesByClass?.[tc.key] ?? 0,
  }))

  return (
    <Card title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit={unit} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-panel-alt)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            formatter={(v) => [`${v}${unit}`, valueLabel]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={CLASS_COLOR[d.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
