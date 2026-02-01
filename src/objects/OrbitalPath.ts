import * as THREE from 'three';
import { OrbitalElements, solveKepler } from './planets/PlanetData';
import { LogScale } from '../engine/LogScale';

const AU_IN_METERS = 149_597_870_700;

export class OrbitalPath {
  readonly line: THREE.Line;
  private readonly orbitalElements: OrbitalElements;
  private visible = false;

  constructor(
    orbitalElements: OrbitalElements,
    color: number = 0x4488ff,
    segments = 128
  ) {
    this.orbitalElements = orbitalElements;

    const points = this.calculateOrbitPoints(segments);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });

    this.line = new THREE.Line(geometry, material);
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
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.line);
  }
}
