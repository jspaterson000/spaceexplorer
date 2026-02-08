import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCosmicStore } from '../bridge/useCosmicStore';
import { LogScale } from '../engine/LogScale';

export function TitleCard() {
  const {
    bodyName,
    bodyFacts,
    satelliteCount,
    viewingAltitude,
    scaleLevel,
    currentBody,
    missionActive,
    transitionActive,
  } = useCosmicStore();

  // Track whether the last body change happened during a black-screen transition.
  // If so, skip AnimatePresence animations so content is already settled on reveal.
  const skipAnimation = useRef(false);
  const prevBody = useRef(bodyName);

  if (bodyName !== prevBody.current) {
    skipAnimation.current = transitionActive;
    prevBody.current = bodyName;
  }

  if (missionActive) return null;

  const showStats = scaleLevel === 'planet';
  const showSatelliteRow = showStats && currentBody === 'earth';
  const altitudeStr = LogScale.formatDistance(Math.max(0, viewingAltitude));
  const instant = skipAnimation.current;

  return (
    <motion.div
      className="pointer-events-none fixed top-10 left-10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={bodyName}
          initial={instant ? false : { opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: instant ? 0 : 0.6, ease: 'easeOut' }}
        >
          <h1
            className="font-display text-5xl font-normal text-foreground tracking-normal"
            style={{ textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)', marginBottom: 28 }}
          >
            {bodyName}
          </h1>

          {bodyFacts && (
            <motion.div
              className="max-w-[320px]"
              initial={instant ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: instant ? 0 : 0.6, ease: 'easeOut', delay: instant ? 0 : 0.15 }}
            >
              {/* Top rule */}
              <div className="h-px bg-white/[0.12]" style={{ marginBottom: 18 }} />

              <motion.div
                className="flex flex-col gap-3"
                initial={instant ? 'visible' : 'hidden'}
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: instant ? 0 : 0.08, delayChildren: instant ? 0 : 0.2 } },
                }}
              >
                {bodyFacts.rows.map((row) => (
                  <FactRow key={row.label} label={row.label} value={row.value} instant={instant} />
                ))}
              </motion.div>

              {/* Fun fact */}
              <motion.div
                className="border-t border-white/[0.08] font-mono text-[11px] italic text-ice leading-relaxed"
                style={{ marginTop: 20, paddingTop: 16 }}
                initial={instant ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: instant ? 0 : 0.5 }}
              >
                {bodyFacts.funFact}
              </motion.div>

              {/* Bottom rule */}
              <div className="h-px bg-white/[0.12]" style={{ marginTop: 18 }} />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {showStats && (
        <motion.div
          className="flex flex-col gap-3" style={{ marginTop: 32 }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 1.0 }}
        >
          {showSatelliteRow && (
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm text-foreground">{satelliteCount.toLocaleString()}</span>
              <span className="font-mono text-xs text-muted-foreground">satellites tracked</span>
            </div>
          )}
          <motion.div
            className="flex items-baseline gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 1.2 }}
          >
            <span className="font-mono text-sm text-foreground">{altitudeStr}</span>
            <span className="font-mono text-xs text-muted-foreground">viewing altitude</span>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Splits a value like "~100,000 light years" into
 * { number: "~100,000", unit: "light years" }
 * so units can be rendered dimmer for scanability.
 */
function splitValueUnit(value: string): { number: string; unit: string } | null {
  const match = value.match(/^([~<>]?[\d,.\-–]+(?:\+)?)\s+(.+)$/);
  if (match) return { number: match[1], unit: match[2] };
  return null;
}

function FactRow({ label, value, instant }: { label: string; value: string; instant: boolean }) {
  const split = splitValueUnit(value);

  return (
    <motion.div
      className="flex justify-between items-baseline font-mono text-xs gap-8"
      variants={{
        hidden: { opacity: 0, x: -5 },
        visible: { opacity: 1, x: 0 },
      }}
      transition={{ duration: instant ? 0 : 0.4 }}
    >
      <span className="text-muted-foreground uppercase tracking-wider shrink-0">{label}</span>
      {split ? (
        <span className="text-right">
          <span className="text-foreground">{split.number}</span>
          {' '}
          <span className="text-muted-foreground">{split.unit}</span>
        </span>
      ) : (
        <span className="text-foreground text-right">{value}</span>
      )}
    </motion.div>
  );
}
