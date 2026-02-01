// src/objects/planets/Saturn.ts
import * as THREE from 'three';
import { GasGiant } from './GasGiant';
import { SaturnRings } from './SaturnRings';
import { ORBITAL_ELEMENTS, PLANET_DATA } from './PlanetData';

/**
 * Saturn with its iconic ring system
 * Extends GasGiant with ring rendering
 */
export class Saturn extends GasGiant {
  private rings: SaturnRings;

  constructor() {
    super(ORBITAL_ELEMENTS.saturn, PLANET_DATA.saturn);

    // Saturn has subtle, slow bands
    this.bandSpeed = 0.00008;
    this.bandIntensity = 0.15;
    this.material.uniforms.bandSpeed.value = this.bandSpeed;
    this.material.uniforms.bandIntensity.value = this.bandIntensity;

    // Create ring system
    this.rings = new SaturnRings(this.visualRadius, this.mesh.position);

    // Apply Saturn's axial tilt to rings
    this.rings.mesh.rotation.z = this.physicalData.axialTilt;

    // Add rings to the planet group
    this.mesh.add(this.rings.mesh);
  }

  /**
   * Override updatePosition to also update rings
   */
  updatePosition(date: Date = new Date()): void {
    super.updatePosition(date);

    // Update ring sun direction (rings may not exist during initial construction)
    if (this.rings) {
      this.rings.setSunDirection(this.sunDirection);
      this.rings.updatePlanetPosition(this.mesh.position);
    }
  }

  /**
   * Override updateOrreryPosition to also update rings
   */
  updateOrreryPosition(date: Date = new Date()): void {
    super.updateOrreryPosition(date);

    if (this.rings) {
      this.rings.setSunDirection(this.sunDirection);
      this.rings.updatePlanetPosition(this.mesh.position);
    }
  }

  /**
   * Override setSunDirection to also update rings
   */
  setSunDirection(direction: THREE.Vector3): void {
    super.setSunDirection(direction);
    if (this.rings) {
      this.rings.setSunDirection(direction);
    }
  }

  /**
   * Override setOrreryMode to also update ring uniforms
   */
  setOrreryMode(enabled: boolean): void {
    super.setOrreryMode(enabled);

    if (this.rings) {
      // Update ring shader uniforms to match the new scale
      const scale = enabled ? this.mesh.scale.x : 1;
      this.rings.setScale(scale, this.visualRadius);
    }
  }

  protected createAtmosphere(): THREE.Mesh | null {
    const atmosphereRadius = this.visualRadius * 1.05;
    const geometry = new THREE.SphereGeometry(atmosphereRadius, 64, 64);

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        #include <common>
        #include <logdepthbuf_pars_vertex>

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

          #include <logdepthbuf_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <logdepthbuf_pars_fragment>

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          #include <logdepthbuf_fragment>

          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - dot(viewDir, vNormal);
          fresnel = pow(fresnel, 2.5);

          // Warm golden atmosphere glow
          vec3 atmosphereColor = vec3(1.0, 0.9, 0.6);
          gl_FragColor = vec4(atmosphereColor, fresnel * 0.35);
        }
      `,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = this.physicalData.axialTilt;
    return mesh;
  }
}
