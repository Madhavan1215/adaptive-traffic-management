const BASE = '/api'
const SERVER_DOWN = 'Could not reach the simulation server. Start the backend (uvicorn main:app --port 8000) and try again.'

async function request(path, options) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
  } catch {
    throw new Error(SERVER_DOWN)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = body?.detail
    if (Array.isArray(detail)) throw new Error(detail.map((d) => d.msg.replace(/^Value error, /, '')).join('; '))
    if (res.status === 404) {
      throw new Error("The simulation API wasn't found on port 8000. Make sure this project's backend is running there — another program may be using that port.")
    }
    // The Vite dev proxy answers 5xx without a JSON body when the backend is down.
    if (res.status >= 500 && !detail) throw new Error(SERVER_DOWN)
    throw new Error(detail || `The server returned an error (${res.status}).`)
  }
  return res.json()
}

export function getDefaults() {
  return request('/config/defaults')
}

export function runSimulation(body) {
  return request('/simulate', { method: 'POST', body: JSON.stringify(body) })
}

export function runComparison(body) {
  return request('/compare', { method: 'POST', body: JSON.stringify(body) })
}
