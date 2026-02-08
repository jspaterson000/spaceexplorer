import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useCosmicStore } from '../bridge/useCosmicStore';
import { cosmicActions } from '../bridge/CosmicActions';

export function MissionOverlay() {
  const { missionActive, missionPhase, missionProgress, missionDistance, missionDay } = useCosmicStore();

  return (
    <AnimatePresence>
      {missionActive && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] flex flex-col justify-between p-[60px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          >
            <Badge className="mb-5 tracking-[0.2em] text-[11px] border-ice/30 bg-ice/10 text-ice">
              NASA ARTEMIS PROGRAM
            </Badge>
            <h1
              className="font-display text-7xl font-normal text-foreground tracking-wide mb-3"
              style={{ textShadow: '0 4px 40px rgba(0, 0, 0, 0.5)' }}
            >
              Artemis II
            </h1>
            <p className="font-display text-xl italic text-muted-foreground tracking-wide">
              Humanity's Return to the Moon
            </p>
          </motion.div>

          {/* Phase info */}
          <AnimatePresence mode="wait">
            {missionPhase && (
              <motion.div
                key={missionPhase.index}
                className="absolute left-[60px] bottom-[180px] max-w-[480px]"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <div className="font-mono text-6xl font-light text-ice/20 leading-none -mb-5">
                  {String(missionPhase.index + 1).padStart(2, '0')}
                </div>
                <h2 className="font-display text-4xl font-normal text-foreground mb-2">
                  {missionPhase.name}
                </h2>
                <p className="font-mono text-xs tracking-[0.1em] text-ice uppercase mb-4">
                  {missionPhase.subtitle}
                </p>
                <p className="font-mono text-sm leading-relaxed text-muted-foreground">
                  {missionPhase.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          <div className="absolute bottom-[60px] left-[60px] right-[60px]">
            <div className="h-0.5 bg-muted-foreground/30 rounded-sm overflow-hidden mb-4">
              <motion.div
                className="h-full rounded-sm"
                style={{
                  background: 'linear-gradient(90deg, var(--color-ice), var(--color-sol))',
                  width: `${missionProgress * 100}%`,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex gap-10">
              <span className="font-mono text-xs text-muted-foreground">
                <strong className="text-foreground font-normal">Distance:</strong> {missionDistance}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                <strong className="text-foreground font-normal">Day:</strong> {missionDay} of 10
              </span>
            </div>
          </div>

          {/* Exit button */}
          <div className="pointer-events-auto absolute top-[60px] right-[60px]">
            <Button
              variant="outline"
              className="bg-cosmos/80 border-nebula text-muted-foreground backdrop-blur-xl hover:bg-nebula hover:text-foreground hover:border-muted-foreground"
              onClick={() => cosmicActions.stopMission()}
            >
              <X className="h-3 w-3 mr-1" />
              Exit Preview
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
