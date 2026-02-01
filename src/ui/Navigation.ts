// src/ui/Navigation.ts
import * as THREE from 'three';
import { Camera } from '../engine/Camera';
import { LogScale } from '../engine/LogScale';

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

interface BodyFacts {
  type: string;
  diameter: string;
  dayLength: string;
  yearLength?: string;
  moons?: string;
  funFact: string;
}

interface BodyConfig {
  name: string;
  position: () => THREE.Vector3;
  radius: number;
  defaultZoom: number;
  group: 'inner' | 'outer';
  facts: BodyFacts;
}

const BODIES: Record<CelestialBody, BodyConfig> = {
  sun: {
    name: 'Sun',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 696_340_000 * 0.5,
    defaultZoom: 9.8,
    group: 'inner',
    facts: {
      type: 'G-type Main Sequence Star',
      diameter: '1.39 million km',
      dayLength: '25 Earth days (equator)',
      funFact: 'Contains 99.86% of the Solar System\'s mass',
    },
  },
  mercury: {
    name: 'Mercury',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 2_439_700 * 8,
    defaultZoom: 8.0,
    group: 'inner',
    facts: {
      type: 'Terrestrial Planet',
      diameter: '4,879 km',
      dayLength: '59 Earth days',
      yearLength: '88 Earth days',
      moons: '0',
      funFact: 'Fastest planet, orbiting the Sun in just 88 days',
    },
  },
  venus: {
    name: 'Venus',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 6_051_800 * 3,
    defaultZoom: 8.0,
    group: 'inner',
    facts: {
      type: 'Terrestrial Planet',
      diameter: '12,104 km',
      dayLength: '243 Earth days',
      yearLength: '225 Earth days',
      moons: '0',
      funFact: 'Rotates backwards and has the longest day of any planet',
    },
  },
  earth: {
    name: 'Earth',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 6_371_000,
    defaultZoom: 7.5,
    group: 'inner',
    facts: {
      type: 'Terrestrial Planet',
      diameter: '12,742 km',
      dayLength: '24 hours',
      yearLength: '365.25 days',
      moons: '1',
      funFact: 'The only known planet with life',
    },
  },
  moon: {
    name: 'Moon',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 1_737_000 * 3,
    defaultZoom: 7.5,
    group: 'inner',
    facts: {
      type: 'Natural Satellite',
      diameter: '3,474 km',
      dayLength: '29.5 Earth days',
      yearLength: '27.3 days (orbit)',
      funFact: 'Slowly drifting away from Earth at 3.8 cm per year',
    },
  },
  mars: {
    name: 'Mars',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 3_389_500 * 5,
    defaultZoom: 8.0,
    group: 'inner',
    facts: {
      type: 'Terrestrial Planet',
      diameter: '6,779 km',
      dayLength: '24h 37m',
      yearLength: '687 Earth days',
      moons: '2',
      funFact: 'Home to Olympus Mons, the largest volcano in the Solar System',
    },
  },
  jupiter: {
    name: 'Jupiter',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 69_911_000,
    defaultZoom: 8.6,
    group: 'outer',
    facts: {
      type: 'Gas Giant',
      diameter: '139,820 km',
      dayLength: '9h 56m',
      yearLength: '11.9 Earth years',
      moons: '95',
      funFact: 'The Great Red Spot is a storm larger than Earth',
    },
  },
  saturn: {
    name: 'Saturn',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 58_232_000,
    defaultZoom: 8.7,
    group: 'outer',
    facts: {
      type: 'Gas Giant',
      diameter: '116,460 km',
      dayLength: '10h 42m',
      yearLength: '29.4 Earth years',
      moons: '146',
      funFact: 'Its rings span up to 282,000 km but are only 10m thick',
    },
  },
  uranus: {
    name: 'Uranus',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 25_362_000 * 2,
    defaultZoom: 8.5,
    group: 'outer',
    facts: {
      type: 'Ice Giant',
      diameter: '50,724 km',
      dayLength: '17h 14m',
      yearLength: '84 Earth years',
      moons: '28',
      funFact: 'Rotates on its side with a 98° axial tilt',
    },
  },
  neptune: {
    name: 'Neptune',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 24_622_000 * 2,
    defaultZoom: 8.5,
    group: 'outer',
    facts: {
      type: 'Ice Giant',
      diameter: '49,244 km',
      dayLength: '16h 6m',
      yearLength: '165 Earth years',
      moons: '16',
      funFact: 'Has the strongest winds in the Solar System at 2,100 km/h',
    },
  },
};

