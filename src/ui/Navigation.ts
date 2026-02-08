// src/ui/Navigation.ts
import * as THREE from 'three';
import { Camera } from '../engine/Camera';
import { cosmicStore, type BodyFacts } from '../bridge/CosmicStore';

export type CelestialBody =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface BodyConfig {
  name: string;
  position: () => THREE.Vector3;
  radius: number;
  defaultZoom: number;
  group: 'inner' | 'outer';
  facts: BodyFacts;
}

export const BODIES: Record<CelestialBody, BodyConfig> = {
  sun: {
    name: 'Sun',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 696_340_000 * 0.5,
    defaultZoom: 9.8,
    group: 'inner',
    facts: {
      rows: [
        { label: 'Type', value: 'G-type Main Sequence Star' },
        { label: 'Diameter', value: '1.39 million km' },
        { label: 'Rotation', value: '25 Earth days (equator)' },
      ],
      funFact: 'Every second, the Sun converts 4 million tonnes of matter into pure energy',
    },
  },
  mercury: {
    name: 'Mercury',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 2_439_700 * 8,
    defaultZoom: 8.0,
    group: 'inner',
    facts: {
      rows: [
        { label: 'Type', value: 'Terrestrial Planet' },
        { label: 'Diameter', value: '4,879 km' },
        { label: 'Day', value: '59 Earth days' },
        { label: 'Year', value: '88 Earth days' },
        { label: 'Moons', value: '0' },
      ],
      funFact: 'Surface temperatures swing from \u2212180\u00b0C at night to 430\u00b0C in daylight',
    },
  },
  venus: {
    name: 'Venus',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 6_051_800 * 3,
    defaultZoom: 8.0,
    group: 'inner',
    facts: {
      rows: [
        { label: 'Type', value: 'Terrestrial Planet' },
        { label: 'Diameter', value: '12,104 km' },
        { label: 'Day', value: '243 Earth days' },
        { label: 'Year', value: '225 Earth days' },
        { label: 'Moons', value: '0' },
      ],
      funFact: 'Its crushing atmosphere creates surface pressure 90\u00d7 Earth\u2019s \u2014 equivalent to being 900m underwater',
    },
  },
  earth: {
    name: 'Earth',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 6_371_000,
    defaultZoom: 7.5,
    group: 'inner',
    facts: {
      rows: [
        { label: 'Type', value: 'Terrestrial Planet' },
        { label: 'Diameter', value: '12,742 km' },
        { label: 'Day', value: '24 hours' },
        { label: 'Year', value: '365.25 days' },
        { label: 'Moons', value: '1' },
      ],
      funFact: 'Earth\u2019s core is as hot as the surface of the Sun \u2014 a molten iron heart that generates the magnetic shield protecting all life',
    },
  },
  moon: {
    name: 'Moon',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 1_737_000 * 3,
    defaultZoom: 7.5,
    group: 'inner',
    facts: {
      rows: [
        { label: 'Type', value: 'Natural Satellite' },
        { label: 'Diameter', value: '3,474 km' },
        { label: 'Day', value: '29.5 Earth days' },
        { label: 'Orbit', value: '27.3 days' },
      ],
      funFact: 'Without the Moon\u2019s stabilizing pull, Earth\u2019s axial tilt would swing chaotically \u2014 erasing seasons as we know them',
    },
  },
  mars: {
    name: 'Mars',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 3_389_500 * 5,
    defaultZoom: 8.0,
    group: 'inner',
    facts: {
      rows: [
        { label: 'Type', value: 'Terrestrial Planet' },
        { label: 'Diameter', value: '6,779 km' },
        { label: 'Day', value: '24h 37m' },
        { label: 'Year', value: '687 Earth days' },
        { label: 'Moons', value: '2' },
      ],
      funFact: 'Olympus Mons is so vast that standing on its peak, you couldn\u2019t see the edges \u2014 they\u2019d be beyond the horizon',
    },
  },
  jupiter: {
    name: 'Jupiter',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 69_911_000,
    defaultZoom: 8.6,
    group: 'outer',
    facts: {
      rows: [
        { label: 'Type', value: 'Gas Giant' },
        { label: 'Diameter', value: '139,820 km' },
        { label: 'Day', value: '9h 56m' },
        { label: 'Year', value: '11.9 Earth years' },
        { label: 'Moons', value: '95' },
      ],
      funFact: 'Jupiter\u2019s magnetic field is 20,000\u00d7 stronger than Earth\u2019s \u2014 it would erase every credit card from orbit',
    },
  },
  saturn: {
    name: 'Saturn',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 58_232_000,
    defaultZoom: 8.7,
    group: 'outer',
    facts: {
      rows: [
        { label: 'Type', value: 'Gas Giant' },
        { label: 'Diameter', value: '116,460 km' },
        { label: 'Day', value: '10h 42m' },
        { label: 'Year', value: '29.4 Earth years' },
        { label: 'Moons', value: '146' },
      ],
      funFact: 'Saturn is so light it would float in water \u2014 if you could find a bathtub 120,000 km wide',
    },
  },
  uranus: {
    name: 'Uranus',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 25_362_000 * 2,
    defaultZoom: 8.5,
    group: 'outer',
    facts: {
      rows: [
        { label: 'Type', value: 'Ice Giant' },
        { label: 'Diameter', value: '50,724 km' },
        { label: 'Day', value: '17h 14m' },
        { label: 'Year', value: '84 Earth years' },
        { label: 'Moons', value: '28' },
      ],
      funFact: 'Knocked sideways by an ancient collision, each pole gets 42 years of continuous sunlight followed by 42 years of darkness',
    },
  },
  neptune: {
    name: 'Neptune',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 24_622_000 * 2,
    defaultZoom: 8.5,
    group: 'outer',
    facts: {
      rows: [
        { label: 'Type', value: 'Ice Giant' },
        { label: 'Diameter', value: '49,244 km' },
        { label: 'Day', value: '16h 6m' },
        { label: 'Year', value: '165 Earth years' },
        { label: 'Moons', value: '16' },
      ],
      funFact: 'It rains diamonds deep inside Neptune \u2014 carbon atoms crushed into crystals by pressures millions of times our atmosphere',
    },
  },
};

