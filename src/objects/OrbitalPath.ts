import * as THREE from 'three';
import { OrbitalElements, solveKepler } from './planets/PlanetData';
import { LogScale } from '../engine/LogScale';

const AU_IN_METERS = 149_597_870_700;

export class OrbitalPath {
  readonly line: THREE.Line;
  private readonly orbitalElements: OrbitalElements;
  private visible = false;
  private material: THREE.LineBasicMaterial;
  private baseOpacity = 0.3;
  private targetOpacity = 0.3;
  private currentOpacity = 0.3;

  constructor(
    orbitalElements: OrbitalElements,
    color: number = 0x4488ff,
    segments = 128
  ) {
    this.orbitalElements = orbitalElements;

    const points = this.calculateOrbitPoints(segments);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    this.material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
    });

    this.line = new THREE.Line(geometry, this.material);
    this.line.visible = this.visible;
  }

  private calculateOrbitPoints(segments: number): THREE.Vector3[] {
    const { a, e, i, omega, w } = this.orbitalElements;
    const points: THREE.Vector3[] = [];

    for (let j = 0; j <= segments; j++) {
      const M = (j / segments) * 2 * Math.PI;
      const E = solveKepler(M, e);

      // True anomaly
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
      );

      // Distance from Sun
      const r = a * (1 - e * Math.cos(E));

      // Position in orbital plane
      const xOrbital = r * Math.cos(nu);
      const yOrbital = r * Math.sin(nu);

      // Rotation to ecliptic coordinates
      const cosW = Math.cos(w);
      const sinW = Math.sin(w);
      const cosI = Math.cos(i);
      const sinI = Math.sin(i);
      const cosOmega = Math.cos(omega);
      const sinOmega = Math.sin(omega);

      const x = (cosOmega * cosW - sinOmega * sinW * cosI) * xOrbital +
                (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrbital;
      const y = (sinOmega * cosW + cosOmega * sinW * cosI) * xOrbital +
                (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrbital;
      const z = (sinW * sinI) * xOrbital + (cosW * sinI) * yOrbital;

      // Apply orrery scaling (square root of AU)
      const distanceAU = Math.sqrt(x * x + y * y + z * z) / AU_IN_METERS;
      const scale = distanceAU > 0 ? LogScale.orreryOrbitScale(distanceAU) / distanceAU : 1;

      points.push(new THREE.Vector3(x * scale, y * scale, z * scale));
    }

    return points;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.line.visible = visible;
    if (visible) {
      this.currentOpacity = this.baseOpacity;
      this.targetOpacity = this.baseOpacity;
      this.material.opacity = this.baseOpacity;
    }
  }

  /**
   * Set target opacity for smooth fade transitions
   */
  setOpacity(opacity: number): void {
    this.targetOpacity = opacity * this.baseOpacity;
  }

  /**
   * Update opacity interpolation - call each frame for smooth fades
   */
  updateOpacity(damping = 0.08): void {
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * damping;
    this.material.opacity = this.currentOpacity;
  }

  /**
   * Immediately set opacity without interpolation
   */
  setOpacityImmediate(opacity: number): void {
    this.currentOpacity = opacity * this.baseOpacity;
    this.targetOpacity = this.currentOpacity;
    this.material.opacity = this.currentOpacity;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.line);
  }
}
