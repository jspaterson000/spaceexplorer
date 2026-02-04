// src/objects/LocalBubble.ts
import * as THREE from 'three';
import {
  LOCAL_BUBBLE_CLUSTERS,
  BUBBLE_BOUNDARY,
  LOCAL_BUBBLE_SCALE_FACTOR,
  type StarCluster,
} from '../data/LocalBubbleData';
import { SPECTRAL_COLORS } from '../data/NearbyStars';

/**
 * Visual representation of the Local Bubble — a ~300 ly cavity in the ISM.
 * Contains: deformed shell, boundary particles, star cluster clouds, Sun marker.
 */
export class LocalBubble {
  readonly mesh: THREE.Group;
  private shell: THREE.Mesh;
  private shellMaterial: THREE.ShaderMaterial;
  private boundaryParticles: THREE.Points;
  private boundaryMaterial: THREE.ShaderMaterial;
  private clusterPoints: THREE.Points;
  private clusterMaterial: THREE.ShaderMaterial;
  private sunMarker: THREE.Mesh;
  private sunMarkerMaterial: THREE.ShaderMaterial;
  private targetOpacity = 1.0;
  private currentOpacity = 1.0;

  private static readonly SF = LOCAL_BUBBLE_SCALE_FACTOR;

  constructor() {
    this.mesh = new THREE.Group();

    // 1. Shell
    const shellResult = this.createShell();
    this.shell = shellResult.mesh;
    this.shellMaterial = shellResult.material;
    this.mesh.add(this.shell);

    // 2. Boundary particles
    const bpResult = this.createBoundaryParticles();
    this.boundaryParticles = bpResult.mesh;
    this.boundaryMaterial = bpResult.material;
    this.mesh.add(this.boundaryParticles);

    // 3. Star clusters
    const clResult = this.createClusterPoints();
    this.clusterPoints = clResult.mesh;
    this.clusterMaterial = clResult.material;
    this.mesh.add(this.clusterPoints);

    // 4. Sun marker
    const smResult = this.createSunMarker();
    this.sunMarker = smResult.mesh;
    this.sunMarkerMaterial = smResult.material;
    this.mesh.add(this.sunMarker);

    this.mesh.visible = false;
  }

  // --- Helpers for converting light-year positions to scaled coordinates ---
  private static scaleCoord(ly: number): number {
    return Math.sign(ly) * Math.sqrt(Math.abs(ly)) * LocalBubble.SF;
  }

  private static scalePosition(pos: [number, number, number]): THREE.Vector3 {
    return new THREE.Vector3(
      LocalBubble.scaleCoord(pos[0]),
      LocalBubble.scaleCoord(pos[1]),
      LocalBubble.scaleCoord(pos[2]),
    );
  }

  // --- Shell: deformed sphere with Fresnel glow ---
  private createShell(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
    // Start with an icosphere, then deform vertices based on boundary data
    const baseRadius = Math.sqrt(250) * LocalBubble.SF; // ~250 ly average radius scaled
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 4);
    const posAttr = geometry.attributes.position;

