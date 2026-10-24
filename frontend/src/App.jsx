import { MotionConfig, motion } from 'motion/react'
import { useEffect } from 'react'
import { Footer, NavBar } from './components/Layout'
import { useHashRoute } from './hooks/useHashRoute'
import { useAnalysis, useBackendDefaults, useStudio } from './hooks/useSimulationState'
import Analysis from './pages/Analysis'
import Home from './pages/Home'
import Studio from './pages/Studio'

export default function App() {
  const [route, navigate] = useHashRoute()
  const backend = useBackendDefaults()
  const studio = useStudio(backend.presets)
  const analysis = useAnalysis()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col">
        <NavBar route={route} />
        <main className="flex-1">
          {/* Enter-only fade. No exit animation (it could block navigation) and no transform
              (an animating ancestor transform skews the queue's layout animations). */}
          <motion.div key={route} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            {route === 'home' && <Home onNavigate={navigate} />}
            {route === 'studio' && <Studio backend={backend} studio={studio} onNavigate={navigate} />}
            {route === 'analysis' && <Analysis analysis={analysis} />}
          </motion.div>
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
