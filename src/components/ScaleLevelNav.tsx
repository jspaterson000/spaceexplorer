import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { useCosmicStore } from '../bridge/useCosmicStore';
import { cosmicActions } from '../bridge/CosmicActions';
import type { ScaleLevel } from '../state/ScaleLevel';

const LEVEL_LABELS: Record<string, string> = {
  'planet': 'Planet',
  'solar-system': 'System',
  'stellar': 'Stellar',
  'local-bubble': 'Bubble',
  'orion-arm': 'Orion',
  'milky-way': 'Galaxy',
};

export function ScaleLevelNavComponent() {
  const { scaleLevel, canScaleUp, canScaleDown, missionActive } = useCosmicStore();

  if (missionActive) return null;

  const label = LEVEL_LABELS[scaleLevel] || '';

  return (
    <TooltipProvider>
      <motion.div
        className="pointer-events-auto fixed top-1/2 right-10 -translate-y-1/2 flex flex-col gap-2 items-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 1.8 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-cosmos/80 border-nebula backdrop-blur-xl"
              disabled={!canScaleUp}
              onClick={() => cosmicActions.changeScaleLevel('up')}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom out</TooltipContent>
        </Tooltip>

        <span className="font-mono text-[10px] text-muted-foreground text-center py-1">
          {label}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-cosmos/80 border-nebula backdrop-blur-xl"
              disabled={!canScaleDown}
              onClick={() => cosmicActions.changeScaleLevel('down')}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom in</TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}
