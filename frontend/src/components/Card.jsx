export default function Card({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-5 ${className}`}
    >
      {title && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
