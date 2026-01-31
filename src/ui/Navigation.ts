// src/ui/Navigation.ts
import * as THREE from 'three';
import { Camera } from '../engine/Camera';
import { LogScale } from '../engine/LogScale';

export type CelestialBody = 'earth' | 'moon';

interface BodyConfig {
  name: string;
  position: () => THREE.Vector3;
  radius: number;
  defaultZoom: number; // logDistance when viewing this body
}

const BODIES: Record<CelestialBody, BodyConfig> = {
  earth: {
    name: 'Earth',
    position: () => new THREE.Vector3(0, 0, 0),
    radius: 6_371_000,
    defaultZoom: 7.5,
  },
  moon: {
    name: 'Moon',
    position: () => new THREE.Vector3(0, 0, 0), // Will be updated dynamically
    radius: 1_737_000 * 3, // Visual radius (scaled)
    defaultZoom: 7.3, // Further out to see the whole Moon
  },
};

export class Navigation {
  private camera: Camera;
  private currentBody: CelestialBody = 'earth';
  private targetBody: CelestialBody | null = null;
  private isFlying = false;
  private flyProgress = 0;
  private flyDuration = 3500; // ms - longer for elegance
  private flyStartTime = 0;
  private flyStartTarget = new THREE.Vector3();
  private flyEndTarget = new THREE.Vector3();
  private flyStartZoom = 0;
  private flyEndZoom = 0;
  private flyMidZoom = 0; // Peak zoom out

  private dockElement: HTMLElement;
  private titleElement: HTMLElement;
  private onBodyChange: ((body: CelestialBody) => void) | null = null;

  // Reference to Moon mesh for dynamic position
  private moonMesh: THREE.Object3D | null = null;

  constructor(camera: Camera) {
    this.camera = camera;
    this.dockElement = document.getElementById('journey-dock')!;
    this.titleElement = document.querySelector('#title-card .title')!;

    this.setupDock();
  }

  setMoonMesh(mesh: THREE.Object3D): void {
    this.moonMesh = mesh;
    // Update moon position getter
    BODIES.moon.position = () => mesh.position.clone();
  }

  private setupDock(): void {
    this.renderDock();

    // Add click handlers
    this.dockElement.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-body]');
      if (target) {
        const body = target.getAttribute('data-body') as CelestialBody;
        if (body && body !== this.currentBody && !this.isFlying) {
          this.flyTo(body);
        }
      }
    });
  }

  private renderDock(): void {
    this.dockElement.innerHTML = `
      <div class="dock-item ${this.currentBody === 'earth' ? 'active' : ''}" data-body="earth">
        <span class="dock-indicator"></span>
        <span class="dock-name">Earth</span>
      </div>
      <div class="dock-item ${this.currentBody === 'moon' ? 'active' : ''}" data-body="moon">
        <span class="dock-indicator"></span>
        <span class="dock-name">Moon</span>
      </div>
    `;
  }

  private formatDistance(targetPos: THREE.Vector3): string {
    const currentPos = BODIES[this.currentBody].position();
    const distance = currentPos.distanceTo(targetPos);
    return LogScale.formatDistance(distance);
  }

  flyTo(body: CelestialBody): void {
    if (this.isFlying || body === this.currentBody) return;

    this.targetBody = body;
    this.isFlying = true;
    this.flyProgress = 0;
    this.flyStartTime = performance.now();

    // Current state - save the body position we're orbiting
    this.flyStartTarget.copy(BODIES[this.currentBody].position());
    this.flyStartZoom = this.camera.logDistance;

    // Target state
    const targetConfig = BODIES[body];
    this.flyEndTarget.copy(targetConfig.position());
    this.flyEndZoom = targetConfig.defaultZoom;

    // Calculate elegant arc - zoom out to see both bodies
    // Peak zoom is enough to see both Earth and Moon
    this.flyMidZoom = 9.0; // ~1M km view

    this.titleElement.classList.add('transitioning');
  }

  update(): void {
    if (!this.isFlying || !this.targetBody) return;

    const elapsed = performance.now() - this.flyStartTime;
    this.flyProgress = Math.min(elapsed / this.flyDuration, 1);

    // Ultra-smooth easing (custom bezier-like curve)
    // Slow start, smooth middle, gentle end
    const t = this.easeInOutQuart(this.flyProgress);

    // Elegant zoom arc: smooth rise and fall
    // Use sine for natural arc, peaks at 0.4 progress for visual appeal
    const zoomArc = Math.sin(this.flyProgress * Math.PI);
    const zoomPeak = this.flyMidZoom - Math.min(this.flyStartZoom, this.flyEndZoom);

    // Blend between start->peak->end zoom
    let currentZoom: number;
    if (this.flyProgress < 0.5) {
      // First half: ease from start to peak
      const halfT = this.easeOutCubic(this.flyProgress * 2);
      currentZoom = this.flyStartZoom + (this.flyMidZoom - this.flyStartZoom) * halfT;
    } else {
      // Second half: ease from peak to end
      const halfT = this.easeInCubic((this.flyProgress - 0.5) * 2);
      currentZoom = this.flyMidZoom + (this.flyEndZoom - this.flyMidZoom) * halfT;
    }

    // Smoothly interpolate target position from start body to end body
    const targetX = this.flyStartTarget.x + (this.flyEndTarget.x - this.flyStartTarget.x) * t;
    const targetY = this.flyStartTarget.y + (this.flyEndTarget.y - this.flyStartTarget.y) * t;
    const targetZ = this.flyStartTarget.z + (this.flyEndTarget.z - this.flyStartTarget.z) * t;

    this.camera.setTargetImmediate(targetX, targetY, targetZ);
    this.camera.setZoom(currentZoom);

    // Update title at midpoint with fade
    if (this.flyProgress >= 0.45 && this.flyProgress <= 0.55) {
      if (this.titleElement.textContent !== BODIES[this.targetBody].name) {
        this.titleElement.textContent = BODIES[this.targetBody].name;
      }
    }

    // Complete
    if (this.flyProgress >= 1) {
      this.isFlying = false;
      this.currentBody = this.targetBody;
      this.targetBody = null;
      this.titleElement.classList.remove('transitioning');
      this.renderDock();

      if (this.onBodyChange) {
        this.onBodyChange(this.currentBody);
      }
    }
  }

  // Easing functions for elegant motion
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
  checkBodyClick(raycaster: THREE.Raycaster, meshes: { earth: THREE.Object3D; moon: THREE.Object3D }): CelestialBody | null {
    const earthIntersects = raycaster.intersectObject(meshes.earth);
    if (earthIntersects.length > 0 && this.currentBody !== 'earth') {
      return 'earth';
    }

    const moonIntersects = raycaster.intersectObject(meshes.moon);
    if (moonIntersects.length > 0 && this.currentBody !== 'moon') {
      return 'moon';
    }

    return null;
  }
}
