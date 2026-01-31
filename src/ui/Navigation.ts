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
  private flyDuration = 2000; // ms
  private flyStartTime = 0;
  private flyStartPos = new THREE.Vector3();
  private flyEndPos = new THREE.Vector3();
  private flyStartZoom = 0;
  private flyEndZoom = 0;

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

    // Current camera state
    this.flyStartPos.copy(this.camera.camera.position);
    this.flyStartZoom = this.camera.logDistance;

    // Target state
    const targetConfig = BODIES[body];
    this.flyEndPos.copy(targetConfig.position());
    this.flyEndZoom = targetConfig.defaultZoom;

    // Add zoom-out-in effect: first zoom out, then in
    this.titleElement.classList.add('transitioning');
  }

  update(): void {
    if (!this.isFlying || !this.targetBody) return;

    const elapsed = performance.now() - this.flyStartTime;
    this.flyProgress = Math.min(elapsed / this.flyDuration, 1);

    // Smooth easing (ease-in-out cubic)
    const t = this.flyProgress < 0.5
      ? 4 * this.flyProgress * this.flyProgress * this.flyProgress
      : 1 - Math.pow(-2 * this.flyProgress + 2, 3) / 2;

    // Zoom out then in (parabolic)
    const zoomOut = Math.sin(this.flyProgress * Math.PI) * 1.5;
    const currentZoom = this.flyStartZoom + (this.flyEndZoom - this.flyStartZoom) * t + zoomOut;

    // Update camera target position
    this.camera.setTarget(
      this.flyEndPos.x * t + this.flyStartPos.x * (1 - t) * 0, // Smoothly move to target
      this.flyEndPos.y * t,
      this.flyEndPos.z * t
    );
    this.camera.setZoom(currentZoom);

    // Update title at midpoint
    if (this.flyProgress >= 0.5 && this.titleElement.textContent !== BODIES[this.targetBody].name) {
      this.titleElement.textContent = BODIES[this.targetBody].name;
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