// Order for dock display
export const INNER_BODIES: CelestialBody[] = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars'];
export const OUTER_BODIES: CelestialBody[] = ['jupiter', 'saturn', 'uranus', 'neptune'];

export class Navigation {
  private camera: Camera;
  private currentBody: CelestialBody = 'earth';
  private targetBody: CelestialBody | null = null;
  private isFlying = false;
  private flyProgress = 0;
  private flyDuration = 3500;
  private flyStartTime = 0;
  private flyStartTarget = new THREE.Vector3();
  private flyEndTarget = new THREE.Vector3();
  private flyStartZoom = 0;
  private flyEndZoom = 0;
  private flyMidZoom = 0;
  private onBodyChange: ((body: CelestialBody) => void) | null = null;

  // References to meshes for dynamic position
  private meshes: Map<CelestialBody, THREE.Object3D> = new Map();

  constructor(camera: Camera) {
    this.camera = camera;
    this.pushBodyState(this.currentBody);
    this.pushDockState();
  }

  // Generic mesh setter
  setMesh(body: CelestialBody, mesh: THREE.Object3D): void {
    this.meshes.set(body, mesh);
    BODIES[body].position = () => mesh.position.clone();
  }

  // Convenience methods for specific bodies
  setMoonMesh(mesh: THREE.Object3D): void { this.setMesh('moon', mesh); }
  setSunMesh(mesh: THREE.Object3D): void { this.setMesh('sun', mesh); }
  setMercuryMesh(mesh: THREE.Object3D): void { this.setMesh('mercury', mesh); }
  setVenusMesh(mesh: THREE.Object3D): void { this.setMesh('venus', mesh); }
  setMarsMesh(mesh: THREE.Object3D): void { this.setMesh('mars', mesh); }
  setJupiterMesh(mesh: THREE.Object3D): void { this.setMesh('jupiter', mesh); }
  setSaturnMesh(mesh: THREE.Object3D): void { this.setMesh('saturn', mesh); }
  setUranusMesh(mesh: THREE.Object3D): void { this.setMesh('uranus', mesh); }
  setNeptuneMesh(mesh: THREE.Object3D): void { this.setMesh('neptune', mesh); }

  /** Push current body info into the bridge store */
  private pushBodyState(body: CelestialBody): void {
    const config = BODIES[body];
    cosmicStore.setState({
      currentBody: body,
      bodyName: config.name,
      bodyFacts: config.facts,
    });
  }

