import { useId } from 'react'
import Icon from './Icon'

const ALIGN = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
}

/** Hover/focus tooltip bubble. Content is also exposed to screen readers via aria-describedby. */
export function Tooltip({ content, children, align = 'center', className = '' }) {
  const id = useId()
  return (
    <span className={`group/tip relative inline-flex ${className}`} aria-describedby={id}>
      {children}
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute bottom-full z-50 mb-2 w-max max-w-64 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-left text-xs leading-relaxed font-normal normal-case tracking-normal text-ink-muted opacity-0 shadow-xl shadow-black/40 transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ${ALIGN[align]}`}
      >
        {content}
      </span>
    </span>
  )
}

/** Small (i) button explaining a term. */
export function InfoTip({ label, children, align = 'center' }) {
  return (
    <Tooltip content={children} align={align}>
      <button
        type="button"
        aria-label={`What is ${label}?`}
        className="inline-flex rounded-full text-ink-faint transition-colors hover:text-accent focus-visible:text-accent"
      >
        <Icon name="info" size={15} />
      </button>
    </Tooltip>
  )
}
