// src/objects/MilkyWay.ts
import * as THREE from 'three';
import {
  SPIRAL_ARMS,
  GALACTIC_BAR,
  GALACTIC_FEATURES,
  MILKY_WAY_SCALE_FACTOR,
  SUN_GALACTIC_POSITION,
  type SpiralArm,
  type GalacticFeature,
} from '../data/MilkyWayData';

/** Box-Muller Gaussian random. */
function randomGaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Seeded pseudo-random for deterministic textures. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * Visual representation of the Milky Way galaxy.
 * Spiral arms as particle stars + wispy gas cloud sprites.
 * Central bar + bulge. Sun marker.
 */
export class MilkyWay {
  readonly mesh: THREE.Group;
  private armPoints: THREE.Points;
  private armMaterial: THREE.ShaderMaterial;
  private cloudSprites: THREE.Sprite[] = [];
  private cloudMaterials: THREE.SpriteMaterial[] = [];
  private armCloudMaterials: Map<string, THREE.SpriteMaterial[]> = new Map();
  private bulgeMaterial: THREE.SpriteMaterial | null = null;
  private sunHaloMaterial: THREE.SpriteMaterial | null = null;
  private targetOpacity = 1.0;
  private currentOpacity = 1.0;
  private highlightedArm: string | null = null;

  private static readonly SF = MILKY_WAY_SCALE_FACTOR;

  constructor() {
    this.mesh = new THREE.Group();

    // Central bulge (behind everything)
    this.createBulge();

    // Gas clouds along arms
    this.createArmClouds();

    // Star particles (arms + bar + disk)
    const result = this.createStarParticles();
    this.armPoints = result.mesh;
    this.armMaterial = result.material;
    this.mesh.add(this.armPoints);

    // Sun halo pulse sprite
    this.createSunHalo();

    this.mesh.visible = false;
  }

