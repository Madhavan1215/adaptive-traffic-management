import { motion } from 'motion/react'

export default function MetricCards({ summary }) {
  if (!summary) return null

  const cards = [
    { label: 'Packets generated', value: summary.packets_generated, format: 'int' },
    { label: 'Packets delivered', value: summary.packets_delivered, format: 'int' },
    { label: 'Packets dropped', value: summary.packets_dropped, format: 'int' },
    { label: 'Packet loss rate', value: summary.packet_loss_rate, format: 'pct' },
    { label: 'Avg. queueing delay', value: summary.average_queueing_delay, format: 'steps' },
    { label: 'Throughput', value: summary.throughput, format: 'rate' },
    { label: 'Avg. queue utilisation', value: summary.queue_utilisation.average, format: 'pct' },
    { label: "Jain's fairness index", value: summary.fairness_index, format: 'fixed3' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.03 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4"
        >
          <p className="text-xs text-[var(--text-muted)]">{card.label}</p>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            {formatValue(card.value, card.format)}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

function formatValue(value, format) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  switch (format) {
    case 'int':
      return value.toLocaleString()
    case 'pct':
      return `${value.toFixed(2)}%`
    case 'steps':
      return `${value.toFixed(2)} steps`
    case 'rate':
      return `${value.toFixed(3)} pkt/step`
    case 'fixed3':
      return value.toFixed(3)
    default:
      return value
  }
}
