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
  autoRotateSpeed?: number;
}

export class Camera {
  readonly camera: THREE.PerspectiveCamera;

  private _logDistance: number;
  private targetLogDistance: number;
  private spherical = new THREE.Spherical();
  private targetSpherical = new THREE.Spherical();
  private targetCenter = new THREE.Vector3(0, 0, 0);
  private currentCenter = new THREE.Vector3(0, 0, 0);

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly damping: number;
  private readonly autoRotateSpeed: number;

  constructor(config: CameraConfig = {}) {
    const {
      fov = 60,
      near = 1,
      far = 1e15,
      minZoom = 6.5, // ~3000km - just above Earth surface
      maxZoom = 11,  // ~100M km - enough to see Sun journey
      initialZoom = 7.5, // ~30,000 km
      damping = 0.08, // Smoother interpolation
      autoRotateSpeed = 0.0003, // Subtle cinematic drift
    } = config;

    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.damping = damping;
    this.autoRotateSpeed = autoRotateSpeed;

    this._logDistance = initialZoom;
    this.targetLogDistance = initialZoom;

    // Start looking at Earth from near equator level
    // Three.js Spherical.set(radius, phi, theta) where phi=polar, theta=azimuthal
    this.spherical.set(
      LogScale.logDistanceToMeters(initialZoom),
      Math.PI / 2.2, // phi - slightly above equator for cinematic view
      0              // theta (azimuth)
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

  rotate(deltaAzimuth: number, deltaPolar: number): void {
    // theta = azimuthal angle (horizontal rotation around Y axis)
    this.targetSpherical.theta += deltaAzimuth;
    // phi = polar angle (vertical tilt, clamped to avoid gimbal lock)
    this.targetSpherical.phi = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, this.targetSpherical.phi + deltaPolar)
    );
  }

  setTarget(x: number, y: number, z: number): void {
    this.targetCenter.set(x, y, z);
  }

  setTargetImmediate(x: number, y: number, z: number): void {
    this.targetCenter.set(x, y, z);
    this.currentCenter.set(x, y, z);
  }

  setZoom(logDistance: number): void {
    this._logDistance = logDistance;
    this.targetLogDistance = logDistance;
  }

  getTarget(): THREE.Vector3 {
    return this.currentCenter.clone();
  }

  update(): void {
    // Cinematic auto-rotation
    this.targetSpherical.theta += this.autoRotateSpeed;
    this.spherical.theta += this.autoRotateSpeed;

    // Smooth interpolation
    this._logDistance += (this.targetLogDistance - this._logDistance) * this.damping;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.damping;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.damping;
    this.spherical.radius = LogScale.logDistanceToMeters(this._logDistance);

    // Smoothly move center
    this.currentCenter.lerp(this.targetCenter, this.damping);

    this.updateCameraPosition();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.currentCenter).add(offset);
    this.camera.lookAt(this.currentCenter);
  }
}
