import { motion } from 'motion/react'
import AlgorithmCards from '../components/home/AlgorithmCards'
import { HowItWorks, WhyCongestion } from '../components/home/Explainers'
import PacketFlowHero from '../components/home/PacketFlowHero'
import Icon from '../components/Icon'

function Section({ id, eyebrow, title, intro, children }) {
  return (
    <section id={id} className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          {intro && <p className="mt-3 leading-relaxed text-ink-muted">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

export default function Home({ onNavigate }) {
  const explore = () => document.getElementById('why-congestion')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-accent-2/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="eyebrow">Computer Networks · discrete-time simulation</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-r from-accent via-accent-2 to-accent-3 bg-clip-text text-transparent">Adaptive</span> Traffic
              Management
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink sm:text-xl">
              See what happens when a network gets congested — and how smarter packet scheduling changes the outcome.
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
              Explore three scheduling strategies, simulate network congestion, and discover the trade-offs between packet loss, delay, and
              fairness.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary !px-5 !py-3" onClick={() => onNavigate('studio')}>
                Launch Simulator
                <Icon name="arrowRight" size={16} />
              </button>
              <button type="button" className="btn btn-secondary !px-5 !py-3" onClick={explore}>
                Explore How It Works
                <Icon name="arrowDown" size={16} />
              </button>
            </div>
          </motion.div>

          {/* Opacity only: a transform here would skew the illustration's layout animations. */}
          <motion.div className="min-w-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <PacketFlowHero />
            <p className="mt-3 text-center text-xs text-ink-faint">Packets arrive → wait in a finite queue → a scheduler picks the next one → it leaves on the link.</p>
          </motion.div>
        </div>
      </section>

      <div className="border-t border-line/60">
        <Section id="why-congestion" eyebrow="The problem" title="Why does congestion matter?">
          <WhyCongestion />
        </Section>
      </div>

      <div className="border-t border-line/60 bg-surface/30">
        <Section
          id="algorithms"
          eyebrow="Three strategies"
          title="Who gets sent next?"
          intro="Every scheduling strategy answers the same question differently. Watch which waiting packet each one picks."
        >
          <AlgorithmCards />
        </Section>
      </div>

      <div className="border-t border-line/60">
        <Section id="how-it-works" eyebrow="How it works" title="Four steps, repeated every time step">
          <HowItWorks />
        </Section>
      </div>

      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-line-strong bg-surface px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
          <h2 className="relative text-2xl font-semibold tracking-tight sm:text-3xl">Run an experiment yourself</h2>
          <p className="relative mx-auto mt-3 max-w-xl leading-relaxed text-ink-muted">
            Pick a traffic level and a strategy, then watch the queue fill, drain and overflow — with every number computed by the simulator.
          </p>
          <button type="button" className="btn btn-primary relative mt-7 !px-6 !py-3" onClick={() => onNavigate('studio')}>
            Open the Simulation Studio
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </section>
    </div>
  )
}
