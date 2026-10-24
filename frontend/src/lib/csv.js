// Builds a CSV from a real /api/compare response. One row per compared
// policy; the experiment configuration is repeated on every row so each
// row is reproducible on its own.

import { TRAFFIC_CLASSES } from '../constants'
import { dropsByClass } from './format'

function cell(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildComparisonCsv(response) {
  const { mode, config, results } = response
  const classColumns = TRAFFIC_CLASSES.flatMap((c) => [
    `loss_pct_${c.key}`,
    `avg_delay_${c.key}`,
    `max_delay_${c.key}`,
    `dropped_${c.key}`,
    `throughput_${c.key}`,
  ])
  const header = [
    'mode', 'scenario', 'seed', 'alpha', 'queue_capacity', 'service_rate', 'duration', 'policy',
    'packets_generated', 'packets_delivered', 'packets_dropped', 'packet_loss_pct', 'avg_queueing_delay',
    'throughput', 'avg_queue_utilisation_pct', 'max_queue_utilisation_pct', 'jains_fairness_index',
    ...classColumns,
  ]

  const rows = Object.entries(results).map(([policy, r]) => {
    const drops = dropsByClass(r.drop_reason_counts)
    return [
      mode, config.scenario, config.seed, config.alpha, config.queue_capacity, config.service_rate, config.duration, policy,
      r.packets_generated, r.packets_delivered, r.packets_dropped, r.packet_loss_rate, r.average_queueing_delay,
      r.throughput, r.queue_utilisation.average, r.queue_utilisation.maximum, r.fairness_index,
      ...TRAFFIC_CLASSES.flatMap((c) => [
        r.packet_loss_rate_by_class[c.key],
        r.average_queueing_delay_by_class[c.key],
        r.max_delay_by_class[c.key],
        drops[c.key] ?? 0,
        r.throughput_by_class[c.key],
      ]),
    ]
  })

  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n'
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
