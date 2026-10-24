import { useCallback, useEffect, useState } from 'react'

export const ROUTES = ['home', 'studio', 'analysis']

function readRoute() {
  const name = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.includes(name) ? name : 'home'
}

/** Minimal hash router (#/studio) so refresh and the back button work without a routing library. */
export function useHashRoute() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next) => {
    if (next !== readRoute()) window.location.hash = `/${next}`
    window.scrollTo({ top: 0 })
  }, [])

  return [route, navigate]
}
