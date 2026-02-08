import { useSyncExternalStore, useCallback } from 'react';
import { cosmicStore, type CosmicState } from './CosmicStore';

export function useCosmicStore(): CosmicState {
  return useSyncExternalStore(cosmicStore.subscribe, cosmicStore.getState);
}

export function useCosmicSelector<T>(selector: (state: CosmicState) => T): T {
  const getSnapshot = useCallback(() => selector(cosmicStore.getState()), [selector]);
  return useSyncExternalStore(cosmicStore.subscribe, getSnapshot);
}
