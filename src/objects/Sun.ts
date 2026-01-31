// src/objects/Sun.ts
import * as THREE from 'three';

export class Sun {
  readonly mesh: THREE.Group;
  private core: THREE.Mesh;
  private glow: THREE.Mesh;

  // Compressed distance for navigation (real: 150M km, using 30M km)
  private static readonly DISTANCE = 30_000_000_000; // 30 million km in meters
  private static readonly RADIUS = 696_340_000 * 0.5; // Half real size for visual balance

  constructor() {
    this.mesh = new THREE.Group();

    // Core - bright emissive sphere
    const coreGeometry = new THREE.SphereGeometry(Sun.RADIUS, 64, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffee88,
    });
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.core);

    // Inner glow layer
    const innerGlowGeometry = new THREE.SphereGeometry(Sun.RADIUS * 1.02, 64, 64);
    const innerGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xffaa33) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, intensity * 0.5);
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    this.mesh.add(innerGlow);

    // Outer corona glow
    const coronaGeometry = new THREE.SphereGeometry(Sun.RADIUS * 1.5, 64, 64);
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xff6600) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vPositionNormal), 3.0);
          gl_FragColor = vec4(glowColor, intensity * 0.4);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(coronaGeometry, coronaMaterial);
    this.mesh.add(this.glow);

    // Position the sun (simplified - along +X axis)
    this.mesh.position.set(Sun.DISTANCE, 0, 0);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get radius(): number {
    return Sun.RADIUS;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  // Get direction from origin to sun (for lighting)
  getDirectionFromOrigin(): THREE.Vector3 {
    return this.mesh.position.clone().normalize();
  }
}
