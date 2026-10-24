// Plain-language explanations generated ONLY from returned simulation data.
// Every sentence is conditional on the numbers; nothing claims an algorithm
// is better in general.

import { CLASS_BY_KEY, POLICY_INFO, TRAFFIC_CLASSES } from '../constants'
import { count, displacedCount, fixed, pct, steps } from './format'

const EPS = 1e-9

function meaningfullyLess(smaller, larger) {
  return larger - smaller >= Math.max(1, 0.2 * Math.abs(larger))
}

export function studioInsights(summary) {
  if (!summary) return []
  if (summary.packets_generated === 0) {
    return [{ tone: 'neutral', text: 'No packets were generated — every arrival rate is zero, so there was nothing to schedule.' }]
  }
  const out = []
  const { average: avgUtil, maximum: maxUtil } = summary.queue_utilisation

  if (maxUtil < 50) {
    out.push({ tone: 'good', text: `The queue never got more than half full (peak ${pct(maxUtil, 0)}), so there was little congestion.` })
  } else if (avgUtil >= 80) {
    out.push({ tone: 'warn', text: `Heavy traffic kept the queue nearly full — ${pct(avgUtil, 0)} occupied on average.` })
  } else {
    out.push({ tone: 'neutral', text: `The queue was ${pct(avgUtil, 0)} full on average and peaked at ${pct(maxUtil, 0)}.` })
  }

  if (summary.packets_dropped === 0) {
    out.push({ tone: 'good', text: 'No packets were dropped: there was always room in the queue.' })
  } else {
    let text = `${count(summary.packets_dropped)} packets (${pct(summary.packet_loss_rate)}) were dropped because the queue was full.`
    const displaced = displacedCount(summary.drop_reason_counts)
    if (displaced > 0) {
      text += ` ${count(displaced)} of them were already waiting and were pushed out to make room for more important arrivals.`
    }
    const [worstKey, worstLoss] = Object.entries(summary.packet_loss_rate_by_class).reduce((a, b) => (b[1] > a[1] ? b : a))
    if (worstLoss > 0) text += ` ${CLASS_BY_KEY[worstKey].label} lost the largest share (${pct(worstLoss)}).`
    out.push({ tone: 'warn', text })
  }

  const delivered = summary.throughput_by_class
  if (delivered.voice > 0 && delivered.background > 0) {
    const v = summary.average_queueing_delay_by_class.voice
    const b = summary.average_queueing_delay_by_class.background
    if (Math.abs(v - b) < Math.max(1, 0.2 * Math.max(v, b))) {
      out.push({ tone: 'neutral', text: `Voice and background packets waited about the same time (${steps(v)} vs ${steps(b)}), so neither was clearly favoured.` })
    } else if (v < b) {
      out.push({ tone: 'neutral', text: `Voice packets waited less than background packets (${steps(v)} vs ${steps(b)} on average).` })
    } else {
      out.push({ tone: 'neutral', text: `Background packets waited less than voice packets (${steps(b)} vs ${steps(v)} on average).` })
    }
  }
  return out
}

export function analysisInsights(response) {
  if (!response) return []
  const results = response.results
  const first = Object.values(results)[0]
  if (first.packets_generated === 0) {
    return [{ tone: 'neutral', text: 'No packets were generated in this scenario, so there is nothing to compare.' }]
  }
  return response.mode === 'scheduling_only' ? schedulingInsights(results) : protectionInsights(results)
}

function sameHistory(results) {
  const histories = Object.values(results).map((r) => r.utilisation_history)
  if (histories.some((h) => !Array.isArray(h))) return false
  return histories.every((h) => h.length === histories[0].length && h.every((u, i) => Math.abs(u - histories[0][i]) < EPS))
}

