export const AXIS = {
  stroke: 'var(--color-line-strong)',
  tick: { fill: 'var(--color-ink-faint)', fontSize: 11 },
  tickLine: false,
}

export const GRID = { stroke: 'var(--color-line)', strokeDasharray: '3 4', vertical: false }

export const TOOLTIP = {
  contentStyle: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-line-strong)',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 12px 30px -12px rgba(0,0,0,0.6)',
  },
  labelStyle: { color: 'var(--color-ink-muted)', marginBottom: 4 },
  itemStyle: { color: 'var(--color-ink)' },
  cursor: { fill: 'rgba(148,163,184,0.06)' },
}
