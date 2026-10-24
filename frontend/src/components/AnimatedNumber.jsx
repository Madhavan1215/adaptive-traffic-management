import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

/** Counts from the previous value to the new one when results change. */
export default function AnimatedNumber({ value, format }) {
  const ref = useRef(null)
  const previous = useRef(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    const from = previous.current
    previous.current = value
    if (!node) return undefined
    if (reduceMotion || !Number.isFinite(value) || from === value) {
      node.textContent = format(value)
      return undefined
    }
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = format(v)
      },
    })
    return () => controls.stop()
    // `format` is intentionally excluded: callers pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion])

  return <span ref={ref}>{format(value)}</span>
}
