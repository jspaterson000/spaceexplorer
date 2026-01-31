// src/engine/Camera.ts
import * as THREE from 'three';
import { LogScale } from './LogScale';

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  damping?: number;
}

export class Camera {
  readonly camera: THREE.PerspectiveCamera;

  private _logDistance: number;
  private targetLogDistance: number;
  private spherical = new THREE.Spherical();
  private targetSpherical = new THREE.Spherical();

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly damping: number;

  constructor(config: CameraConfig = {}) {
    const {
      fov = 60,
      near = 1,
      far = 1e15,
      minZoom = 6.5, // ~3000km - just above Earth surface
      maxZoom = 9,   // ~1M km - edge of Phase 1
      initialZoom = 7.5, // ~30,000 km
      damping = 0.08, // Smoother interpolation
    } = config;

    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.damping = damping;

    this._logDistance = initialZoom;
    this.targetLogDistance = initialZoom;

    // Start looking at Earth from above equator
    this.spherical.set(
      LogScale.logDistanceToMeters(initialZoom),
      Math.PI / 3, // theta (polar angle from top)
      0            // phi (azimuth)
    );
    this.targetSpherical.copy(this.spherical);

    this.updateCameraPosition();
  }

  get logDistance(): number {
    return this._logDistance;
  }

  get distanceMeters(): number {
    return LogScale.logDistanceToMeters(this._logDistance);
  }

  zoom(delta: number): void {
    this.targetLogDistance = LogScale.clampZoom(
      this.targetLogDistance + delta,
      this.minZoom,
      this.maxZoom
    );
  }

  rotate(deltaTheta: number, deltaPhi: number): void {
    this.targetSpherical.theta = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, this.targetSpherical.theta + deltaTheta)
    );
    this.targetSpherical.phi += deltaPhi;
  }

  update(): void {
    // Smooth interpolation
    this._logDistance += (this.targetLogDistance - this._logDistance) * this.damping;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.damping;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.damping;
    this.spherical.radius = LogScale.logDistanceToMeters(this._logDistance);

    this.updateCameraPosition();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private updateCameraPosition(): void {
    const position = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(position);
    this.camera.lookAt(0, 0, 0);
  }
}