  /** Push dock body lists into the bridge store */
  private pushDockState(): void {
    cosmicStore.setState({
      innerBodies: INNER_BODIES.map((id) => ({ id, name: BODIES[id].name })),
      outerBodies: OUTER_BODIES.map((id) => ({ id, name: BODIES[id].name })),
    });
  }

  /**
   * Calculate journey parameters based on distance
   */
  private calculateJourneyParams(fromBody: CelestialBody, toBody: CelestialBody): { midZoom: number; duration: number } {
    const fromPos = BODIES[fromBody].position();
    const toPos = BODIES[toBody].position();
    const distance = fromPos.distanceTo(toPos);
    const logDist = Math.log10(Math.max(distance, 1));
    const duration = Math.min(7000, Math.max(3500, 2000 + logDist * 400));
    const midZoom = Math.min(12.5, logDist + 0.5);
    return { midZoom, duration };
  }

  flyTo(body: CelestialBody): void {
    if (this.isFlying || body === this.currentBody) return;

    this.targetBody = body;
    this.isFlying = true;
    this.flyProgress = 0;
    this.flyStartTime = performance.now();

    // Current state
    this.flyStartTarget.copy(BODIES[this.currentBody].position());
    this.flyStartZoom = this.camera.logDistance;

    // Target state
    const targetConfig = BODIES[body];
    this.flyEndTarget.copy(targetConfig.position());
    this.flyEndZoom = targetConfig.defaultZoom;

    // Calculate journey parameters based on distance
    const { midZoom, duration } = this.calculateJourneyParams(this.currentBody, body);
    this.flyMidZoom = midZoom;
    this.flyDuration = duration;

    cosmicStore.setState({ isNavigating: true });
  }

  update(): void {
    if (!this.isFlying || !this.targetBody) return;

    const elapsed = performance.now() - this.flyStartTime;
    this.flyProgress = Math.min(elapsed / this.flyDuration, 1);

    const t = this.easeInOutQuart(this.flyProgress);

    let currentZoom: number;
    if (this.flyProgress < 0.5) {
      const halfT = this.easeOutCubic(this.flyProgress * 2);
      currentZoom = this.flyStartZoom + (this.flyMidZoom - this.flyStartZoom) * halfT;
    } else {
      const halfT = this.easeInCubic((this.flyProgress - 0.5) * 2);
      currentZoom = this.flyMidZoom + (this.flyEndZoom - this.flyMidZoom) * halfT;
    }

    const targetX = this.flyStartTarget.x + (this.flyEndTarget.x - this.flyStartTarget.x) * t;
    const targetY = this.flyStartTarget.y + (this.flyEndTarget.y - this.flyStartTarget.y) * t;
    const targetZ = this.flyStartTarget.z + (this.flyEndTarget.z - this.flyStartTarget.z) * t;

    this.camera.setTargetImmediate(targetX, targetY, targetZ);
    this.camera.setZoom(currentZoom);

    // Update body info at midpoint
    if (this.flyProgress >= 0.45 && this.flyProgress <= 0.55) {
      const config = BODIES[this.targetBody];
      if (cosmicStore.getState().bodyName !== config.name) {
        this.pushBodyState(this.targetBody);
      }
    }

    // Complete
    if (this.flyProgress >= 1) {
      this.isFlying = false;
      this.currentBody = this.targetBody;
      this.targetBody = null;
      cosmicStore.setState({ isNavigating: false });

      if (this.onBodyChange) {
        this.onBodyChange(this.currentBody);
      }
    }
  }

  private easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  getCurrentBody(): CelestialBody {
    return this.currentBody;
  }

  /**
   * Refresh the store to show current body info.
   * Called when returning from orrery/stellar mode to planet mode.
   */
  refreshTitleCard(): void {
    this.pushBodyState(this.currentBody);
  }

  isNavigating(): boolean {
    return this.isFlying;
  }

  setOnBodyChange(callback: (body: CelestialBody) => void): void {
    this.onBodyChange = callback;
  }

  // Check if a click hits a celestial body
  checkBodyClick(raycaster: THREE.Raycaster, meshes: Record<string, THREE.Object3D>): CelestialBody | null {
    const checkOrder: CelestialBody[] = [
      'sun', 'mercury', 'venus', 'earth', 'moon', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune'
    ];

    for (const body of checkOrder) {
      const mesh = meshes[body];
      if (!mesh) continue;

      const intersects = raycaster.intersectObject(mesh, true);
      if (intersects.length > 0 && this.currentBody !== body) {
        return body;
      }
    }

    return null;
  }
}
