export const TRAFFIC_CLASSES = [
  { key: 'voice', label: 'Voice', priority: 5, color: '#22d3ee' },
  { key: 'gaming', label: 'Gaming / Control', priority: 5, color: '#38bdf8' },
  { key: 'video', label: 'Video', priority: 4, color: '#818cf8' },
  { key: 'normal_data', label: 'Normal Data', priority: 3, color: '#34d399' },
  { key: 'file_transfer', label: 'File Transfer', priority: 2, color: '#fbbf24' },
  { key: 'background', label: 'Background', priority: 1, color: '#64748b' },
]

export const CLASS_COLOR = Object.fromEntries(TRAFFIC_CLASSES.map((c) => [c.key, c.color]))
export const CLASS_LABEL = Object.fromEntries(TRAFFIC_CLASSES.map((c) => [c.key, c.label]))

export const SCHEDULERS = [
  { key: 'fifo', label: 'FIFO' },
  { key: 'static_priority', label: 'Static Priority' },
  { key: 'adaptive_priority', label: 'Adaptive Priority' },
]

export const SCHEDULER_LABEL = Object.fromEntries(SCHEDULERS.map((s) => [s.key, s.label]))

export const SCENARIOS = [
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'heavy', label: 'Heavy' },
  { key: 'custom', label: 'Custom' },
]
