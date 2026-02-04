// src/objects/LocalBubble.ts
import * as THREE from 'three';
import {
  LOCAL_BUBBLE_CLUSTERS,
  LOCAL_BUBBLE_SCALE_FACTOR,
  type StarCluster,
} from '../data/LocalBubbleData';
import { SPECTRAL_COLORS, NEARBY_STARS, getStarColor } from '../data/NearbyStars';

/**
 * Visual representation of the Local Bubble — star clusters at galactic scale.
 */
export class LocalBubble {
  readonly mesh: THREE.Group;
  private clusterPoints: THREE.Points;
  private clusterMaterial: THREE.ShaderMaterial;
  private targetOpacity = 1.0;
  private currentOpacity = 1.0;

  private static readonly SF = LOCAL_BUBBLE_SCALE_FACTOR;

  constructor() {
    this.mesh = new THREE.Group();

    const clResult = this.createClusterPoints();
    this.clusterPoints = clResult.mesh;
    this.clusterMaterial = clResult.material;
    this.mesh.add(this.clusterPoints);

    this.mesh.visible = false;
  }

  // --- Helpers for converting light-year positions to scaled coordinates ---
  // Uses radial sqrt: preserves direction, applies sqrt compression to distance.
  private static scalePosition(pos: [number, number, number]): THREE.Vector3 {
    const x = pos[0], y = pos[1], z = pos[2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    if (dist === 0) return new THREE.Vector3(0, 0, 0);
    const scaledDist = Math.sqrt(dist) * LocalBubble.SF;
    return new THREE.Vector3(
      (x / dist) * scaledDist,
      (y / dist) * scaledDist,
      (z / dist) * scaledDist,
    );
  }

  // --- Star cluster point clouds ---
  private createClusterPoints(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    const clusters = LOCAL_BUBBLE_CLUSTERS.filter(c => c.starCount > 0);

    // Total points: cluster stars + real nearby stars (Sun's neighborhood)
    const clusterPoints = clusters.reduce((sum, c) => sum + c.starCount, 0);
    const totalPoints = clusterPoints + NEARBY_STARS.length;
    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);
    const sizes = new Float32Array(totalPoints);

    const spectralTypes = ['B', 'A', 'F', 'G', 'K', 'M'];
    const spectralWeights = [0.05, 0.1, 0.15, 0.2, 0.2, 0.3];

    let idx = 0;

    // Add real nearby stars (Sun's stellar neighborhood) using actual positions and colors
    for (const star of NEARBY_STARS) {
      const pos = LocalBubble.scalePosition(star.position);
      positions[idx * 3] = pos.x;
      positions[idx * 3 + 1] = pos.y;
      positions[idx * 3 + 2] = pos.z;

      const hex = getStarColor(star.spectralType);
      const color = new THREE.Color(hex);
      colors[idx * 3] = color.r;
      colors[idx * 3 + 1] = color.g;
      colors[idx * 3 + 2] = color.b;

      // Sun gets a slightly larger point
      sizes[idx] = star.distance === 0 ? 4.0 : 1.5 + Math.random() * 2.0;
      idx++;
    }

    // Add generated cluster stars
    for (const cluster of clusters) {
      const center = LocalBubble.scalePosition(cluster.position);
      const spreadLy = Math.min(30, cluster.starCount * 0.5);
      const spread = Math.sqrt(spreadLy) * LocalBubble.SF;

      for (let i = 0; i < cluster.starCount; i++) {
        const ox = (Math.random() - 0.5) * 2 * spread;
        const oy = (Math.random() - 0.5) * 2 * spread;
        const oz = (Math.random() - 0.5) * 2 * spread;

        positions[idx * 3] = center.x + ox;
        positions[idx * 3 + 1] = center.y + oy;
        positions[idx * 3 + 2] = center.z + oz;

        let rand = Math.random();
        let spectral = 'G';
        let cumulative = 0;
        for (let j = 0; j < spectralTypes.length; j++) {
          cumulative += spectralWeights[j];
          if (rand <= cumulative) {
            spectral = spectralTypes[j];
            break;
          }
        }
        const hex = SPECTRAL_COLORS[spectral] || SPECTRAL_COLORS['G'];
        const color = new THREE.Color(hex);
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        sizes[idx] = 1.0 + Math.random() * 3.0;
        idx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        scale: { value: 1.0 },
        opacity: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        uniform float scale;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float distanceAttenuation = 5000.0 / max(-mvPosition.z, 1.0);
          gl_PointSize = size * scale * distanceAttenuation;
          gl_PointSize = clamp(gl_PointSize, 4.0, 40.0);
          vSize = gl_PointSize;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        uniform float opacity;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float core = exp(-dist * 6.0);
          float glow = exp(-dist * 2.0) * 0.8;
          float intensity = (core + glow) * 1.5;

          vec3 coreColor = mix(vColor, vec3(1.0), 0.7);
          vec3 finalColor = mix(vColor * intensity, coreColor * intensity, core);

          gl_FragColor = vec4(finalColor, intensity * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    return { mesh: new THREE.Points(geometry, material), material };
  }

  // --- Public API ---

  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    if (visible) {
      this.currentOpacity = 1.0;
      this.targetOpacity = 1.0;
      this.updateAllOpacities(1.0);
    }
  }

  setOpacity(opacity: number): void {
    this.targetOpacity = opacity;
  }

  setOpacityImmediate(opacity: number): void {
    this.currentOpacity = opacity;
    this.targetOpacity = opacity;
    this.updateAllOpacities(opacity);
  }

  updateOpacity(damping = 0.08): void {
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * damping;
    this.updateAllOpacities(this.currentOpacity);
  }

  update(_time: number): void {
    // Reserved for future animations
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  getClusters(): StarCluster[] {
    return LOCAL_BUBBLE_CLUSTERS;
  }

  getClusterPosition(index: number): THREE.Vector3 {
    const cluster = LOCAL_BUBBLE_CLUSTERS[index];
    if (!cluster) return new THREE.Vector3();
    return LocalBubble.scalePosition(cluster.position);
  }

  private updateAllOpacities(opacity: number): void {
    this.clusterMaterial.uniforms.opacity.value = opacity;
  }
}
