import type { ScaleLevel } from '../state/ScaleLevel';
import type { CelestialBody } from '../ui/Navigation';
import type { TLE, SatelliteCategory } from '../data/types';

export interface BodyFacts {
  rows: Array<{ label: string; value: string }>;
  funFact: string;
}

export interface SatelliteInfo {
  name: string;
  catalogNumber: number;
  category: SatelliteCategory;
  altitude: number;
  velocity: number;
}

export interface MissionPhase {
  index: number;
  name: string;
  subtitle: string;
  description: string;
}

export interface CosmicState {
  // Scale
  scaleLevel: ScaleLevel;
  canScaleUp: boolean;
  canScaleDown: boolean;

  // Body
  currentBody: CelestialBody;
  bodyName: string;
  bodyFacts: BodyFacts | null;
  isNavigating: boolean;

  // Stats
  satelliteCount: number;
  viewingAltitude: number;
  satellitesEnabled: boolean;

  // Satellite info card
  selectedSatellite: SatelliteInfo | null;

  // Time controls
  timePaused: boolean;
  timeSpeed: number;
  timeDate: string;
  timeControlsVisible: boolean;

  // Journey dock
  dockVisible: boolean;
  innerBodies: Array<{ id: CelestialBody; name: string }>;
  outerBodies: Array<{ id: CelestialBody; name: string }>;

  // Mission
  missionActive: boolean;
  missionPhase: MissionPhase | null;
  missionProgress: number;
  missionDistance: string;
  missionDay: number;

  // Transition
  transitionActive: boolean;
}

type Listener = () => void;

const DEFAULT_STATE: CosmicState = {
  scaleLevel: 'planet' as ScaleLevel,
  canScaleUp: true,
  canScaleDown: false,
  currentBody: 'earth',
  bodyName: 'Earth',
  bodyFacts: null,
  isNavigating: false,
  satelliteCount: 0,
  viewingAltitude: 0,
  satellitesEnabled: true,
  selectedSatellite: null,
  timePaused: true,
  timeSpeed: 1,
  timeDate: '',
  timeControlsVisible: false,
  dockVisible: true,
  innerBodies: [],
  outerBodies: [],
  missionActive: false,
  missionPhase: null,
  missionProgress: 0,
  missionDistance: '0 km',
  missionDay: 1,
  transitionActive: false,
};

class CosmicStoreImpl {
  private state: CosmicState = { ...DEFAULT_STATE };
  private listeners: Set<Listener> = new Set();

  getState = (): CosmicState => {
    return this.state;
  };

  setState(partial: Partial<CosmicState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const cosmicStore = new CosmicStoreImpl();
