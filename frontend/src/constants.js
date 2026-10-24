// Stable colour mapping for traffic classes, used everywhere in the app.
// Priorities mirror backend/traffic.py BASE_PRIORITY (larger = more important).
export const TRAFFIC_CLASSES = [
  { key: 'voice', label: 'Voice', short: 'Voice', priority: 5, color: '#22d3ee', hint: 'Calls — very sensitive to delay' },
  { key: 'gaming', label: 'Gaming / Control', short: 'Gaming', priority: 5, color: '#60a5fa', hint: 'Game moves and control signals — sensitive to delay' },
  { key: 'video', label: 'Video', short: 'Video', priority: 4, color: '#a78bfa', hint: 'Streaming video — needs steady delivery' },
  { key: 'normal_data', label: 'Normal Data', short: 'Data', priority: 3, color: '#34d399', hint: 'Web pages and everyday requests' },
  { key: 'file_transfer', label: 'File Transfer', short: 'Files', priority: 2, color: '#fbbf24', hint: 'Downloads — can tolerate waiting' },
  { key: 'background', label: 'Background', short: 'Bkgd', priority: 1, color: '#94a3b8', hint: 'Updates and backups — lowest priority' },
]

export const CLASS_BY_KEY = Object.fromEntries(TRAFFIC_CLASSES.map((c) => [c.key, c]))

export const SCHEDULERS = [
  {
    key: 'fifo',
    label: 'FIFO',
    tagline: 'Oldest packet first.',
    description: 'Packets leave in exactly the order they arrived. Priority is ignored.',
  },
  {
    key: 'static_priority',
    label: 'Static Priority',
    tagline: 'Highest-priority packet first.',
    description: 'The most important waiting packet always goes next; ties go to whichever arrived first. Low-priority packets can wait a very long time.',
  },
  {
    key: 'adaptive_priority',
    label: 'Adaptive Priority',
    tagline: 'Adjust priorities according to congestion and waiting time.',
    description: 'Acts like FIFO while the queue is under half full. As it fills, it favours important packets — but every packet gains priority the longer it waits, so nothing waits forever.',
  },
]

export const SCHEDULER_BY_KEY = Object.fromEntries(SCHEDULERS.map((s) => [s.key, s]))

export const PRESET_INFO = {
  light: { label: 'Light', description: "Packets arrive comfortably within the network's capacity." },
  moderate: { label: 'Moderate', description: "Traffic approaches the network's service capacity." },
  heavy: { label: 'Heavy', description: 'Packets frequently arrive faster than the network can transmit them.' },
}

export const PRESET_ORDER = ['light', 'moderate', 'heavy']

// Labels and colours for whatever is being compared in Deep Analysis.
export const POLICY_INFO = {
  fifo: { label: 'FIFO', color: '#94a3b8' },
  static_priority: { label: 'Static Priority', color: '#fbbf24' },
  adaptive_priority: { label: 'Adaptive Priority', color: '#22d3ee' },
  tail_drop: { label: 'Tail drop (baseline)', color: '#94a3b8' },
  priority_displace: { label: 'Priority displacement', color: '#a78bfa' },
}

export const DROP_POLICIES = [
  { key: 'tail_drop', label: 'Tail drop', description: 'When the queue is full, the arriving packet is dropped.' },
  {
    key: 'priority_displace',
    label: 'Priority displacement',
    description: 'When the queue is full, a more important arrival may push out the least important waiting packet.',
  },
]