function schedulingInsights(results) {
  const out = []
  const names = Object.keys(results)
  const losses = names.map((n) => results[n].packet_loss_rate)

  if (losses.every((l) => Math.abs(l - losses[0]) < EPS)) {
    if (losses[0] === 0) {
      out.push({ tone: 'good', text: 'No packets were dropped under any policy — the queue never overflowed in this scenario.' })
    } else {
      out.push({
        tone: 'neutral',
        text: `Overall packet loss is identical (${pct(losses[0], 2)}) for all three policies. They shared the same arrivals, buffer size and tail-drop rule, so the same packets were turned away — scheduling decides who waits, not who gets in.`,
      })
    }
  } else {
    out.push({ tone: 'neutral', text: `Overall loss differs: ${names.map((n) => `${POLICY_INFO[n].label} ${pct(results[n].packet_loss_rate, 2)}`).join(', ')}.` })
  }

  if (sameHistory(results)) {
    out.push({
      tone: 'neutral',
      text: 'Queue occupancy over time is identical for every policy: each step sends the same number of packets, and scheduling only changes which packet goes.',
    })
  }

  const fifo = results.fifo
  const sp = results.static_priority
  const ap = results.adaptive_priority
  if (fifo && sp && ap) {
    const delay = (r, c) => r.average_queueing_delay_by_class[c]
    if (meaningfullyLess(delay(sp, 'voice'), delay(fifo, 'voice')) && meaningfullyLess(delay(fifo, 'background'), delay(sp, 'background'))) {
      out.push({
        tone: 'warn',
        text: `Static priority cut average voice waiting from ${steps(delay(fifo, 'voice'))} to ${steps(delay(sp, 'voice'))}, but background waiting rose from ${steps(delay(fifo, 'background'))} to ${steps(delay(sp, 'background'))} — the trade-off between priority and fairness.`,
      })
    } else if (!meaningfullyLess(delay(sp, 'voice'), delay(fifo, 'voice'))) {
      out.push({ tone: 'neutral', text: 'Static priority and FIFO gave voice traffic similar waiting times here — with little queueing there is rarely a choice to make.' })
    }

    const spWorst = sp.max_delay_by_class.background
    const apWorst = ap.max_delay_by_class.background
    if (spWorst - apWorst >= 5 && spWorst >= 1.5 * apWorst) {
      let text = `The longest any background packet waited was ${steps(spWorst, 0)} under static priority versus ${steps(apWorst, 0)} under adaptive priority: waiting-time aging limits starvation.`
      if (delay(ap, 'voice') - delay(sp, 'voice') >= 0.5) {
        text += ` In exchange, voice waited longer under adaptive than under static priority (${steps(delay(ap, 'voice'))} vs ${steps(delay(sp, 'voice'))}).`
      }
      out.push({ tone: 'good', text })
    }
  }

  out.push(fairnessInsight(results))
  return out
}

function fairnessInsight(results) {
  const entries = Object.entries(results).map(([n, r]) => [n, r.fairness_index])
  const lo = entries.reduce((a, b) => (b[1] < a[1] ? b : a))
  const hi = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
  if (hi[1] - lo[1] < 0.005) {
    return { tone: 'neutral', text: `Jain's fairness index is almost the same for every policy (about ${fixed(hi[1], 3)}).` }
  }
  return {
    tone: 'neutral',
    text: `Jain's fairness index ranges from ${fixed(lo[1], 3)} (${POLICY_INFO[lo[0]].label}) to ${fixed(hi[1], 3)} (${POLICY_INFO[hi[0]].label}). Higher means throughput was spread more evenly across classes — not automatically better, since prioritisation deliberately treats classes differently.`,
  }
}

function protectionInsights(results) {
  const out = []
  const base = results.tail_drop
  const prot = results.priority_displace

  if (Math.abs(base.packet_loss_rate - prot.packet_loss_rate) < EPS) {
    if (base.packet_loss_rate === 0) {
      return [{ tone: 'good', text: 'No packets were dropped under either buffer policy — the queue never filled, so displacement never triggered.' }]
    }
    out.push({
      tone: 'neutral',
      text: `Overall loss is unchanged (${pct(base.packet_loss_rate, 2)}): displacement chooses which packet is dropped, it does not create room for more.`,
    })
  } else {
    out.push({ tone: 'neutral', text: `Overall loss changed from ${pct(base.packet_loss_rate, 2)} to ${pct(prot.packet_loss_rate, 2)}.` })
  }

  const displaced = displacedCount(prot.drop_reason_counts)
  if (displaced > 0) {
    out.push({ tone: 'neutral', text: `${count(displaced)} packets that were already queued were pushed out to admit more important arrivals.` })
  }

  const describe = (c) => `${c.label} (${pct(base.packet_loss_rate_by_class[c.key])} → ${pct(prot.packet_loss_rate_by_class[c.key])})`
  const change = (c) => prot.packet_loss_rate_by_class[c.key] - base.packet_loss_rate_by_class[c.key]
  const better = TRAFFIC_CLASSES.filter((c) => change(c) < -0.05)
  const worse = TRAFFIC_CLASSES.filter((c) => change(c) > 0.05)
  if (better.length || worse.length) {
    const parts = []
    if (better.length) parts.push(`fell for ${better.map(describe).join(', ')}`)
    if (worse.length) parts.push(`rose for ${worse.map(describe).join(', ')}`)
    out.push({
      tone: 'warn',
      text: `Per-class loss ${parts.join(' and ')}. Protecting some traffic classes comes at the expense of others.`,
    })
  } else {
    out.push({ tone: 'neutral', text: 'Per-class loss did not change noticeably in this run.' })
  }

  if (base.packet_loss_rate_by_class.voice === 0 && prot.packet_loss_rate_by_class.voice === 0) {
    out.push({ tone: 'neutral', text: 'Voice already had 0% loss with tail drop, so displacement could not improve it any further.' })
  }
  return out
}
