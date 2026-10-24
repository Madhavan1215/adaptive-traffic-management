import { useCallback, useEffect, useReducer, useState } from 'react'
import { getDefaults, runComparison, runSimulation } from '../api/client'
import { configReducer, toSimulationRequest, validateConfig } from '../lib/config'

const LOADING = { status: 'loading', presets: null, error: null }

function fetchDefaults(setState) {
  return getDefaults()
    .then((data) => setState({ status: 'ready', presets: data.scenarios, error: null }))
    .catch((err) => setState({ status: 'error', presets: null, error: err.message }))
}

/** Loads scenario presets from the backend once; exposes a retry for when the server was down. */
export function useBackendDefaults() {
  const [state, setState] = useState(LOADING)

  useEffect(() => {
    fetchDefaults(setState)
  }, [])

  const retry = useCallback(() => {
    setState(LOADING)
    fetchDefaults(setState)
  }, [])

  return { ...state, retry }
}

const IDLE_RUN = { status: 'idle', error: null, result: null, ranConfig: null, elapsedMs: null }

export function useStudio(presets) {
  const [config, dispatch] = useReducer(configReducer, null)
  const [run, setRun] = useState(IDLE_RUN)

  useEffect(() => {
    if (presets && config === null) dispatch({ type: 'reset', presets })
  }, [presets, config])

  const start = useCallback(async () => {
    const errors = validateConfig(config)
    if (Object.keys(errors).length > 0) {
      setRun((r) => ({ ...r, status: 'error', error: Object.values(errors)[0] }))
      return
    }
    const submitted = config
    setRun((r) => ({ ...r, status: 'running', error: null }))
    const startedAt = performance.now()
    try {
      const result = await runSimulation(toSimulationRequest(submitted))
      setRun((r) => ({
        status: 'done',
        error: null,
        result,
        ranConfig: submitted,
        elapsedMs: performance.now() - startedAt,
        runId: (r.runId ?? 0) + 1,
      }))
    } catch (err) {
      // Keep the previous result visible; never substitute fallback numbers.
      setRun((r) => ({ ...r, status: 'error', error: err.message }))
    }
  }, [config])

  const reset = useCallback(() => {
    dispatch({ type: 'reset', presets })
    setRun(IDLE_RUN)
  }, [presets])

  return { config, dispatch, run, start, reset }
}

export const ANALYSIS_DEFAULTS = { mode: 'scheduling_only', scenario: 'heavy', seed: 42, alpha: 0.5 }

export function useAnalysis() {
  const [controls, setControls] = useState(ANALYSIS_DEFAULTS)
  const [run, setRun] = useState({ status: 'idle', error: null, response: null, ranControls: null })

  const start = useCallback(async () => {
    if (!Number.isInteger(controls.seed) || controls.seed < 0) {
      setRun((r) => ({ ...r, status: 'error', error: 'Random seed must be a whole number of 0 or more.' }))
      return
    }
    const submitted = controls
    setRun((r) => ({ ...r, status: 'running', error: null }))
    try {
      const response = await runComparison(submitted)
      setRun({ status: 'done', error: null, response, ranControls: submitted })
    } catch (err) {
      setRun((r) => ({ ...r, status: 'error', error: err.message }))
    }
  }, [controls])

  return { controls, setControls, run, start }
}
