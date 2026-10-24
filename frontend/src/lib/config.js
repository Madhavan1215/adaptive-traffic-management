// Studio configuration: the single source of truth for what gets simulated.
// Flow: user input -> configReducer -> toSimulationRequest -> POST /api/simulate.
// Presets come from the backend (/api/config/defaults) so the two never drift.

import { TRAFFIC_CLASSES } from '../constants'

export const CONFIG_DEFAULTS = {
  scheduler: 'adaptive_priority',
  queue_capacity: 20,
  service_rate: 1,
  duration: 500,
  alpha: 0.5,
  seed: 42,
  drop_policy: 'tail_drop',
}

export const DEFAULT_PRESET = 'moderate'

export const LIMITS = {
  queue_capacity: { min: 5, max: 50, step: 1 },
  service_rate: { min: 1, max: 5, step: 1 },
  duration: { min: 100, max: 2000, step: 100 },
  alpha: { min: 0, max: 3, step: 0.05 },
  arrival_rate: { min: 0, max: 1, step: 0.01 },
  seed: { min: 0, max: 1_000_000 },
}

export function createInitialConfig(presets) {
  return { ...CONFIG_DEFAULTS, arrival_rates: { ...presets[DEFAULT_PRESET].arrival_rates } }
}

export function configReducer(state, action) {
  switch (action.type) {
    case 'setPreset':
      // Traffic intensity controls arrivals only; capacity and speed stay as the user set them.
      return { ...state, arrival_rates: { ...action.presets[action.preset].arrival_rates } }
    case 'setField':
      return { ...state, [action.field]: action.value }
    case 'setRate':
      return { ...state, arrival_rates: { ...state.arrival_rates, [action.trafficClass]: action.value } }
    case 'reset':
      return createInitialConfig(action.presets)
    default:
      throw new Error(`Unknown config action: ${action.type}`)
  }
}

/** The preset whose arrival rates exactly match, or 'custom' once any rate is edited. */
export function matchingPreset(arrivalRates, presets) {
  for (const [name, preset] of Object.entries(presets)) {
    const same = TRAFFIC_CLASSES.every((c) => Math.abs((arrivalRates[c.key] ?? 0) - preset.arrival_rates[c.key]) < 1e-9)
    if (same) return name
  }
  return 'custom'
}

/** Mean packets offered per step vs. packets the link can send per step. */
export function offeredLoad(config) {
  const arrivals = TRAFFIC_CLASSES.reduce((sum, c) => sum + (config.arrival_rates[c.key] ?? 0), 0)
  return { arrivals, capacity: config.service_rate, ratio: arrivals / config.service_rate }
}

export function validateConfig(config) {
  const errors = {}
  const intIn = (field, min, max, label) => {
    const v = config[field]
    if (!Number.isInteger(v) || v < min || v > max) errors[field] = `${label} must be a whole number from ${min} to ${max}.`
  }
  intIn('queue_capacity', 1, 1000, 'Queue capacity')
  intIn('service_rate', 1, 100, 'Network speed')
  intIn('duration', 1, 5000, 'Duration')
  intIn('seed', 0, LIMITS.seed.max, 'Random seed')
  if (!Number.isFinite(config.alpha) || config.alpha < 0 || config.alpha > 10) {
    errors.alpha = 'Waiting-time influence must be between 0 and 10.'
  }
  for (const c of TRAFFIC_CLASSES) {
    const r = config.arrival_rates[c.key]
    if (!Number.isFinite(r) || r < 0 || r > 1) errors.arrival_rates = `${c.label} arrival rate must be between 0 and 1.`
  }
  return errors
}

/** Always send every value explicitly, so the backend never substitutes preset values. */
export function toSimulationRequest(config) {
  return {
    scenario: 'custom',
    arrival_rates: Object.fromEntries(TRAFFIC_CLASSES.map((c) => [c.key, config.arrival_rates[c.key]])),
    queue_capacity: config.queue_capacity,
    service_rate: config.service_rate,
    duration: config.duration,
    scheduler: config.scheduler,
    alpha: config.alpha,
    seed: config.seed,
    drop_policy: config.drop_policy,
  }
}

export function sameRequest(a, b) {
  return JSON.stringify(toSimulationRequest(a)) === JSON.stringify(toSimulationRequest(b))
}