  /**
   * Scale galactic coordinates (ly from galactic center) to scene units.
   * Uses sqrt compression to keep the galaxy viewable.
   */
  private static scalePosition(pos: [number, number, number]): THREE.Vector3 {
    const x = pos[0], y = pos[1], z = pos[2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    if (dist === 0) return new THREE.Vector3(0, 0, 0);
    const scaledDist = Math.sqrt(dist) * MilkyWay.SF;
    return new THREE.Vector3(
      (x / dist) * scaledDist,
      (y / dist) * scaledDist,
      (z / dist) * scaledDist,
    );
  }

  /**
   * Get a point along a logarithmic spiral arm.
   * r = innerRadius * e^(b * (θ - startAngle))
   * where b = tan(pitchAngle in radians)
   */
  private static spiralPoint(arm: SpiralArm, theta: number): [number, number] {
    const b = Math.tan(arm.pitchAngle * Math.PI / 180);
    const r = arm.innerRadius * Math.exp(b * (theta - arm.startAngle));
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    return [x, z];
  }

  // --- Central bulge ---

  private createBulge(): void {
    const canvas = document.createElement('canvas');
    const res = 256;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    const cx = res / 2, cy = res / 2;

    // Warm radial glow for the bulge
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, res / 2);
    gradient.addColorStop(0, '#ffddaa44');
    gradient.addColorStop(0.15, '#eebb7733');
    gradient.addColorStop(0.4, '#cc994418');
    gradient.addColorStop(0.7, '#88663308');
    gradient.addColorStop(1, '#00000000');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, res, res);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.35,
    });
    this.bulgeMaterial = material;

    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 0, 0);
    const bulgeScale = Math.sqrt(8000) * MilkyWay.SF * 0.8;
    sprite.scale.set(bulgeScale, bulgeScale, 1);

    this.mesh.add(sprite);
  }

  // --- Sun halo pulse ---

  private createSunHalo(): void {
    const canvas = document.createElement('canvas');
    const res = 128;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;
    const cx = res / 2, cy = res / 2;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, res / 2);
    gradient.addColorStop(0, '#ffee8866');
    gradient.addColorStop(0.2, '#ffdd6633');
    gradient.addColorStop(0.5, '#ffcc4418');
    gradient.addColorStop(1, '#00000000');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, res, res);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.3,
    });
    this.sunHaloMaterial = material;

    const sprite = new THREE.Sprite(material);
    const sunPos = MilkyWay.scalePosition(SUN_GALACTIC_POSITION);
    sprite.position.copy(sunPos);
    const haloScale = Math.sqrt(3000) * MilkyWay.SF * 0.25;
    sprite.scale.set(haloScale, haloScale, 1);
    this.mesh.add(sprite);
  }

  // --- Gas clouds along spiral arms ---

  private createCloudTexture(color: string, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    const res = 256;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    const rand = seededRandom(seed);
    const cx = res / 2, cy = res / 2;

    const blobCount = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < blobCount; i++) {
      const ox = cx + (rand() - 0.5) * res * 0.4;
      const oy = cy + (rand() - 0.5) * res * 0.4;
      const r = res * (0.2 + rand() * 0.3);

      const gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
      const alpha = 0.04 + rand() * 0.04;
      const a1 = Math.round(Math.min(1, alpha * 1.5) * 255).toString(16).padStart(2, '0');
      const a2 = Math.round(Math.min(1, alpha) * 255).toString(16).padStart(2, '0');
      const a3 = Math.round(Math.min(1, alpha * 0.3) * 255).toString(16).padStart(2, '0');

      gradient.addColorStop(0, color + a1);
      gradient.addColorStop(0.3, color + a2);
      gradient.addColorStop(0.7, color + a3);
      gradient.addColorStop(1, color + '00');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, res, res);
    }

    // Soft vignette
    const vignette = ctx.createRadialGradient(cx, cy, res * 0.15, cx, cy, res * 0.5);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, res, res);
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createArmClouds(): void {
    for (const arm of SPIRAL_ARMS) {
      const angleRange = arm.endAngle - arm.startAngle;
      const armMats: THREE.SpriteMaterial[] = [];

      for (let i = 0; i < arm.cloudCount; i++) {
        const frac = (i + 0.5) / arm.cloudCount;
        const theta = arm.startAngle + frac * angleRange;
        const [cx, cz] = MilkyWay.spiralPoint(arm, theta);

        // Offset for organic placement
        const ox = (Math.random() - 0.5) * arm.width * 1.5;
        const oz = (Math.random() - 0.5) * arm.width * 1.5;
        const oy = (Math.random() - 0.5) * 400;

        const pos = MilkyWay.scalePosition([cx + ox, oy, cz + oz]);
        const texture = this.createCloudTexture(arm.color, i * 1000 + arm.innerRadius);
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.12,
          rotation: Math.random() * Math.PI * 2,
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.copy(pos);
        const cloudScale = Math.sqrt(arm.width * 1.5) * MilkyWay.SF * 0.3;
        sprite.scale.set(
          cloudScale * (0.8 + Math.random() * 0.4),
          cloudScale * (0.4 + Math.random() * 0.3),
          1,
        );

        this.mesh.add(sprite);
        this.cloudSprites.push(sprite);
        this.cloudMaterials.push(material);
        armMats.push(material);
      }

      this.armCloudMaterials.set(arm.name, armMats);
    }
  }

  // --- Star particles ---

  private createStarParticles(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    // Count total particles
    const armStars = SPIRAL_ARMS.reduce((s, a) => s + a.starCount, 0);
    const barStars = GALACTIC_BAR.starCount;
    const diskStars = 400; // thin disk background
    const featureStars = 2; // Sun + galactic center markers
    const totalPoints = armStars + barStars + diskStars + featureStars;

    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);
    const sizes = new Float32Array(totalPoints);

    let idx = 0;
    const SPECTRAL_TYPES = ['B', 'A', 'F', 'G', 'K', 'M'];
    const SPECTRAL_WEIGHTS = [0.03, 0.08, 0.15, 0.24, 0.25, 0.25];
    const SPECTRAL_HEX: Record<string, number> = {
      B: 0x99bbff, A: 0xccddff, F: 0xfff4e8,
      G: 0xffee88, K: 0xffaa44, M: 0xff6633,
    };

    function pickSpectral(): string {
      let r = Math.random(), cum = 0;
      for (let j = 0; j < SPECTRAL_TYPES.length; j++) {
        cum += SPECTRAL_WEIGHTS[j];
        if (r <= cum) return SPECTRAL_TYPES[j];
      }
      return 'G';
    }

    function setPoint(
      i: number, pos: THREE.Vector3, hex: number, size: number,
    ) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      const c = new THREE.Color(hex);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = size;
    }

    // --- Spiral arm stars ---
    for (const arm of SPIRAL_ARMS) {
      const angleRange = arm.endAngle - arm.startAngle;
      for (let i = 0; i < arm.starCount; i++) {
        const theta = arm.startAngle + Math.random() * angleRange;
        const [cx, cz] = MilkyWay.spiralPoint(arm, theta);

        // Gaussian spread perpendicular to arm
        const spread = randomGaussian() * arm.width * 0.5;
        const perpAngle = theta + Math.PI / 2;
        const x = cx + Math.cos(perpAngle) * spread;
        const z = cz + Math.sin(perpAngle) * spread;
        const y = randomGaussian() * 300; // thin disk

        const pos = MilkyWay.scalePosition([x, y, z]);
        const spectral = pickSpectral();
        setPoint(idx, pos, SPECTRAL_HEX[spectral], 1.0 + Math.random() * 2.0);
        idx++;
      }
    }

    // --- Central bar stars ---
    const barAngle = GALACTIC_BAR.angle;
    const cosBar = Math.cos(barAngle);
    const sinBar = Math.sin(barAngle);
    for (let i = 0; i < barStars; i++) {
      // Elongated distribution along bar axis
      const along = randomGaussian() * GALACTIC_BAR.halfLength * 0.4;
      const across = randomGaussian() * GALACTIC_BAR.halfWidth * 0.3;
      const x = along * cosBar - across * sinBar;
      const z = along * sinBar + across * cosBar;
      const y = randomGaussian() * 200;

      const pos = MilkyWay.scalePosition([x, y, z]);
      // Bar stars are warmer (older population)
      const warmTypes = ['F', 'G', 'K', 'M'];
      const spectral = warmTypes[Math.floor(Math.random() * warmTypes.length)];
      setPoint(idx, pos, SPECTRAL_HEX[spectral], 1.0 + Math.random() * 1.5);
      idx++;
    }

    // --- Background disk stars ---
    for (let i = 0; i < diskStars; i++) {
      const r = Math.random() * 55000;
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = randomGaussian() * 500;

      const pos = MilkyWay.scalePosition([x, y, z]);
      const spectral = pickSpectral();
      setPoint(idx, pos, SPECTRAL_HEX[spectral], 0.8 + Math.random() * 1.2);
      idx++;
    }

    // --- Feature markers ---
    // Galactic center
    setPoint(idx, new THREE.Vector3(0, 0, 0), 0xffcc66, 5.0);
    idx++;

    // Sun
    const sunPos = MilkyWay.scalePosition(SUN_GALACTIC_POSITION);
    setPoint(idx, sunPos, 0xffee88, 5.0);
    idx++;

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
        uniform float scale;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float distanceAttenuation = 5000.0 / max(-mvPosition.z, 1.0);
          gl_PointSize = size * scale * distanceAttenuation;
          gl_PointSize = clamp(gl_PointSize, 2.0, 30.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float opacity;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float core = exp(-dist * 8.0);
          float glow = exp(-dist * 2.5) * 0.6;
          float intensity = (core + glow) * 1.2;

          vec3 coreColor = mix(vColor, vec3(1.0), 0.6);
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

  // --- Label positions ---

  /** Get the scaled position for a spiral arm label. */
  getArmLabelPosition(arm: SpiralArm): THREE.Vector3 {
    const theta = arm.startAngle + arm.labelFraction * (arm.endAngle - arm.startAngle);
    const [x, z] = MilkyWay.spiralPoint(arm, theta);
    return MilkyWay.scalePosition([x, 0, z]);
  }

  /** Get the scaled position for a galactic feature. */
  getFeaturePosition(feature: GalacticFeature): THREE.Vector3 {
    return MilkyWay.scalePosition(feature.position);
  }

  getArms(): SpiralArm[] {
    return SPIRAL_ARMS;
  }

  getFeatures(): GalacticFeature[] {
    return GALACTIC_FEATURES;
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
    // Subtle cloud rotation
    for (let i = 0; i < this.cloudSprites.length; i++) {
      this.cloudSprites[i].material.rotation += (i % 2 === 0 ? 1 : -1) * 0.000015;
    }

    // Sun halo idle pulse (~6s period)
    if (this.sunHaloMaterial) {
      const pulse = 0.25 + 0.15 * Math.sin(time * 0.001 * (Math.PI * 2 / 6));
      this.sunHaloMaterial.opacity = pulse * this.currentOpacity;
    }
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  /** Highlight a specific arm, dimming all others by ~10%. */
  highlightArm(armName: string): void {
    this.highlightedArm = armName;
    this.applyArmHighlight();
  }

  /** Clear arm highlight, restoring uniform opacity. */
  clearHighlight(): void {
    this.highlightedArm = null;
    this.applyArmHighlight();
  }

  private applyArmHighlight(): void {
    for (const [name, mats] of this.armCloudMaterials) {
      const dimFactor = this.highlightedArm && name !== this.highlightedArm ? 0.9 : 1.0;
      for (const mat of mats) {
        mat.opacity = 0.12 * this.currentOpacity * dimFactor;
      }
    }
  }

  private updateAllOpacities(opacity: number): void {
    this.armMaterial.uniforms.opacity.value = opacity;
    if (this.highlightedArm) {
      this.applyArmHighlight();
    } else {
      for (const mat of this.cloudMaterials) {
        mat.opacity = 0.12 * opacity;
      }
    }
    if (this.bulgeMaterial) {
      this.bulgeMaterial.opacity = 0.35 * opacity;
    }
  }
}
