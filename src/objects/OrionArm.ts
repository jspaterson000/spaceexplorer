// src/objects/OrionArm.ts
import * as THREE from 'three';
import {
  ORION_ARM_OBJECTS,
  ORION_ARM_SCALE_FACTOR,
  type OrionArmObject,
} from '../data/OrionArmData';

const SPECTRAL_TYPES = ['B', 'A', 'F', 'G', 'K', 'M'];
const SPECTRAL_WEIGHTS = [0.05, 0.1, 0.15, 0.2, 0.2, 0.3];
const SPECTRAL_COLORS: Record<string, number> = {
  B: 0x99bbff,
  A: 0xccddff,
  F: 0xfff4e8,
  G: 0xffee88,
  K: 0xffaa44,
  M: 0xff6633,
};

/** Box-Muller transform for Gaussian-distributed random numbers. */
function randomGaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Visual representation of the Orion Arm — nebulae as glowing sprites
 * and ambient star field as point clouds.
 */
export class OrionArm {
  readonly mesh: THREE.Group;
  private sprites: THREE.Sprite[] = [];
  private starPoints: THREE.Points;
  private starMaterial: THREE.ShaderMaterial;
  private spriteMaterials: THREE.SpriteMaterial[] = [];
  private targetOpacity = 1.0;
  private currentOpacity = 1.0;

  private static readonly SF = ORION_ARM_SCALE_FACTOR;

  constructor() {
    this.mesh = new THREE.Group();

    // Create nebula sprites
    this.createNebulaSprites();

    // Create ambient star field
    const starResult = this.createStarField();
    this.starPoints = starResult.mesh;
    this.starMaterial = starResult.material;
    this.mesh.add(this.starPoints);

    this.mesh.visible = false;
  }

  private static scalePosition(pos: [number, number, number]): THREE.Vector3 {
    const x = pos[0], y = pos[1], z = pos[2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    if (dist === 0) return new THREE.Vector3(0, 0, 0);
    const scaledDist = Math.sqrt(dist) * OrionArm.SF;
    return new THREE.Vector3(
      (x / dist) * scaledDist,
      (y / dist) * scaledDist,
      (z / dist) * scaledDist,
    );
  }

  private createNebulaTexture(color: string, size: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    const res = 128;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    const cx = res / 2;
    const cy = res / 2;
    const r = res / 2;

    // Radial gradient: color center → transparent edge
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.2, color + 'cc');
    gradient.addColorStop(0.5, color + '44');
    gradient.addColorStop(1, color + '00');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, res, res);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createNebulaSprites(): void {
    for (const obj of ORION_ARM_OBJECTS) {
      if (obj.type === 'marker') continue;

      const texture = this.createNebulaTexture(obj.color, obj.radius);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 1.0,
      });

      const sprite = new THREE.Sprite(material);
      const pos = OrionArm.scalePosition(obj.position);
      sprite.position.copy(pos);

      // Scale based on radius — sqrt compression on the radius too
      const spriteScale = Math.sqrt(obj.radius) * OrionArm.SF * 0.3;
      sprite.scale.set(spriteScale, spriteScale, 1);

      this.mesh.add(sprite);
      this.sprites.push(sprite);
      this.spriteMaterials.push(material);
    }
  }

  private createStarField(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    const starCount = 600;
    // Add one extra point for the Local Bubble marker
    const totalPoints = starCount + 1;
    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);
    const sizes = new Float32Array(totalPoints);

    let idx = 0;

    // Local Bubble marker at origin
    positions[0] = 0;
    positions[1] = 0;
    positions[2] = 0;
    const markerColor = new THREE.Color(0xffee88);
    colors[0] = markerColor.r;
    colors[1] = markerColor.g;
    colors[2] = markerColor.b;
    sizes[0] = 4.0;
    idx = 1;

    // Distribute ambient stars in a natural spherical falloff
    // Use Gaussian-like distribution: dense near center, fading at edges
    const scaleRadius = 6000; // ly — characteristic radius
    for (let i = 0; i < starCount; i++) {
      // Spherical coordinates with Gaussian radial falloff
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      // Box-Muller-ish radial distribution: denser near center, tails off
      const r = scaleRadius * Math.abs(randomGaussian()) * 0.8;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.15; // Flatten to galactic plane
      const z = r * Math.sin(phi) * Math.sin(theta);

      const pos = OrionArm.scalePosition([x, y, z]);
      positions[idx * 3] = pos.x;
      positions[idx * 3 + 1] = pos.y;
      positions[idx * 3 + 2] = pos.z;

      // Random spectral type
      let rand = Math.random();
      let spectral = 'G';
      let cumulative = 0;
      for (let j = 0; j < SPECTRAL_TYPES.length; j++) {
        cumulative += SPECTRAL_WEIGHTS[j];
        if (rand <= cumulative) {
          spectral = SPECTRAL_TYPES[j];
          break;
        }
      }
      const hex = SPECTRAL_COLORS[spectral] || SPECTRAL_COLORS['G'];
      const color = new THREE.Color(hex);
      colors[idx * 3] = color.r;
      colors[idx * 3 + 1] = color.g;
      colors[idx * 3 + 2] = color.b;

      sizes[idx] = 1.0 + Math.random() * 2.5;
      idx++;
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
    // Reserved for future animations (e.g., subtle nebula pulsing)
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  getObjects(): OrionArmObject[] {
    return ORION_ARM_OBJECTS;
  }

  getObjectPosition(index: number): THREE.Vector3 {
    const obj = ORION_ARM_OBJECTS[index];
    if (!obj) return new THREE.Vector3();
    return OrionArm.scalePosition(obj.position);
  }

  private updateAllOpacities(opacity: number): void {
    this.starMaterial.uniforms.opacity.value = opacity;
    for (const mat of this.spriteMaterials) {
      mat.opacity = opacity;
    }
  }
}
