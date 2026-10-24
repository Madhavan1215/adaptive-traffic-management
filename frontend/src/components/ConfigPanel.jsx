import { SCENARIOS, SCHEDULERS, TRAFFIC_CLASSES } from '../constants'
import Card from './Card'

export default function ConfigPanel({ config, onChange, onRun, running, scenarioPresets }) {
  const isCustom = config.scenario === 'custom'

  function set(field, value) {
    onChange({ ...config, [field]: value })
  }

  function setRate(key, value) {
    onChange({ ...config, arrival_rates: { ...config.arrival_rates, [key]: value } })
  }

  function handleScenarioChange(scenario) {
    if (scenario !== 'custom' && scenarioPresets?.[scenario]) {
      const preset = scenarioPresets[scenario]
      onChange({
        ...config,
        scenario,
        arrival_rates: preset.arrival_rates,
        queue_capacity: preset.queue_capacity,
        service_rate: preset.service_rate,
        duration: preset.duration,
      })
    } else {
      onChange({ ...config, scenario })
    }
  }

  return (
    <Card title="Configuration" subtitle="Controls the next simulation run">
      <div className="space-y-4">
        <Field label="Scenario">
          <Select value={config.scenario} onChange={handleScenarioChange} options={SCENARIOS} />
        </Field>

        <Field label="Scheduler">
          <Select value={config.scheduler} onChange={(v) => set('scheduler', v)} options={SCHEDULERS} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Queue capacity">
            <NumberInput
              value={config.queue_capacity}
              min={1}
              max={1000}
              disabled={!isCustom}
              onChange={(v) => set('queue_capacity', v)}
            />
          </Field>
          <Field label="Service rate / step">
            <NumberInput
              value={config.service_rate}
              min={1}
              max={100}
              disabled={!isCustom}
              onChange={(v) => set('service_rate', v)}
            />
          </Field>
        </div>

        <Field label="Duration (time steps)">
          <NumberInput
            value={config.duration}
            min={1}
            max={5000}
            disabled={!isCustom}
            onChange={(v) => set('duration', v)}
          />
        </Field>

        <Field label="Aging coefficient (alpha)" hint="Used by adaptive-priority scheduling only">
          <NumberInput
            value={config.alpha}
            min={0}
            max={10}
            step={0.05}
            onChange={(v) => set('alpha', v)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Random seed">
            <NumberInput value={config.seed} min={0} max={1000000} onChange={(v) => set('seed', v)} />
          </Field>
          <Field label="Drop policy">
            <Select
              value={config.drop_policy}
              onChange={(v) => set('drop_policy', v)}
              options={[
                { key: 'tail_drop', label: 'Tail drop' },
                { key: 'priority_displace', label: 'Priority displace' },
              ]}
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Arrival rate per time slot
            </span>
            {!isCustom && <span className="text-xs text-[var(--text-muted)]">from preset</span>}
          </div>
          <div className="space-y-2">
            {TRAFFIC_CLASSES.map((tc) => (
              <div key={tc.key} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: tc.color }}
                />
                <span className="w-32 shrink-0 text-xs text-[var(--text-secondary)]">{tc.label}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={config.arrival_rates[tc.key] ?? 0}
                  disabled={!isCustom}
                  onChange={(e) => setRate(tc.key, Number(e.target.value))}
                  className="flex-1 accent-[var(--accent)] disabled:opacity-40"
                />
                <span className="w-10 shrink-0 text-right text-xs text-[var(--text-muted)]">
                  {(config.arrival_rates[tc.key] ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[#06131c] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? 'Running simulation…' : 'Run simulation'}
        </button>
      </div>
    </Card>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{hint}</span>}
    </label>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-panel-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
    >
      {options.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function NumberInput({ value, onChange, min, max, step = 1, disabled = false }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-panel-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-40"
    />
  )
}
