import { useEffect, useRef } from 'react'
import { Notice, PageHeader } from '../components/Layout'
import QueueReplay from '../components/studio/QueueReplay'
import ResultSummary from '../components/studio/ResultSummary'
import StudioControls from '../components/studio/StudioControls'
import { PRESET_INFO, SCHEDULER_BY_KEY } from '../constants'
import { matchingPreset, sameRequest } from '../lib/config'

export default function Studio({ backend, studio, onNavigate }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Studio" title="Simulation Studio">
        Choose how busy the network is and how the next packet gets picked. Then run the simulation and watch the queue.
      </PageHeader>
      <StudioBody backend={backend} studio={studio} onNavigate={onNavigate} />
    </div>
  )
}

function StudioBody({ backend, studio, onNavigate }) {
  const stageRef = useRef(null)
  const runId = studio.run.runId

  // On narrow screens the results sit below the settings; bring them into view after each run.
  useEffect(() => {
    if (runId && window.matchMedia('(max-width: 1023px)').matches) {
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [runId])

  if (backend.status === 'loading' || (backend.status === 'ready' && !studio.config)) {
    return <div className="surface h-96 animate-pulse" aria-label="Loading simulator settings" />
  }
  if (backend.status === 'error') {
    return (
      <Notice
        tone="error"
        icon="alert"
        action={
          <button type="button" className="btn btn-secondary !py-1.5" onClick={backend.retry}>
            Retry
          </button>
        }
      >
        {backend.error}
      </Notice>
    )
  }

  const { config, dispatch, run, start, reset } = studio
  const presetName = matchingPreset(run.ranConfig?.arrival_rates ?? config.arrival_rates, backend.presets)
  const stale = run.result && !sameRequest(config, run.ranConfig)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <StudioControls config={config} dispatch={dispatch} presets={backend.presets} onRun={start} onReset={reset} running={run.status === 'running'} />

      <div ref={stageRef} className="min-w-0 scroll-mt-20 space-y-5">
        {run.status === 'running' && (
          <Notice icon="spark">Simulating {config.duration} steps on the server…</Notice>
        )}
        {run.status === 'error' && (
          <Notice tone="error" icon="alert">
            {run.error}
            {run.result && ' The results below are from your previous run.'}
          </Notice>
        )}
        {run.status === 'done' && stale && (
          <Notice
            tone="warn"
            icon="alert"
            action={
              <button type="button" className="btn btn-secondary !py-1.5" onClick={start}>
                Run again
              </button>
            }
          >
            Settings changed — the results below are from your previous run.
          </Notice>
        )}
        {run.status === 'done' && !stale && (
          <Notice tone="good" icon="check">
            Simulation complete: {run.ranConfig.duration} steps computed in {Math.max(1, Math.round(run.elapsedMs))} ms ·{' '}
            {SCHEDULER_BY_KEY[run.ranConfig.scheduler].label}, {presetName === 'custom' ? 'custom' : PRESET_INFO[presetName].label.toLowerCase()} traffic.
          </Notice>
        )}

        <QueueReplay
          key={run.result ? `run-${run.runId}` : 'preview'}
          result={run.result}
          ranConfig={run.ranConfig}
          elapsedMs={run.elapsedMs}
          previewCapacity={config.queue_capacity}
        />

        {run.result && <ResultSummary result={run.result} ranConfig={run.ranConfig} onNavigate={onNavigate} />}
      </div>
    </div>
  )
}
