import { motion, AnimatePresence } from 'framer-motion';
import { useCosmicStore } from '../bridge/useCosmicStore';

export function TransitionOverlay() {
  const { transitionActive } = useCosmicStore();

  return (
    <AnimatePresence>
      {transitionActive && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
}
