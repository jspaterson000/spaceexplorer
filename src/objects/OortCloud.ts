// src/objects/OortCloud.ts
import * as THREE from 'three';

/**
 * Visual representation of the Oort Cloud
 * A faint spherical shell at the outer edge of the solar system
 */
export class OortCloud {
  readonly mesh: THREE.Group;
  private innerShell: THREE.Mesh;
  private outerShell: THREE.Mesh;
  private particles: THREE.Points;

  // Oort Cloud extends from ~2,000 AU to ~100,000 AU
  // Using sqrt scaling and artistic compression for visibility
  private static readonly AU_IN_METERS = 149_597_870_700;

  // Scaled radii for orrery mode (sqrt scaling applied)
  // Inner edge: sqrt(2000) * AU ≈ 44.7 * AU, but we compress for visibility
  // We'll place it just outside Neptune's orbit visually
  private static readonly INNER_RADIUS = Math.sqrt(50) * OortCloud.AU_IN_METERS; // ~7 AU scaled
  private static readonly OUTER_RADIUS = Math.sqrt(80) * OortCloud.AU_IN_METERS; // ~9 AU scaled

  constructor() {
    this.mesh = new THREE.Group();

    // Create inner shell (subtle boundary)
    this.innerShell = this.createShell(OortCloud.INNER_RADIUS, 0x4466aa, 0.08);
    this.mesh.add(this.innerShell);

    // Create outer shell (faint edge)
    this.outerShell = this.createShell(OortCloud.OUTER_RADIUS, 0x334477, 0.05);
    this.mesh.add(this.outerShell);

    // Create scattered particles to represent icy bodies
    this.particles = this.createParticles();
    this.mesh.add(this.particles);

    // Initially hidden (only visible in orrery mode)
    this.mesh.visible = false;
  }

  private createShell(radius: number, color: number, opacity: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 64, 32);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
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
        uniform float opacity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDir = normalize(-vPosition);
          // Edge glow effect - more visible at edges
          float fresnel = 1.0 - abs(dot(viewDir, vNormal));
          fresnel = pow(fresnel, 2.0);

          gl_FragColor = vec4(color, fresnel * opacity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Mesh(geometry, material);
  }

  private createParticles(): THREE.Points {
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Distribute particles in a shell between inner and outer radius
      const radius = OortCloud.INNER_RADIUS +
        Math.random() * (OortCloud.OUTER_RADIUS - OortCloud.INNER_RADIUS);

      // Random spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Vary particle sizes
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x6688bb) },
        scale: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        uniform float scale;
        varying float vAlpha;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Size attenuation
          gl_PointSize = size * scale * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 10.0);

          // Fade with distance
          vAlpha = clamp(1.0 - (-mvPosition.z / 1e12), 0.1, 0.6);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;

        void main() {
          // Circular point with soft edges
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(color, alpha * 0.4);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geometry, material);
  }

  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }
}