// Order for dock display
const INNER_BODIES: CelestialBody[] = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars'];
const OUTER_BODIES: CelestialBody[] = ['jupiter', 'saturn', 'uranus', 'neptune'];

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

  private dockElement: HTMLElement;
  private titleElement: HTMLElement;
  private factsElement: HTMLElement | null = null;
  private onBodyChange: ((body: CelestialBody) => void) | null = null;

  // References to meshes for dynamic position
  private meshes: Map<CelestialBody, THREE.Object3D> = new Map();

  constructor(camera: Camera) {
    this.camera = camera;
    this.dockElement = document.getElementById('journey-dock')!;
    this.titleElement = document.querySelector('#title-card .title')!;
    this.factsElement = document.getElementById('body-facts');

    this.setupDock();
    this.updateFacts(this.currentBody);
  }

  // Generic mesh setter
  setMesh(body: CelestialBody, mesh: THREE.Object3D): void {
    this.meshes.set(body, mesh);
    BODIES[body].position = () => mesh.position.clone();
  }

  // Convenience methods for specific bodies
  setMoonMesh(mesh: THREE.Object3D): void {
    this.setMesh('moon', mesh);
  }

  setSunMesh(mesh: THREE.Object3D): void {
    this.setMesh('sun', mesh);
  }

  setMercuryMesh(mesh: THREE.Object3D): void {
    this.setMesh('mercury', mesh);
  }

  setVenusMesh(mesh: THREE.Object3D): void {
    this.setMesh('venus', mesh);
  }

  setMarsMesh(mesh: THREE.Object3D): void {
    this.setMesh('mars', mesh);
  }

  setJupiterMesh(mesh: THREE.Object3D): void {
    this.setMesh('jupiter', mesh);
  }

  setSaturnMesh(mesh: THREE.Object3D): void {
    this.setMesh('saturn', mesh);
  }

  setUranusMesh(mesh: THREE.Object3D): void {
    this.setMesh('uranus', mesh);
  }

  setNeptuneMesh(mesh: THREE.Object3D): void {
    this.setMesh('neptune', mesh);
  }

  private setupDock(): void {
    this.renderDock();

    this.dockElement.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-body]');
      if (target) {
        const body = target.getAttribute('data-body') as CelestialBody;
        if (body && body !== this.currentBody && !this.isFlying) {
          this.flyTo(body);
        }
      }

      // Handle group header clicks for collapse/expand
      const header = (e.target as HTMLElement).closest('.dock-group-header');
      if (header) {
        const group = header.closest('.dock-group');
        if (group) {
          group.classList.toggle('collapsed');
        }
      }
    });
  }

  private renderDock(): void {
    const renderItems = (bodies: CelestialBody[]) => {
      return bodies.map(body => `
        <div class="dock-item ${this.currentBody === body ? 'active' : ''}" data-body="${body}">
          <span class="dock-indicator"></span>
          <span class="dock-name">${BODIES[body].name}</span>
        </div>
      `).join('');
    };

    this.dockElement.innerHTML = `
      <div class="dock-group" data-group="inner">
        <div class="dock-group-header">Inner System</div>
        <div class="dock-group-items">
          ${renderItems(INNER_BODIES)}
        </div>
      </div>
      <div class="dock-group" data-group="outer">
        <div class="dock-group-header">Outer System</div>
        <div class="dock-group-items">
          ${renderItems(OUTER_BODIES)}
        </div>
      </div>
    `;
  }

  private updateFacts(body: CelestialBody): void {
    if (!this.factsElement) return;

    const facts = BODIES[body].facts;
    this.factsElement.innerHTML = `
      <div class="fact-row"><span class="fact-label">Type</span><span class="fact-value">${facts.type}</span></div>
      <div class="fact-row"><span class="fact-label">Diameter</span><span class="fact-value">${facts.diameter}</span></div>
      <div class="fact-row"><span class="fact-label">Day</span><span class="fact-value">${facts.dayLength}</span></div>
      ${facts.yearLength ? `<div class="fact-row"><span class="fact-label">Year</span><span class="fact-value">${facts.yearLength}</span></div>` : ''}
      ${facts.moons !== undefined ? `<div class="fact-row"><span class="fact-label">Moons</span><span class="fact-value">${facts.moons}</span></div>` : ''}
      <div class="fact-highlight">${facts.funFact}</div>
    `;
  }

  private formatDistance(targetPos: THREE.Vector3): string {
    const currentPos = BODIES[this.currentBody].position();
    const distance = currentPos.distanceTo(targetPos);
    return LogScale.formatDistance(distance);
  }

  /**
   * Calculate journey parameters based on distance
   */
  private calculateJourneyParams(fromBody: CelestialBody, toBody: CelestialBody): { midZoom: number; duration: number } {
    const fromPos = BODIES[fromBody].position();
    const toPos = BODIES[toBody].position();
    const distance = fromPos.distanceTo(toPos);

    // Log distance for scaling
    const logDist = Math.log10(Math.max(distance, 1));

    // Scale duration based on distance
    const duration = Math.min(7000, Math.max(3500, 2000 + logDist * 400));

    // Mid-zoom: zoom out to ~3x the journey distance (logDist + 0.5)
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

    this.titleElement.classList.add('transitioning');
    if (this.factsElement) {
      this.factsElement.classList.add('transitioning');
    }
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

    // Update title and facts at midpoint
    if (this.flyProgress >= 0.45 && this.flyProgress <= 0.55) {
      if (this.titleElement.textContent !== BODIES[this.targetBody].name) {
        this.titleElement.textContent = BODIES[this.targetBody].name;
        this.updateFacts(this.targetBody);
      }
    }

    // Complete
    if (this.flyProgress >= 1) {
      this.isFlying = false;
      this.currentBody = this.targetBody;
      this.targetBody = null;
      this.titleElement.classList.remove('transitioning');
      if (this.factsElement) {
        this.factsElement.classList.remove('transitioning');
      }
      this.renderDock();

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
