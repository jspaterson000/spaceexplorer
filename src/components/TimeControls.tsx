import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useCosmicStore } from '../bridge/useCosmicStore';
import { cosmicActions } from '../bridge/CosmicActions';

export function TimeControlsComponent() {
  const { timeControlsVisible, timePaused, timeSpeed, timeDate, missionActive } = useCosmicStore();

  if (!timeControlsVisible || missionActive) return null;

  const speedLabel = timeSpeed === 1 ? '1 day/s' : timeSpeed === 7 ? '1 week/s' : '1 month/s';

  return (
    <motion.div
      className="pointer-events-auto fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[15] flex items-center gap-4 px-5 py-3 bg-cosmos/90 border border-nebula rounded-lg backdrop-blur-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-transparent border-nebula"
        onClick={() => cosmicActions.timeStepBackward()}
        title="Step back"
      >
        <SkipBack className="h-3 w-3" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`h-8 w-8 border-nebula ${!timePaused ? 'bg-ice border-ice text-void' : 'bg-transparent'}`}
        onClick={() => cosmicActions.timeToggle()}
        title="Play/Pause"
      >
        {timePaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-transparent border-nebula"
        onClick={() => cosmicActions.timeStepForward()}
        title="Step forward"
      >
        <SkipForward className="h-3 w-3" />
      </Button>

      <Separator orientation="vertical" className="h-5 bg-nebula" />

      <Button
        variant="outline"
        size="sm"
        className="bg-transparent border-nebula text-muted-foreground font-mono text-xs"
        onClick={() => cosmicActions.timeChangeSpeed()}
        title="Change speed"
      >
        {speedLabel}
      </Button>

      <Separator orientation="vertical" className="h-5 bg-nebula" />

      <span className="font-mono text-xs text-foreground min-w-[100px]">
        {timeDate}
      </span>
    </motion.div>
  );
}
