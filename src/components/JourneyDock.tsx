import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCosmicStore } from '../bridge/useCosmicStore';
import { cosmicActions } from '../bridge/CosmicActions';
import type { CelestialBody } from '../ui/Navigation';

export function JourneyDock() {
  const { dockVisible, innerBodies, outerBodies, currentBody, isNavigating, missionActive } = useCosmicStore();
  const [innerCollapsed, setInnerCollapsed] = useState(false);
  const [outerCollapsed, setOuterCollapsed] = useState(false);

  if (!dockVisible || missionActive) return null;

  return (
    <motion.div
      className="pointer-events-auto fixed bottom-10 left-1/2 -translate-x-1/2 z-[15] flex items-start gap-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 1.5 }}
    >
      <DockGroup
        label="Inner System"
        bodies={innerBodies}
        currentBody={currentBody}
        collapsed={innerCollapsed}
        onToggle={() => setInnerCollapsed(!innerCollapsed)}
        isNavigating={isNavigating}
      />
      <DockGroup
        label="Outer System"
        bodies={outerBodies}
        currentBody={currentBody}
        collapsed={outerCollapsed}
        onToggle={() => setOuterCollapsed(!outerCollapsed)}
        isNavigating={isNavigating}
      />
    </motion.div>
  );
}

function DockGroup({
  label,
  bodies,
  currentBody,
  collapsed,
  onToggle,
  isNavigating,
}: {
  label: string;
  bodies: Array<{ id: CelestialBody; name: string }>;
  currentBody: CelestialBody;
  collapsed: boolean;
  onToggle: () => void;
  isNavigating: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none text-left flex items-center gap-2"
        onClick={onToggle}
      >
        <span
          className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-muted-foreground transition-transform"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'none' }}
        />
        {label}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="flex flex-row gap-5 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {bodies.map((body) => {
              const isActive = currentBody === body.id;
              return (
                <button
                  key={body.id}
                  className={`flex items-center gap-2.5 transition-opacity cursor-pointer ${
                    isActive ? 'opacity-100 cursor-default' : 'opacity-50 hover:opacity-80'
                  }`}
                  onClick={() => {
                    if (!isActive && !isNavigating) {
                      cosmicActions.flyToBody(body.id);
                    }
                  }}
                  disabled={isActive || isNavigating}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      isActive ? 'bg-foreground scale-120' : 'bg-muted-foreground'
                    }`}
                  />
                  <span className="font-display text-sm font-normal text-foreground tracking-wide">
                    {body.name}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
