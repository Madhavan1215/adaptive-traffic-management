import { CLASS_COLOR, CLASS_LABEL } from '../constants'
import Card from './Card'

const SAMPLE_LIMIT = 60

export default function QueueView({ packetSamples }) {
  if (!packetSamples || packetSamples.length === 0) {
    return (
      <Card title="Packet arrival & service order" subtitle="Sampled view of the first packets in this run">
        <p className="text-sm text-[var(--text-muted)]">Run a simulation to see packets here.</p>
      </Card>
    )
  }

  const sample = packetSamples.slice(0, SAMPLE_LIMIT)

  return (
    <Card
      title="Packet arrival & service order"
      subtitle={`First ${sample.length} of ${packetSamples.length.toLocaleString()} sampled packets, in arrival order`}
    >
      <div className="flex flex-wrap gap-1.5">
        {sample.map((p) => {
          const delivered = p.outcome === 'delivered'
          const delay = delivered && p.service_start_time != null ? p.service_start_time - p.arrival_time : null
          const title = delivered
            ? `${CLASS_LABEL[p.traffic_class]} · arrived t=${p.arrival_time} · served t=${p.service_start_time} · delay=${delay}`
            : `${CLASS_LABEL[p.traffic_class]} · arrived t=${p.arrival_time} · dropped (${p.drop_reason})`
          return (
            <div
              key={p.packet_id}
              title={title}
              className="flex h-8 w-8 items-center justify-center rounded-md border text-[10px] font-medium"
              style={{
                background: delivered ? `${CLASS_COLOR[p.traffic_class]}26` : 'transparent',
                borderColor: delivered ? CLASS_COLOR[p.traffic_class] : 'var(--danger)',
                color: delivered ? CLASS_COLOR[p.traffic_class] : 'var(--danger)',
                borderStyle: delivered ? 'solid' : 'dashed',
              }}
            >
              {delivered ? p.packet_id : '×'}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--border)] pt-3">
        {Object.entries(CLASS_LABEL).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: CLASS_COLOR[key] }} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span className="flex h-3 w-3 items-center justify-center rounded border border-dashed border-[var(--danger)] text-[8px] text-[var(--danger)]">
            ×
          </span>
          Dropped
        </div>
      </div>
    </Card>
  )
}
