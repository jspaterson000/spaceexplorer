import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { useCosmicStore } from '../bridge/useCosmicStore';
import { cosmicActions } from '../bridge/CosmicActions';
import type { SatelliteCategory } from '../data/types';

const CATEGORY_COLORS: Record<SatelliteCategory, string> = {
  station: 'var(--color-pulse)',
  science: 'var(--color-ice)',
  communication: 'var(--color-stardust)',
  navigation: 'var(--color-sol)',
  other: 'var(--color-stardust)',
};

const CATEGORY_LABELS: Record<SatelliteCategory, string> = {
  station: 'Space Station',
  science: 'Science',
  communication: 'Communication',
  navigation: 'Navigation',
  other: 'Other',
};

export function InfoCardComponent() {
  const { selectedSatellite } = useCosmicStore();

  return (
    <AnimatePresence>
      {selectedSatellite && (
        <motion.div
          className="pointer-events-auto fixed top-1/2 right-0 -translate-y-1/2 z-20"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="relative bg-cosmos border border-nebula rounded-l-lg p-6 min-w-[280px] max-w-[320px] backdrop-blur-xl shadow-[-4px_0_24px_rgba(0,0,0,0.4)]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => cosmicActions.closeSatelliteInfo()}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[selectedSatellite.category] }}
              />
              <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                {CATEGORY_LABELS[selectedSatellite.category]}
              </Badge>
            </div>

            <h2 className="text-base font-normal text-foreground mb-5 leading-tight pr-6">
              {selectedSatellite.name}
            </h2>

            <div className="flex flex-col gap-3 mb-5">
              <StatRow label="Altitude" value={formatAltitude(selectedSatellite.altitude)} />
              <StatRow label="Velocity" value={formatVelocity(selectedSatellite.velocity)} />
              <StatRow label="NORAD ID" value={String(selectedSatellite.catalogNumber)} />
            </div>

            <Separator className="mb-5" />

            <a
              href={`https://celestrak.org/satcat/table.php?CATNR=${selectedSatellite.catalogNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-ice px-3 py-2 border border-nebula rounded hover:bg-nebula hover:border-ice transition-colors"
            >
              View on CelesTrak
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-[13px] text-foreground">{value}</span>
    </div>
  );
}

function formatAltitude(meters: number): string {
  const km = meters / 1000;
  return km >= 1000 ? `${(km / 1000).toFixed(2)} thousand km` : `${km.toFixed(0)} km`;
}

function formatVelocity(ms: number): string {
  return `${(ms / 1000).toFixed(2)} km/s`;
}
