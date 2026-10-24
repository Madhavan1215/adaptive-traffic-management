import { describe, expect, it } from 'vitest'
import compareAHeavy from './__fixtures__/compare_a_heavy.json'
import compareBHeavy from './__fixtures__/compare_b_heavy.json'
import { buildComparisonCsv } from './csv'

function parse(csv) {
  const [header, ...rows] = csv.trim().split('\n').map((line) => line.split(','))
  return rows.map((row) => Object.fromEntries(header.map((h, i) => [h, row[i]])))
}

describe('buildComparisonCsv', () => {
  it('writes one row per policy with the real metrics', () => {
    const rows = parse(buildComparisonCsv(compareAHeavy))
    expect(rows.map((r) => r.policy)).toEqual(['fifo', 'static_priority', 'adaptive_priority'])
    for (const row of rows) {
      const r = compareAHeavy.results[row.policy]
      expect(Number(row.packet_loss_pct)).toBe(r.packet_loss_rate)
      expect(Number(row.avg_queueing_delay)).toBe(r.average_queueing_delay)
      expect(Number(row.jains_fairness_index)).toBe(r.fairness_index)
      expect(Number(row.avg_delay_background)).toBe(r.average_queueing_delay_by_class.background)
    }
  })

  it('repeats the reproducible configuration on every row', () => {
    for (const row of parse(buildComparisonCsv(compareBHeavy))) {
      expect(row.mode).toBe('congestion_protection')
      expect(row.seed).toBe('42')
      expect(row.queue_capacity).toBe(String(compareBHeavy.config.queue_capacity))
    }
  })

  it('sums per-class drops across drop reasons', () => {
    const rows = parse(buildComparisonCsv(compareBHeavy))
    const displace = rows.find((r) => r.policy === 'priority_displace')
    const counts = compareBHeavy.results.priority_displace.drop_reason_counts
    const expected = (counts['background:buffer_full'] ?? 0) + (counts['background:displaced'] ?? 0)
    expect(Number(displace.dropped_background)).toBe(expected)
  })
})
