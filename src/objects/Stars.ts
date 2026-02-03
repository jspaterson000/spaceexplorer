// src/objects/Stars.ts
import * as THREE from 'three';
import { NEARBY_STARS, getStarColor, Star } from '../data/NearbyStars';

/**
 * Renders nearby stars with glow shader effect
 * Uses THREE.Points for efficient rendering of multiple stars
 */
export class Stars {
  readonly mesh: THREE.Points;
  private material: THREE.ShaderMaterial;
  private stars: Star[];

  // Scale factor: 1e11 with sqrt compression for light years to viewable space
  private static readonly SCALE_FACTOR = 1e11;

  constructor() {
    this.stars = NEARBY_STARS;

    const geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.mesh = new THREE.Points(geometry, this.material);

    // Start invisible for fade-in
    this.mesh.visible = false;
  }

  private createGeometry(): THREE.BufferGeometry {
    const starCount = this.stars.length;

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const star = this.stars[i];

      // Convert light year positions to viewable space with sqrt compression
      const [x, y, z] = star.position;
      positions[i * 3] = Math.sign(x) * Math.sqrt(Math.abs(x)) * Stars.SCALE_FACTOR;
      positions[i * 3 + 1] = Math.sign(y) * Math.sqrt(Math.abs(y)) * Stars.SCALE_FACTOR;
      positions[i * 3 + 2] = Math.sign(z) * Math.sqrt(Math.abs(z)) * Stars.SCALE_FACTOR;

      // Get star color from spectral type
      const colorHex = getStarColor(star.spectralType);
      const color = new THREE.Color(colorHex);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Size based on apparent magnitude (brighter = larger)
      // Use a gentler scale so dim stars are still visible
      // Special handling for Sun (mag -26.74) vs other stars (mag -1.5 to 15)
      const magnitude = star.apparentMagnitude;
      let size: number;
      if (star.name === 'Sun') {
        // Sun should be prominent but not overwhelming
        size = 8;
      } else if (magnitude < 0) {
        // Bright stars like Sirius (-1.46), Alpha Centauri A (-0.01)
        size = 5 + (0 - magnitude) * 0.5;
      } else if (magnitude < 5) {
        // Visible to naked eye (mag 0-5)
        size = 3 + (5 - magnitude) * 0.4;
      } else {
        // Dimmer stars (mag 5-15) - ensure minimum visibility
        size = Math.max(1.5, 3 - (magnitude - 5) * 0.15);
      }
      sizes[i] = size;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geometry;
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        scale: { value: 1.0 },
        opacity: { value: 0.0 },
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

          // Calculate point size - use larger base for visibility at stellar distances
          float distanceAttenuation = 5000.0 / max(-mvPosition.z, 1.0);
          gl_PointSize = size * scale * distanceAttenuation;

          // Clamp to reasonable size range - minimum 8px for visibility
          gl_PointSize = clamp(gl_PointSize, 8.0, 80.0);
          vSize = gl_PointSize;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        uniform float opacity;

        void main() {
          // Calculate distance from center of point
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Discard pixels outside the circle
          if (dist > 0.5) discard;

          // Create bright core with soft glow
          float core = exp(-dist * 6.0);
          float glow = exp(-dist * 2.0) * 0.8;

          // Combine for bright star appearance
          float intensity = (core + glow) * 1.5;

          // Bright white core, colored glow
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
  }

  /**
   * Set visibility of the star field
   */
  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /**
   * Set opacity for fade-in/fade-out effects
   */
  setOpacity(opacity: number): void {
    this.material.uniforms.opacity.value = opacity;
  }

  /**
   * Get the position of a star by index in scaled coordinates
   */
  getStarPosition(index: number): THREE.Vector3 {
    if (index < 0 || index >= this.stars.length) {
      return new THREE.Vector3();
    }

    const star = this.stars[index];
    const [x, y, z] = star.position;

    return new THREE.Vector3(
      Math.sign(x) * Math.sqrt(Math.abs(x)) * Stars.SCALE_FACTOR,
      Math.sign(y) * Math.sqrt(Math.abs(y)) * Stars.SCALE_FACTOR,
      Math.sign(z) * Math.sqrt(Math.abs(z)) * Stars.SCALE_FACTOR
    );
  }

  /**
   * Get all star data
   */
  getStars(): Star[] {
    return this.stars;
  }

  /**
   * Add the star mesh to a scene
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }
}
