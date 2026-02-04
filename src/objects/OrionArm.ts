// src/objects/OrionArm.ts
import * as THREE from 'three';
import {
  ORION_ARM_OBJECTS,
  ORION_ARM_SCALE_FACTOR,
  MOLECULAR_CLOUDS,
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

/** Seeded pseudo-random for deterministic cloud textures. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * Visual representation of the Orion Arm — nebulae as glowing sprites,
 * molecular gas clouds as layered wispy volumes, and ambient star field.
 */
export class OrionArm {
  readonly mesh: THREE.Group;
  private sprites: THREE.Sprite[] = [];
  private cloudSprites: THREE.Sprite[] = [];
  private starPoints: THREE.Points;
  private starMaterial: THREE.ShaderMaterial;
  private spriteMaterials: THREE.SpriteMaterial[] = [];
  private cloudMaterials: THREE.SpriteMaterial[] = [];
  private targetOpacity = 1.0;
  private currentOpacity = 1.0;

  private static readonly SF = ORION_ARM_SCALE_FACTOR;

  constructor() {
    this.mesh = new THREE.Group();

    // Create gas clouds first (behind everything)
    this.createMolecularClouds();

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

  // --- Cloud texture generation ---

  /**
   * Creates an organic, wispy cloud texture using layered radial gradients
   * with randomized offsets to break symmetry.
   */
  private createCloudTexture(color: string, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    const res = 256;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    const rand = seededRandom(seed);
    const cx = res / 2;
    const cy = res / 2;

    // Layer multiple offset radial gradients for organic look
    const blobCount = 4 + Math.floor(rand() * 3);
    for (let i = 0; i < blobCount; i++) {
      const ox = cx + (rand() - 0.5) * res * 0.4;
      const oy = cy + (rand() - 0.5) * res * 0.4;
      const r = res * (0.25 + rand() * 0.3);

      const gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
      const alpha = 0.06 + rand() * 0.06;
      gradient.addColorStop(0, color + this.alphaHex(alpha * 1.5));
      gradient.addColorStop(0.3, color + this.alphaHex(alpha));
      gradient.addColorStop(0.7, color + this.alphaHex(alpha * 0.3));
      gradient.addColorStop(1, color + '00');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, res, res);
    }

    // Soft outer vignette to fade edges
    const vignette = ctx.createRadialGradient(cx, cy, res * 0.2, cx, cy, res * 0.5);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-in';

    // Use an elliptical clip for non-circular shape
    ctx.save();
    ctx.beginPath();
    const scaleX = 0.8 + rand() * 0.4;
    const scaleY = 0.8 + rand() * 0.4;
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleY);
    ctx.arc(0, 0, res * 0.5, 0, Math.PI * 2);
    ctx.restore();
    ctx.fillStyle = vignette;
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /** Convert a 0-1 alpha to a 2-char hex string. */
  private alphaHex(a: number): string {
    const clamped = Math.max(0, Math.min(1, a));
    return Math.round(clamped * 255).toString(16).padStart(2, '0');
  }

  private createMolecularClouds(): void {
    for (const cloud of MOLECULAR_CLOUDS) {
      const center = OrionArm.scalePosition(cloud.position);
      const baseScale = Math.sqrt(cloud.extent) * OrionArm.SF * 0.6;

      for (let i = 0; i < cloud.layers; i++) {
        const texture = this.createCloudTexture(cloud.color, i * 1000 + cloud.distance);
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.35,
        });

        const sprite = new THREE.Sprite(material);

        // Offset each layer slightly for volume
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * baseScale * 0.3,
          (Math.random() - 0.5) * baseScale * 0.1,
          (Math.random() - 0.5) * baseScale * 0.3,
        );
        sprite.position.copy(center).add(offset);

        // Vary scale per layer
        const layerScale = baseScale * (0.8 + Math.random() * 0.5);
        sprite.scale.set(layerScale, layerScale * (0.5 + Math.random() * 0.3), 1);

        // Random initial rotation
        sprite.material.rotation = Math.random() * Math.PI * 2;

        this.mesh.add(sprite);
        this.cloudSprites.push(sprite);
        this.cloudMaterials.push(material);
      }
    }
  }

  // --- Nebula texture ---

  private createNebulaTexture(color: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    const res = 128;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    const cx = res / 2;
    const cy = res / 2;
    const r = res / 2;

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

      const texture = this.createNebulaTexture(obj.color);
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

      const spriteScale = Math.sqrt(obj.radius) * OrionArm.SF * 0.3;
      sprite.scale.set(spriteScale, spriteScale, 1);

      this.mesh.add(sprite);
      this.sprites.push(sprite);
      this.spriteMaterials.push(material);
    }
  }

  // --- Star field ---

  private createStarField(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    const starCount = 600;
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

    const scaleRadius = 6000;
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = scaleRadius * Math.abs(randomGaussian()) * 0.8;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.15;
      const z = r * Math.sin(phi) * Math.sin(theta);

      const pos = OrionArm.scalePosition([x, y, z]);
      positions[idx * 3] = pos.x;
      positions[idx * 3 + 1] = pos.y;
      positions[idx * 3 + 2] = pos.z;

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

  update(time: number): void {
    // Subtle slow rotation on cloud layers for living, breathing feel
    const t = time * 0.00003;
    for (let i = 0; i < this.cloudSprites.length; i++) {
      this.cloudSprites[i].material.rotation += (i % 2 === 0 ? 1 : -1) * 0.00002;
    }
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
    for (const mat of this.cloudMaterials) {
      mat.opacity = 0.35 * opacity;
    }
  }
}
