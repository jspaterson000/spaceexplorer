// src/objects/Moon.ts
import * as THREE from 'three';

const MOON_RADIUS_REAL = 1_737_000; // meters (actual)
const MOON_RADIUS = MOON_RADIUS_REAL * 3; // Scaled up 3x for visibility
const MOON_DISTANCE = 384_400_000; // meters (average, kept accurate)
const LUNAR_MONTH = 27.321661 * 24 * 60 * 60 * 1000; // ms

export class Moon {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  private static vertexShader = `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec3 vNormalWorld;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormalWorld = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      #include <logdepthbuf_vertex>
    }
  `;

  private static fragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform vec3 sunDirection;
    uniform sampler2D moonMap;
    uniform bool hasTexture;

    varying vec3 vNormalWorld;
    varying vec2 vUv;

    void main() {
      #include <logdepthbuf_fragment>

      vec3 normal = normalize(vNormalWorld);
      float sunDot = dot(normal, sunDirection);

      // Sharper terminator for Moon (no atmosphere)
      float lightFactor = smoothstep(-0.05, 0.1, sunDot);

      // Base moon color (gray)
      vec3 baseColor = hasTexture
        ? texture2D(moonMap, vUv).rgb
        : vec3(0.7, 0.7, 0.7);

      // Darken unlit side more than Earth (no atmosphere scattering)
      vec3 darkSide = baseColor * 0.02;
      vec3 color = mix(darkSide, baseColor, lightFactor);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  constructor() {
    const geometry = new THREE.SphereGeometry(MOON_RADIUS, 64, 64);

    this.material = new THREE.ShaderMaterial({
      vertexShader: Moon.vertexShader,
      fragmentShader: Moon.fragmentShader,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        moonMap: { value: null },
        hasTexture: { value: false },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    this.loadTexture();
    this.updatePosition();
  }

  private async loadTexture(): Promise<void> {
    const loader = new THREE.TextureLoader();
    try {
      const texture = await loader.loadAsync('/textures/moon_2k.jpg');
      this.material.uniforms.moonMap.value = texture;
      this.material.uniforms.hasTexture.value = true;
    } catch {
      console.log('Moon texture not found, using procedural color');
    }
  }

  updatePosition(): void {
    // Calculate Moon's orbital position based on current time
    // Using simplified circular orbit
    const now = Date.now();

    // Reference: Jan 1, 2000 at 12:00 UTC (J2000 epoch)
    const j2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
    const elapsed = now - j2000;

    // Moon's orbital phase (0 to 2π)
    const phase = (elapsed % LUNAR_MONTH) / LUNAR_MONTH * Math.PI * 2;

    // Inclined orbit (5.1° to ecliptic, simplified)
    const inclination = 5.1 * Math.PI / 180;

    // Calculate position
    const x = Math.cos(phase) * MOON_DISTANCE;
    const z = Math.sin(phase) * MOON_DISTANCE * Math.cos(inclination);
    const y = Math.sin(phase) * MOON_DISTANCE * Math.sin(inclination);

    this.mesh.position.set(x, y, z);
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(direction);
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }
}
