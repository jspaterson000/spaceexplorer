// src/objects/Sun.ts
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

export class Sun {
  readonly mesh: THREE.Group;
  private core: THREE.Mesh;
  private glow: THREE.Mesh;
  private lensflare: Lensflare;
  private orreryLensflare: Lensflare;
  private orreryFlareTimeout: ReturnType<typeof setTimeout> | null = null;

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

    // Create lens flare
    this.lensflare = new Lensflare();

    // Generate flare textures procedurally
    const flareTexture = this.createFlareTexture(256, 0.0);
    const flareRingTexture = this.createFlareTexture(256, 0.6);
    const flareHexTexture = this.createHexagonTexture(128);

    // Main sun flare - large and bright
    this.lensflare.addElement(new LensflareElement(flareTexture, 1200, 0, new THREE.Color(0xffffff)));
    this.lensflare.addElement(new LensflareElement(flareTexture, 800, 0, new THREE.Color(0xffffcc)));
    this.lensflare.addElement(new LensflareElement(flareTexture, 500, 0, new THREE.Color(0xffcc66)));

    // Secondary flares along the line
    this.lensflare.addElement(new LensflareElement(flareRingTexture, 100, 0.6, new THREE.Color(0xffbb55)));
    this.lensflare.addElement(new LensflareElement(flareHexTexture, 140, 0.7, new THREE.Color(0xffaa44)));
    this.lensflare.addElement(new LensflareElement(flareRingTexture, 180, 0.9, new THREE.Color(0xffcc66)));
    this.lensflare.addElement(new LensflareElement(flareHexTexture, 80, 1.0, new THREE.Color(0xffaa33)));

    this.mesh.add(this.lensflare);

    // Create subtle lens flare for orrery mode (much smaller)
    this.orreryLensflare = new Lensflare();
    this.orreryLensflare.addElement(new LensflareElement(flareTexture, 150, 0, new THREE.Color(0xffffee)));
    this.orreryLensflare.addElement(new LensflareElement(flareTexture, 80, 0, new THREE.Color(0xffeecc)));
    this.orreryLensflare.addElement(new LensflareElement(flareRingTexture, 40, 0.5, new THREE.Color(0xffcc88)));
    this.orreryLensflare.visible = false;
    this.mesh.add(this.orreryLensflare);

    // Position the sun (simplified - along +X axis)
    this.mesh.position.set(Sun.DISTANCE, 0, 0);
  }

  // Create a radial gradient flare texture
  private createFlareTexture(size: number, holeSize: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, size * holeSize * 0.5,
      size / 2, size / 2, size * 0.5
    );

    if (holeSize > 0) {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(0.2, 'rgba(255, 200, 150, 0.3)');
      gradient.addColorStop(0.5, 'rgba(255, 150, 100, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 220, 180, 0.8)');
      gradient.addColorStop(0.4, 'rgba(255, 180, 100, 0.4)');
      gradient.addColorStop(0.6, 'rgba(255, 120, 50, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 80, 20, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // Create a hexagonal flare texture
  private createHexagonTexture(size: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.4;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(255, 200, 150, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 100, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
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

  /**
   * Set orrery mode - moves Sun to origin, scales up, and shows subtle glow
   */
  setOrreryMode(enabled: boolean): void {
    // Clear any pending timeout
    if (this.orreryFlareTimeout) {
      clearTimeout(this.orreryFlareTimeout);
      this.orreryFlareTimeout = null;
    }

    if (enabled) {
      // In orrery mode, Sun is at origin (heliocentric)
      this.mesh.position.set(0, 0, 0);

      // Sun should be clearly the largest object
      // Target: ~8 billion meter radius (about 2.5x Earth's orrery size)
      // Sun.RADIUS = 348 million meters
      const TARGET_RADIUS = 8e9;
      const orreryScale = TARGET_RADIUS / Sun.RADIUS;
      this.mesh.scale.setScalar(orreryScale);

      // Hide all flares initially
      this.lensflare.visible = false;
      this.orreryLensflare.visible = false;
      this.glow.visible = true;

      // Show subtle orrery flare after transition (2.5 seconds)
      this.orreryFlareTimeout = setTimeout(() => {
        this.orreryLensflare.visible = true;
      }, 2500);
    } else {
      // Normal mode - Sun at compressed distance, normal size
      this.mesh.position.set(Sun.DISTANCE, 0, 0);
      this.mesh.scale.setScalar(1);
      this.lensflare.visible = true;
      this.orreryLensflare.visible = false;
      this.glow.visible = true;
    }
  }
}
