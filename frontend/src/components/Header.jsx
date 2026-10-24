import { motion } from 'motion/react'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'compare', label: 'Compare' },
  { key: 'viva', label: 'Viva Guide' },
]

export default function Header({ activeTab, onTabChange, status, onReset }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              Adaptive Traffic Management Simulator
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Comparing FIFO, static-priority, and adaptive-priority scheduling under finite-buffer
              congestion — a simulation, not a live network.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={status} />
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-[var(--border-light)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Reset
            </button>
          </div>
        </div>

        <nav className="mt-4 flex gap-1 border-b border-transparent">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`relative px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--accent)]"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function StatusPill({ status }) {
  const styles = {
    idle: { dot: 'bg-[var(--text-muted)]', text: 'Idle' },
    running: { dot: 'bg-[var(--warning)] animate-pulse', text: 'Running…' },
    done: { dot: 'bg-[var(--success)]', text: 'Complete' },
    error: { dot: 'bg-[var(--danger)]', text: 'Error' },
  }
  const s = styles[status] || styles.idle
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border-light)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.text}
    </div>
  )
}
