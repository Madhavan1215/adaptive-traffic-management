import { useId } from 'react'
import { InfoTip } from './Tooltip'

/** Controlled range input: the thumb, the displayed value and the submitted value all come from `value`. */
export default function Slider({ label, value, min, max, step = 1, onChange, format = String, hint, info, accent }) {
  const id = useId()
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100
  const style = { '--fill': `${fill}%` }
  if (accent) style['--color-accent'] = accent

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {label}
          </label>
          {info && <InfoTip label={label}>{info}</InfoTip>}
        </span>
        <output htmlFor={id} className="shrink-0 whitespace-nowrap font-mono text-sm tabular-nums text-accent" style={accent ? { color: accent } : undefined}>
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        style={style}
      />
      {hint && <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  )
}
