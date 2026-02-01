// src/objects/planets/Planet.ts
import * as THREE from 'three';
import {
  OrbitalElements,
  PlanetPhysicalData,
  calculateOrbitalPosition,
  calculateOrreryPosition,
} from './PlanetData';

/**
 * Abstract base class for all planets
 * Provides orbital mechanics and shared rendering logic
 */
export abstract class Planet {
  readonly mesh: THREE.Group;
  protected planetMesh: THREE.Mesh;
  protected material: THREE.ShaderMaterial;
  protected atmosphereMesh: THREE.Mesh | null = null;

  protected readonly orbitalElements: OrbitalElements;
  protected readonly physicalData: PlanetPhysicalData;
  protected readonly visualRadius: number;

  // Sun direction for lighting (from planet toward sun)
  protected sunDirection = new THREE.Vector3(1, 0, 0);

  constructor(orbitalElements: OrbitalElements, physicalData: PlanetPhysicalData) {
    this.orbitalElements = orbitalElements;
    this.physicalData = physicalData;
    this.visualRadius = physicalData.radiusReal * physicalData.visualScale;

    // Create group to hold planet + optional atmosphere
    this.mesh = new THREE.Group();

    // Create planet geometry
    const geometry = new THREE.SphereGeometry(this.visualRadius, 64, 64);

    // Create material (subclass will customize)
    this.material = this.createMaterial();
    this.planetMesh = new THREE.Mesh(geometry, this.material);

    // Apply axial tilt
    this.planetMesh.rotation.z = physicalData.axialTilt;

    this.mesh.add(this.planetMesh);

    // Create atmosphere if needed
    if (physicalData.hasAtmosphere && physicalData.atmosphereThickness) {
      this.atmosphereMesh = this.createAtmosphere();
      if (this.atmosphereMesh) {
        this.mesh.add(this.atmosphereMesh);
      }
    }

    // Set initial position
    this.updatePosition();

    // Load textures asynchronously
    this.loadTextures();
  }

  /**
   * Create the main shader material for the planet
   * Subclasses override this to customize appearance
   */
  protected abstract createMaterial(): THREE.ShaderMaterial;

  /**
   * Load textures for the planet
   * Subclasses implement texture loading
   */
  protected abstract loadTextures(): Promise<void>;

  /**
   * Create atmosphere mesh
   * Default implementation uses Fresnel glow effect
   */
  protected createAtmosphere(): THREE.Mesh | null {
    if (!this.physicalData.hasAtmosphere) return null;

    const thickness = this.physicalData.atmosphereThickness || 0.05;
    const atmosphereRadius = this.visualRadius * (1 + thickness);
    const geometry = new THREE.SphereGeometry(atmosphereRadius, 64, 64);

    const color = new THREE.Color(this.physicalData.atmosphereColor || 0x87ceeb);

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

        uniform vec3 atmosphereColor;
        uniform float intensity;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          #include <logdepthbuf_fragment>

          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - dot(viewDir, vNormal);
          fresnel = pow(fresnel, 3.0) * intensity;

          gl_FragColor = vec4(atmosphereColor, fresnel * 0.6);
        }
      `,
      uniforms: {
        atmosphereColor: { value: color },
        intensity: { value: thickness < 0.05 ? 0.5 : 1.0 },
      },
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = this.physicalData.axialTilt;
    return mesh;
  }

  /**
   * Update planet position based on current time
   */
  updatePosition(date: Date = new Date()): void {
    const [x, y, z] = calculateOrbitalPosition(this.orbitalElements, date);
    this.mesh.position.set(x, y, z);

    // Update sun direction (from planet toward sun at origin)
    this.sunDirection.set(-x, -y, -z).normalize();
    this.material.uniforms.sunDirection.value.copy(this.sunDirection);
  }

  /**
   * Update planet position for orrery mode (heliocentric with sqrt scaling)
   */
  updateOrreryPosition(date: Date = new Date()): void {
    const [x, y, z] = calculateOrreryPosition(this.orbitalElements, date);
    this.mesh.position.set(x, y, z);

    // Update sun direction (from planet toward sun at origin in orrery mode)
    this.sunDirection.set(-x, -y, -z).normalize();
    this.material.uniforms.sunDirection.value.copy(this.sunDirection);
  }

  /**
   * Set sun direction for lighting
   */
  setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    this.material.uniforms.sunDirection.value.copy(direction);
  }

  /**
   * Add planet to scene
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  /**
   * Get visual radius for navigation
   */
  getVisualRadius(): number {
    return this.visualRadius;
  }

  /**
   * Get planet name
   */
  getName(): string {
    return this.physicalData.name;
  }

  /**
   * Get default zoom level
   */
  getDefaultZoom(): number {
    return this.physicalData.defaultZoom;
  }

  /**
   * Set orrery mode - scales planet to be visible at solar system scale
   * Uses heavily compressed scaling so all planets are similar size
   * with gas giants only slightly larger than rocky planets
   */
  setOrreryMode(enabled: boolean): void {
    if (enabled) {
      // Target: all planets between 2-6 billion meters radius
      // Use very compressed scaling: radius^0.12 gives minimal variation
      // Earth (6371km) = 1.0, Jupiter = 1.35, Mercury = 0.92
      const EARTH_RADIUS = 6_371_000;
      const BASE_ORRERY_RADIUS = 3e9; // 3 billion meters base
      const sizeVariation = Math.pow(this.physicalData.radiusReal / EARTH_RADIUS, 0.12);
      const targetRadius = BASE_ORRERY_RADIUS * sizeVariation;

      // Scale factor to achieve target radius from current visual radius
      const orreryScale = targetRadius / this.visualRadius;

      this.mesh.scale.setScalar(orreryScale);
    } else {
      // Reset to normal scale
      this.mesh.scale.setScalar(1);
    }
  }
}
