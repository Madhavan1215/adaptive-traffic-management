const BASE = '/api'

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    const message = Array.isArray(body.detail)
      ? body.detail.map((d) => d.msg).join('; ')
      : body.detail || 'Request failed'
    throw new Error(message)
  }
  return res.json()
}

export function getHealth() {
  return request('/health')
}

export function getDefaults() {
  return request('/config/defaults')
}

export function getAlgorithms() {
  return request('/algorithms')
}

export function runSimulation(config) {
  return request('/simulate', { method: 'POST', body: JSON.stringify(config) })
}

export function runComparison(config) {
  return request('/compare', { method: 'POST', body: JSON.stringify(config) })
}
