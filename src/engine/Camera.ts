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

// Easing functions for cinematic transitions
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4);
};

interface TransitionState {
  active: boolean;
  startTime: number;
  duration: number;
  startLogDistance: number;
  startPhi: number;
  startTheta: number;
  startCenter: THREE.Vector3;
  targetLogDistance: number;
  targetPhi: number;
  targetTheta: number;
  targetCenter: THREE.Vector3;
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
  private readonly baseDamping: number;
  private damping: number;
  private readonly autoRotateSpeed: number;
  private autoRotateEnabled = true;
  private transitionEndTime = 0;

  // Cinematic transition state
  private transition: TransitionState = {
    active: false,
    startTime: 0,
    duration: 0,
    startLogDistance: 0,
    startPhi: 0,
    startTheta: 0,
    startCenter: new THREE.Vector3(),
    targetLogDistance: 0,
    targetPhi: 0,
    targetTheta: 0,
    targetCenter: new THREE.Vector3(),
  };

  constructor(config: CameraConfig = {}) {
    const {
      fov = 60,
      near = 1,
      far = 1e15,
      minZoom = 6.5, // ~3000km - just above Earth surface
      maxZoom = 13,  // ~10B km - enough to see Neptune at 4.5B km
      initialZoom = 7.5, // ~30,000 km
      damping = 0.08, // Smoother interpolation
      autoRotateSpeed = 0.0003, // Subtle cinematic drift
    } = config;

    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.baseDamping = damping;
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
    // Stop auto-rotation on first manual interaction
    this.autoRotateEnabled = false;

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

  setAngleImmediate(theta: number, phi: number): void {
    this.spherical.theta = theta;
    this.spherical.phi = phi;
    this.targetSpherical.theta = theta;
    this.targetSpherical.phi = phi;
  }

  setAutoRotate(enabled: boolean): void {
    this.autoRotateEnabled = enabled;
  }

  getTarget(): THREE.Vector3 {
    return this.currentCenter.clone();
  }

  setOrreryView(): void {
    // Start cinematic transition to orrery view
    this.transition = {
      active: true,
      startTime: performance.now(),
      duration: 3500, // 3.5 seconds for grand sweep
      startLogDistance: this._logDistance,
      startPhi: this.spherical.phi,
      startTheta: this.spherical.theta,
      startCenter: this.currentCenter.clone(),
      targetLogDistance: 11.8, // See whole system
      targetPhi: Math.PI / 6, // 30 degrees from vertical
      targetTheta: this.spherical.theta + Math.PI * 0.15, // Slight rotation during transition
      targetCenter: new THREE.Vector3(0, 0, 0), // Center on Sun
    };

    this.autoRotateEnabled = false;
  }

  returnFromOrreryView(target: THREE.Vector3, zoom: number): void {
    // Start cinematic transition back to planet
    this.transition = {
      active: true,
      startTime: performance.now(),
      duration: 2500, // 2.5 seconds
      startLogDistance: this._logDistance,
      startPhi: this.spherical.phi,
      startTheta: this.spherical.theta,
      startCenter: this.currentCenter.clone(),
      targetLogDistance: zoom,
      targetPhi: Math.PI / 2.2, // Equatorial view
      targetTheta: this.spherical.theta - Math.PI * 0.1, // Slight counter-rotation
      targetCenter: target.clone(),
    };
  }

  setPlanetView(target: THREE.Vector3, zoom: number): void {
    this.targetCenter.copy(target);
    this.targetLogDistance = zoom;
  }

  update(): void {
    // Handle cinematic transitions with easing
    if (this.transition.active) {
      const elapsed = performance.now() - this.transition.startTime;
      const progress = Math.min(elapsed / this.transition.duration, 1);
      const eased = easeInOutCubic(progress);

      // Interpolate all values with easing
      this._logDistance = this.transition.startLogDistance +
        (this.transition.targetLogDistance - this.transition.startLogDistance) * eased;
      this.spherical.phi = this.transition.startPhi +
        (this.transition.targetPhi - this.transition.startPhi) * eased;
      this.spherical.theta = this.transition.startTheta +
        (this.transition.targetTheta - this.transition.startTheta) * eased;
      this.currentCenter.lerpVectors(
        this.transition.startCenter,
        this.transition.targetCenter,
        eased
      );

      // Update targets to match for when transition ends
      this.targetLogDistance = this._logDistance;
      this.targetSpherical.phi = this.spherical.phi;
      this.targetSpherical.theta = this.spherical.theta;
      this.targetCenter.copy(this.currentCenter);

      // End transition
      if (progress >= 1) {
        this.transition.active = false;
      }

      this.spherical.radius = LogScale.logDistanceToMeters(this._logDistance);
      this.updateCameraPosition();
      return;
    }

    // Restore normal damping after transition completes
    if (this.transitionEndTime > 0 && performance.now() > this.transitionEndTime) {
      this.damping = this.baseDamping;
      this.transitionEndTime = 0;
    }

    // Cinematic auto-rotation (until first manual interaction)
    if (this.autoRotateEnabled) {
      this.targetSpherical.theta += this.autoRotateSpeed;
      this.spherical.theta += this.autoRotateSpeed;
    }

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
