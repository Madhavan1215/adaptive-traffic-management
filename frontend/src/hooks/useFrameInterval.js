import { useEffect, useRef } from 'react'

/** Like setInterval, but driven by requestAnimationFrame: it only ticks while
 * the browser is actually drawing frames. In a background tab or hidden
 * window timers keep firing while animations freeze, which would let
 * looping animations pile up exiting elements. */
export function useFrameInterval(callback, delayMs, active) {
  const saved = useRef(callback)

  useEffect(() => {
    saved.current = callback
  })

  useEffect(() => {
    if (!active) return undefined
    let frame
    let last = performance.now()
    const loop = (now) => {
      if (now - last >= delayMs) {
        last = now
        saved.current()
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [delayMs, active])
}