    // For each vertex, find the direction and interpolate the radius from boundary data
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len === 0) continue;
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      // Weighted average of boundary radii based on dot product with each direction
      let weightedRadius = 0;
      let totalWeight = 0;
      for (const bp of BUBBLE_BOUNDARY) {
        const [dx, dy, dz] = bp.direction;
        const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dot = (nx * dx + ny * dy + nz * dz) / dLen;
        // Use a power function to sharpen the influence
        const weight = Math.pow(Math.max(0, dot), 4);
        weightedRadius += bp.radius * weight;
        totalWeight += weight;
      }

      const finalRadiusLy = totalWeight > 0 ? weightedRadius / totalWeight : 250;
      const finalRadius = Math.sqrt(finalRadiusLy) * LocalBubble.SF;

      posAttr.setXYZ(i, nx * finalRadius, ny * finalRadius, nz * finalRadius);
    }

    geometry.computeVertexNormals();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x4455aa) },
        baseOpacity: { value: 0.03 },
        fadeOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float baseOpacity;
        uniform float fadeOpacity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - abs(dot(viewDir, vNormal));
          fresnel = pow(fresnel, 2.0);

          // Blend from base color to lighter edge color
          vec3 edgeColor = vec3(0.4, 0.47, 0.8); // #6677cc
          vec3 finalColor = mix(color, edgeColor, fresnel);

          gl_FragColor = vec4(finalColor, fresnel * baseOpacity * 5.0 * fadeOpacity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { mesh: new THREE.Mesh(geometry, material), material };
  }

  // --- Boundary particles: scattered along the shell surface ---
  private createBoundaryParticles(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random direction on unit sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.sin(phi) * Math.sin(theta);
      const nz = Math.cos(phi);

      // Interpolate radius from boundary data (same logic as shell)
      let weightedRadius = 0;
      let totalWeight = 0;
      for (const bp of BUBBLE_BOUNDARY) {
        const [dx, dy, dz] = bp.direction;
        const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dot = (nx * dx + ny * dy + nz * dz) / dLen;
        const weight = Math.pow(Math.max(0, dot), 4);
        weightedRadius += bp.radius * weight;
        totalWeight += weight;
      }
      const radiusLy = (totalWeight > 0 ? weightedRadius / totalWeight : 250);
      // Scatter slightly around the shell (±10% radial variation)
      const jitter = 0.9 + Math.random() * 0.2;
      const radius = Math.sqrt(radiusLy * jitter) * LocalBubble.SF;

      positions[i * 3] = nx * radius;
      positions[i * 3 + 1] = ny * radius;
      positions[i * 3 + 2] = nz * radius;
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x6688cc) },
        scale: { value: 1.0 },
        fadeOpacity: { value: 1.0 },
        time: { value: 0.0 },
      },
      vertexShader: `
        attribute float size;
        uniform float scale;
        uniform float time;
        varying float vAlpha;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          gl_PointSize = size * scale * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 8.0);

          // Subtle shimmer
          float shimmer = sin(time * 0.001 + position.x * 0.00001) * 0.3 + 0.7;
          vAlpha = clamp(1.0 - (-mvPosition.z / 1e13), 0.1, 0.5) * shimmer;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float fadeOpacity;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(color, alpha * 0.4 * fadeOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { mesh: new THREE.Points(geometry, material), material };
  }

  // --- Star cluster point clouds ---
  private createClusterPoints(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    // Only create points for non-marker clusters
    const clusters = LOCAL_BUBBLE_CLUSTERS.filter(c => c.type !== 'marker');

    // Total points = sum of starCount across all clusters
    const totalPoints = clusters.reduce((sum, c) => sum + c.starCount, 0);
    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);
    const sizes = new Float32Array(totalPoints);

    // Spectral type distribution weights for generating random stars
    const spectralTypes = ['B', 'A', 'F', 'G', 'K', 'M'];
    const spectralWeights = [0.05, 0.1, 0.15, 0.2, 0.2, 0.3]; // M most common

    let idx = 0;
    for (const cluster of clusters) {
      const center = LocalBubble.scalePosition(cluster.position);
      // Spread radius scales with cluster size, but capped
      const spreadLy = Math.min(30, cluster.starCount * 0.5);
      const spread = Math.sqrt(spreadLy) * LocalBubble.SF;

      for (let i = 0; i < cluster.starCount; i++) {
        // Random position within gaussian-ish cloud around center
        const ox = (Math.random() - 0.5) * 2 * spread;
        const oy = (Math.random() - 0.5) * 2 * spread;
        const oz = (Math.random() - 0.5) * 2 * spread;

        positions[idx * 3] = center.x + ox;
        positions[idx * 3 + 1] = center.y + oy;
        positions[idx * 3 + 2] = center.z + oz;

        // Random spectral type based on weights
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

  // --- Sun marker: pulsing ring at origin ---
  private createSunMarker(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
    const radius = Math.sqrt(3) * LocalBubble.SF; // Small ring, ~3 ly equivalent
    const geometry = new THREE.RingGeometry(radius * 0.8, radius, 32);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffee88) },
        time: { value: 0.0 },
        fadeOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float fadeOpacity;
        varying vec2 vUv;

        void main() {
          // Pulsing effect
          float pulse = sin(time * 0.002) * 0.3 + 0.7;
          gl_FragColor = vec4(color, pulse * fadeOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Face the ring toward the camera by default (billboard later or just face Y)
    mesh.rotation.x = -Math.PI / 2;
    return { mesh, material };
  }

  // --- Public API (matches OortCloud/Stars pattern) ---

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

  /** Call each frame to update time-based animations (shimmer, pulse) */
  update(time: number): void {
    this.boundaryMaterial.uniforms.time.value = time;
    this.sunMarkerMaterial.uniforms.time.value = time;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  /** Get cluster data for label creation */
  getClusters(): StarCluster[] {
    return LOCAL_BUBBLE_CLUSTERS;
  }

  /** Get the scaled position of a cluster by index */
  getClusterPosition(index: number): THREE.Vector3 {
    const cluster = LOCAL_BUBBLE_CLUSTERS[index];
    if (!cluster) return new THREE.Vector3();
    return LocalBubble.scalePosition(cluster.position);
  }

  private updateAllOpacities(opacity: number): void {
    this.shellMaterial.uniforms.fadeOpacity.value = opacity;
    this.boundaryMaterial.uniforms.fadeOpacity.value = opacity;
    this.clusterMaterial.uniforms.opacity.value = opacity;
    this.sunMarkerMaterial.uniforms.fadeOpacity.value = opacity;
  }
}
