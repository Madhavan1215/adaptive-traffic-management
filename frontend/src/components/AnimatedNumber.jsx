import { motion } from 'motion/react'

/** Always renders the true value immediately; only its appearance is animated.
 * (A count-up would show stale numbers whenever animation frames are paused.) */
export default function AnimatedNumber({ value, format }) {
  const text = format(value)
  return (
    <motion.span
      key={text}
      className="inline-block"
      initial={{ opacity: 0.3, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {text}
    </motion.span>
  )
}
