// src/objects/Satellites.ts
import * as THREE from 'three';
import type { TLE, SatelliteCategory } from '../data/types';

const CATEGORY_COLORS: Record<SatelliteCategory, THREE.Color> = {
  station: new THREE.Color(0xf97316),    // --pulse (orange)
  science: new THREE.Color(0x58a6ff),    // --ice (blue)
  communication: new THREE.Color(0x7d8590), // --stardust (gray)
  navigation: new THREE.Color(0xf4a623), // --sol (amber)
  other: new THREE.Color(0x7d8590),      // --stardust (gray)
};

export class Satellites {
  readonly mesh: THREE.InstancedMesh;
  private tles: TLE[] = [];
  private dummy = new THREE.Object3D();
  private colors: Float32Array;
  private maxCount: number;

  constructor(maxCount: number = 10000) {
    this.maxCount = maxCount;

    // Simple octahedron geometry
    const geometry = new THREE.OctahedronGeometry(50000, 0); // 50km radius visible at distance

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    // Pre-allocate color buffer
    this.colors = new Float32Array(maxCount * 3);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
  }

  setTLEs(tles: TLE[]): void {
    this.tles = tles.slice(0, this.maxCount);
    this.mesh.count = this.tles.length;

    // Set colors based on category
    for (let i = 0; i < this.tles.length; i++) {
      const color = CATEGORY_COLORS[this.tles[i].category];
      this.colors[i * 3 + 0] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }

    (this.mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  updatePositions(positions: Float32Array): void {
    const count = Math.min(positions.length / 6, this.mesh.count);

    for (let i = 0; i < count; i++) {
      const x = positions[i * 6 + 0];
      const y = positions[i * 6 + 1];
      const z = positions[i * 6 + 2];

      // Skip invalid positions
      if (x === 0 && y === 0 && z === 0) continue;

      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getTLEAtIndex(index: number): TLE | null {
    return this.tles[index] || null;
  }

  get count(): number {
    return this.mesh.count;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }
}
