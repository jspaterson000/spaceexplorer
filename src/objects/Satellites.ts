// src/objects/Satellites.ts
import * as THREE from 'three';
import type { TLE, SatelliteCategory } from '../data/types';

// Bright, saturated colors for visibility against dark space
const CATEGORY_COLORS: Record<SatelliteCategory, THREE.Color> = {
  station: new THREE.Color(0xff6b35),    // Bright orange (ISS, etc.)
  science: new THREE.Color(0x00d4ff),    // Cyan
  communication: new THREE.Color(0xaaaaaa), // Light gray (Starlink, etc.)
  navigation: new THREE.Color(0xffd700), // Gold (GPS, etc.)
  other: new THREE.Color(0x888888),      // Gray
};

export class Satellites {
  readonly mesh: THREE.Points;
  private tles: TLE[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private maxCount: number;
  private geometry: THREE.BufferGeometry;

  constructor(maxCount: number = 10000) {
    this.maxCount = maxCount;

    // Pre-allocate buffers
    this.positions = new Float32Array(maxCount * 3);
    this.colors = new Float32Array(maxCount * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Point material - visible as glowing dots
    const material = new THREE.PointsMaterial({
      size: 80000, // 80km - visible from orbital distances
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true, // Points get smaller with distance
      blending: THREE.AdditiveBlending, // Glow effect
      depthWrite: false,
    });

    this.mesh = new THREE.Points(this.geometry, material);
    this.mesh.frustumCulled = false;

    // Initially no points visible
    this.geometry.setDrawRange(0, 0);
  }

  setTLEs(tles: TLE[]): void {
    this.tles = tles.slice(0, this.maxCount);

    // Set colors based on category
    for (let i = 0; i < this.tles.length; i++) {
      const color = CATEGORY_COLORS[this.tles[i].category];
      this.colors[i * 3 + 0] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }

    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, this.tles.length);
  }

  updatePositions(positionData: Float32Array): void {
    const count = Math.min(positionData.length / 6, this.tles.length);

    for (let i = 0; i < count; i++) {
      const x = positionData[i * 6 + 0];
      const y = positionData[i * 6 + 1];
      const z = positionData[i * 6 + 2];

      this.positions[i * 3 + 0] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  getTLEAtIndex(index: number): TLE | null {
    return this.tles[index] || null;
  }

  get count(): number {
    return this.tles.length;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }
}
