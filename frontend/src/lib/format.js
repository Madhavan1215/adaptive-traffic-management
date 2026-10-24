export function fixed(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

export function pct(value, digits = 1) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}%` : '—'
}

export function steps(value, digits = 1) {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)} ${Math.abs(value - 1) < 1e-9 ? 'step' : 'steps'}`
}

export function count(value) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString() : '—'
}

/** Packets dropped per traffic class, summed over all drop reasons. */
export function dropsByClass(dropReasonCounts = {}) {
  const totals = {}
  for (const [key, n] of Object.entries(dropReasonCounts)) {
    const [trafficClass] = key.split(':')
    totals[trafficClass] = (totals[trafficClass] || 0) + n
  }
  return totals
}

export function displacedCount(dropReasonCounts = {}) {
  return Object.entries(dropReasonCounts)
    .filter(([key]) => key.endsWith(':displaced'))
    .reduce((sum, [, n]) => sum + n, 0)
}
