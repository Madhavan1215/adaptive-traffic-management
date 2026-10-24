import { motion } from 'motion/react'
import Icon from './Icon'

const LINKS = [
  { key: 'home', label: 'Home' },
  { key: 'studio', label: 'Studio' },
  { key: 'analysis', label: 'Deep Analysis' },
]

export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#0c1220" stroke="url(#logo-g)" strokeWidth="1.5" />
      <rect x="7" y="11" width="4" height="10" rx="2" fill="#94a3b8" />
      <rect x="13" y="11" width="4" height="10" rx="2" fill="#a78bfa" />
      <rect x="19" y="11" width="4" height="10" rx="2" fill="#22d3ee" />
      <path d="M25 16h3" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function NavBar({ route }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#/home" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Adaptive Traffic Management — home">
          <Logo />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">Adaptive Traffic</span>
        </a>
        <nav aria-label="Main">
          <ul className="flex items-center gap-0.5 rounded-full border border-line bg-surface/80 p-1">
            {LINKS.map((link) => {
              const active = link.key === route
              return (
                <li key={link.key}>
                  <a
                    href={`#/${link.key}`}
                    aria-current={active ? 'page' : undefined}
                    className={`relative block rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                      active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-line-strong"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                      />
                    )}
                    <span className="relative">{link.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
        <span className="hidden font-mono text-[11px] text-ink-faint lg:inline">discrete-time simulation</span>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Adaptive Traffic Management Simulator — Computer Networks course project.</span>
        <span>A discrete-time simulation. It does not capture or change real network traffic.</span>
      </div>
    </footer>
  )
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {children && <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{children}</p>}
    </div>
  )
}

export function Notice({ tone = 'neutral', icon = 'info', children, action }) {
  const tones = {
    neutral: 'border-line-strong bg-surface-2 text-ink-muted',
    warn: 'border-warn/40 bg-warn/10 text-warn',
    error: 'border-bad/40 bg-bad/10 text-bad',
    good: 'border-good/40 bg-good/10 text-good',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <Icon name={icon} size={17} className="mt-0.5 shrink-0" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {action}
    </div>
  )
}
