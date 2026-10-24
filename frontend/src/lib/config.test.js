import { describe, expect, it } from 'vitest'
import defaults from './__fixtures__/defaults.json'
import {
  configReducer,
  createInitialConfig,
  matchingPreset,
  offeredLoad,
  sameRequest,
  toSimulationRequest,
  validateConfig,
} from './config'

const presets = defaults.scenarios

describe('Studio configuration', () => {
  it('starts on the moderate preset with backend-provided rates', () => {
    const config = createInitialConfig(presets)
    expect(config.arrival_rates).toEqual(presets.moderate.arrival_rates)
    expect(matchingPreset(config.arrival_rates, presets)).toBe('moderate')
  })

  it('selecting a preset changes the actual arrival rates', () => {
    const config = configReducer(createInitialConfig(presets), { type: 'setPreset', preset: 'heavy', presets })
    expect(config.arrival_rates).toEqual(presets.heavy.arrival_rates)
    expect(toSimulationRequest(config).arrival_rates).toEqual(presets.heavy.arrival_rates)
  })

  it('selecting a preset keeps the user-chosen capacity and speed', () => {
    let config = createInitialConfig(presets)
    config = configReducer(config, { type: 'setField', field: 'queue_capacity', value: 35 })
    config = configReducer(config, { type: 'setPreset', preset: 'light', presets })
    expect(config.queue_capacity).toBe(35)
  })

  it('editing one arrival rate turns the preset label into custom, and back', () => {
    let config = createInitialConfig(presets)
    config = configReducer(config, { type: 'setRate', trafficClass: 'voice', value: 0.9 })
    expect(matchingPreset(config.arrival_rates, presets)).toBe('custom')
    config = configReducer(config, { type: 'setRate', trafficClass: 'voice', value: presets.moderate.arrival_rates.voice })
    expect(matchingPreset(config.arrival_rates, presets)).toBe('moderate')
  })

  it('sends every value explicitly as a custom scenario', () => {
    let config = createInitialConfig(presets)
    config = configReducer(config, { type: 'setField', field: 'service_rate', value: 3 })
    config = configReducer(config, { type: 'setField', field: 'scheduler', value: 'fifo' })
    const request = toSimulationRequest(config)
    expect(request.scenario).toBe('custom')
    expect(request.service_rate).toBe(3)
    expect(request.scheduler).toBe('fifo')
    expect(Object.keys(request.arrival_rates)).toHaveLength(6)
  })

  it('reset restores the documented initial state', () => {
    let config = createInitialConfig(presets)
    config = configReducer(config, { type: 'setField', field: 'seed', value: 7 })
    config = configReducer(config, { type: 'setRate', trafficClass: 'video', value: 0 })
    expect(configReducer(config, { type: 'reset', presets })).toEqual(createInitialConfig(presets))
  })

  it('detects when the configuration differs from the last run', () => {
    const a = createInitialConfig(presets)
    expect(sameRequest(a, { ...a })).toBe(true)
    expect(sameRequest(a, configReducer(a, { type: 'setField', field: 'queue_capacity', value: 21 }))).toBe(false)
  })

  it('computes offered load relative to network speed', () => {
    const config = configReducer(createInitialConfig(presets), { type: 'setPreset', preset: 'heavy', presets })
    const load = offeredLoad({ ...config, service_rate: 2 })
    expect(load.arrivals).toBeCloseTo(1.55)
    expect(load.ratio).toBeCloseTo(0.775)
  })

  it('validates ranges before calling the API', () => {
    const config = createInitialConfig(presets)
    expect(validateConfig(config)).toEqual({})
    expect(validateConfig({ ...config, queue_capacity: 0 })).toHaveProperty('queue_capacity')
    expect(validateConfig({ ...config, seed: 1.5 })).toHaveProperty('seed')
    expect(validateConfig({ ...config, alpha: Number.NaN })).toHaveProperty('alpha')
    expect(validateConfig({ ...config, arrival_rates: { ...config.arrival_rates, voice: 2 } })).toHaveProperty('arrival_rates')
  })
})
