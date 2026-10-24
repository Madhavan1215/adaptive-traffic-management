// Fixtures are real responses captured from the backend (seed 42).
import { describe, expect, it } from 'vitest'
import compareAHeavy from './__fixtures__/compare_a_heavy.json'
import compareALight from './__fixtures__/compare_a_light.json'
import compareBHeavy from './__fixtures__/compare_b_heavy.json'
import simHeavy from './__fixtures__/simulate_heavy_static.json'
import simLight from './__fixtures__/simulate_light_static.json'
import { analysisInsights, studioInsights } from './insights'

const texts = (items) => items.map((i) => i.text).join('\n')

describe('studioInsights', () => {
  it('describes a light run as uncongested with no drops', () => {
    const t = texts(studioInsights(simLight.summary))
    expect(simLight.summary.packets_dropped).toBe(0)
    expect(t).toContain('No packets were dropped')
    expect(t).not.toContain('nearly full')
  })

  it('reports the real drop count and loss rate for a heavy run', () => {
    const s = simHeavy.summary
    const t = texts(studioInsights(s))
    expect(s.packets_dropped).toBeGreaterThan(0)
    expect(t).toContain(`${s.packets_dropped.toLocaleString()} packets (${s.packet_loss_rate.toFixed(1)}%)`)
  })

  it('only says voice waited less when the data shows it', () => {
    const s = simHeavy.summary
    const t = texts(studioInsights(s))
    expect(s.average_queueing_delay_by_class.voice).toBeLessThan(s.average_queueing_delay_by_class.background)
    expect(t).toContain('Voice packets waited less than background packets')
  })

  it('handles zero traffic without inventing metrics', () => {
    const empty = { ...simLight.summary, packets_generated: 0 }
    expect(texts(studioInsights(empty))).toContain('No packets were generated')
  })
})

describe('analysisInsights — scheduling only', () => {
  const t = texts(analysisInsights(compareAHeavy))

  it('explains identical loss by the shared admission rule', () => {
    const losses = Object.values(compareAHeavy.results).map((r) => r.packet_loss_rate)
    expect(new Set(losses).size).toBe(1)
    expect(t).toContain('Overall packet loss is identical')
  })

  it('notes identical occupancy over time', () => {
    expect(t).toContain('Queue occupancy over time is identical')
  })

  it('names the static-priority trade-off with the real delays', () => {
    const bg = compareAHeavy.results.static_priority.average_queueing_delay_by_class.background
    expect(t).toContain('Static priority cut average voice waiting')
    expect(t).toContain(bg.toFixed(1))
  })

  it('reports worst-case background waits from max_delay_by_class', () => {
    const sp = compareAHeavy.results.static_priority.max_delay_by_class.background
    const ap = compareAHeavy.results.adaptive_priority.max_delay_by_class.background
    expect(t).toContain(`${sp} steps under static priority versus ${ap} steps under adaptive`)
  })

  it('does not claim a trade-off or starvation when there is no congestion', () => {
    const light = texts(analysisInsights(compareALight))
    expect(light).toContain('No packets were dropped under any policy')
    expect(light).not.toContain('trade-off')
    expect(light).not.toContain('starvation')
  })
})

describe('analysisInsights — congestion protection', () => {
  const t = texts(analysisInsights(compareBHeavy))

  it('says overall loss is unchanged only when it is', () => {
    const { tail_drop, priority_displace } = compareBHeavy.results
    expect(tail_drop.packet_loss_rate).toBe(priority_displace.packet_loss_rate)
    expect(t).toContain('Overall loss is unchanged')
  })

  it('makes the per-class trade-off visible', () => {
    expect(t).toContain('rose for')
    expect(t).toContain('Background')
  })
})
