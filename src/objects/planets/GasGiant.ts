// src/objects/planets/GasGiant.ts
import * as THREE from 'three';
import { Planet } from './Planet';
import {
  ORBITAL_ELEMENTS,
  PLANET_DATA,
  OrbitalElements,
  PlanetPhysicalData,
} from './PlanetData';

/**
 * Gas giant planet (Jupiter, Saturn, Uranus, Neptune)
 * Features animated cloud bands and atmospheric glow
 */
export class GasGiant extends Planet {
  private textureMap: THREE.Texture | null = null;
  protected animationTime = 0;

  // Band animation parameters
  protected bandSpeed = 0.0001;
  protected bandIntensity = 0.3;

  protected static vertexShader = `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec3 vNormalWorld;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormalWorld = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      #include <logdepthbuf_vertex>
    }
  `;

  private static fragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform vec3 sunDirection;
    uniform sampler2D surfaceMap;
    uniform bool hasTexture;
    uniform vec3 fallbackColor;
    uniform float time;
    uniform float bandSpeed;
    uniform float bandIntensity;

    varying vec3 vNormalWorld;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Simple noise for band variation
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }

    void main() {
      #include <logdepthbuf_fragment>

      vec3 normal = normalize(vNormalWorld);
      float sunDot = dot(normal, sunDirection);

      // Soft terminator for gas giants (thick atmosphere)
      float lightFactor = smoothstep(-0.3, 0.3, sunDot);

      // Calculate latitude for band effects
      float latitude = vUv.y;

      // Animate bands at different speeds per latitude
      float bandOffset = sin(latitude * 20.0 + time * bandSpeed * (1.0 + hash(floor(latitude * 10.0)))) * bandIntensity;

      // Modified UV for texture sampling
      vec2 animatedUv = vUv;
      animatedUv.x += bandOffset * 0.02;

      // Surface color with animated bands
      vec3 baseColor = hasTexture
        ? texture2D(surfaceMap, animatedUv).rgb
        : fallbackColor;

      // Add subtle band color variation
      float bandVariation = sin(latitude * 30.0 + time * bandSpeed * 0.5) * 0.05;
      baseColor = baseColor * (1.0 + bandVariation);

      // Soft shadow on night side
      vec3 darkSide = baseColor * 0.15;
      vec3 color = mix(darkSide, baseColor, lightFactor);

      // Limb darkening effect
      float limbDarkening = pow(max(0.0, dot(normal, normalize(-vPosition))), 0.3);
      color *= 0.7 + 0.3 * limbDarkening;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  constructor(orbitalElements: OrbitalElements, physicalData: PlanetPhysicalData) {
    super(orbitalElements, physicalData);
  }

  protected createMaterial(): THREE.ShaderMaterial {
    const fallbackColor = new THREE.Color(this.physicalData.fallbackColor);

    return new THREE.ShaderMaterial({
      vertexShader: GasGiant.vertexShader,
      fragmentShader: GasGiant.fragmentShader,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        surfaceMap: { value: null },
        hasTexture: { value: false },
        fallbackColor: { value: fallbackColor },
        time: { value: 0 },
        bandSpeed: { value: this.bandSpeed },
        bandIntensity: { value: this.bandIntensity },
      },
    });
  }

  protected async loadTextures(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const planetName = this.physicalData.name.toLowerCase();
    const texturePath = `/textures/${planetName}_2k.jpg`;

    try {
      this.textureMap = await loader.loadAsync(texturePath);
      this.textureMap.wrapS = THREE.RepeatWrapping;
      this.material.uniforms.surfaceMap.value = this.textureMap;
      this.material.uniforms.hasTexture.value = true;
    } catch {
      console.log(`${this.physicalData.name} texture not found, using fallback color`);
    }
  }

  /**
   * Update animation and position
   */
  update(time: number): void {
    this.animationTime = time;
    this.material.uniforms.time.value = time;
  }
}

// Factory classes for specific gas giants

export class Jupiter extends GasGiant {
  private static jupiterFragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform vec3 sunDirection;
    uniform float time;

    varying vec3 vNormalWorld;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Noise functions for turbulence
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100.0);
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      #include <logdepthbuf_fragment>

      vec3 normal = normalize(vNormalWorld);
      float sunDot = dot(normal, sunDirection);
      float lightFactor = smoothstep(-0.3, 0.3, sunDot);

      // Latitude (0 at equator, 1 at poles)
      float lat = vUv.y;
      float lon = vUv.x;

      // Animated longitude
      float animSpeed = time * 0.00005;
      float animLon = lon + animSpeed;

      // Jupiter's band colors
      vec3 cream = vec3(0.96, 0.91, 0.82);
      vec3 tan = vec3(0.87, 0.75, 0.58);
      vec3 brown = vec3(0.65, 0.45, 0.32);
      vec3 darkBrown = vec3(0.45, 0.30, 0.22);
      vec3 orange = vec3(0.85, 0.55, 0.35);
      vec3 white = vec3(0.95, 0.95, 0.92);

      // Create distinct latitude bands
      float bandIndex = lat * 18.0;
      float bandFract = fract(bandIndex);

      // Turbulence at band edges
      float turb = fbm(vec2(animLon * 30.0, lat * 50.0)) * 0.15;
      float edgeTurb = smoothstep(0.0, 0.2, bandFract) * smoothstep(1.0, 0.8, bandFract);
      turb *= (1.0 - edgeTurb);

      // Band pattern with variation
      float bandPattern = sin(lat * 56.0 + turb * 3.0);

      // Select band color based on latitude
      vec3 bandColor;
      float latMod = mod(floor(bandIndex), 4.0);
      if (latMod < 1.0) {
        bandColor = mix(cream, tan, smoothstep(-0.3, 0.3, bandPattern));
      } else if (latMod < 2.0) {
        bandColor = mix(tan, brown, smoothstep(-0.3, 0.3, bandPattern));
      } else if (latMod < 3.0) {
        bandColor = mix(brown, orange, smoothstep(-0.3, 0.3, bandPattern));
      } else {
        bandColor = mix(orange, cream, smoothstep(-0.3, 0.3, bandPattern));
      }

      // Add fine structure within bands
      float fineNoise = fbm(vec2(animLon * 80.0, lat * 100.0)) * 0.1;
      bandColor = bandColor * (0.95 + fineNoise);

      // Great Red Spot (centered around lat ~0.35, lon ~0.7)
      float spotLat = 0.35;
      float spotLon = 0.7;
      vec2 spotCenter = vec2(spotLon, spotLat);
      vec2 currentPos = vec2(fract(animLon + 0.2), lat);

      // Elliptical spot shape
      vec2 spotDiff = currentPos - spotCenter;
      spotDiff.x *= 2.5; // Make it wider than tall
      float spotDist = length(spotDiff);

      // Spot with swirling interior
      float spotRadius = 0.06;
      float spotEdge = smoothstep(spotRadius, spotRadius * 0.5, spotDist);

      // Swirl pattern inside spot
      float angle = atan(spotDiff.y, spotDiff.x);
      float swirl = sin(angle * 3.0 + spotDist * 40.0 - time * 0.0001) * 0.5 + 0.5;

      vec3 spotColor = mix(orange, vec3(0.8, 0.25, 0.15), swirl * 0.7);
      spotColor = mix(spotColor, darkBrown, smoothstep(spotRadius * 0.3, 0.0, spotDist));

      bandColor = mix(bandColor, spotColor, spotEdge);

      // White oval storms (smaller spots)
      for (int i = 0; i < 3; i++) {
        float ovalLat = 0.55 + float(i) * 0.12;
        float ovalLon = 0.2 + float(i) * 0.25;
        vec2 ovalCenter = vec2(ovalLon, ovalLat);
        vec2 ovalPos = vec2(fract(animLon * 1.1), lat);
        vec2 ovalDiff = ovalPos - ovalCenter;
        ovalDiff.x *= 2.0;
        float ovalDist = length(ovalDiff);
        float ovalEdge = smoothstep(0.025, 0.01, ovalDist);
        bandColor = mix(bandColor, white, ovalEdge * 0.8);
      }

      // Polar regions (darker)
      float polarDark = smoothstep(0.15, 0.0, lat) + smoothstep(0.85, 1.0, lat);
      bandColor = mix(bandColor, darkBrown * 0.7, polarDark * 0.6);

      // Apply lighting
      vec3 darkSide = bandColor * 0.12;
      vec3 color = mix(darkSide, bandColor, lightFactor);

      // Limb darkening
      float limb = pow(max(0.0, dot(normal, normalize(-vPosition))), 0.4);
      color *= 0.7 + 0.3 * limb;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  constructor() {
    super(ORBITAL_ELEMENTS.jupiter, PLANET_DATA.jupiter);
  }

  protected createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: GasGiant.vertexShader,
      fragmentShader: Jupiter.jupiterFragmentShader,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        time: { value: 0 },
      },
    });
  }

  protected async loadTextures(): Promise<void> {
    // Jupiter uses procedural textures, no loading needed
  }

  update(time: number): void {
    this.material.uniforms.time.value = time;
  }

  protected createAtmosphere(): THREE.Mesh | null {
    const atmosphereRadius = this.visualRadius * 1.03;
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

          vec3 atmosphereColor = vec3(1.0, 0.85, 0.5);
          gl_FragColor = vec4(atmosphereColor, fresnel * 0.3);
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

export class Uranus extends GasGiant {
  constructor() {
    super(ORBITAL_ELEMENTS.uranus, PLANET_DATA.uranus);
    // Uranus has subtle, slow bands
    this.bandSpeed = 0.00005;
    this.bandIntensity = 0.1;
    this.material.uniforms.bandSpeed.value = this.bandSpeed;
    this.material.uniforms.bandIntensity.value = this.bandIntensity;
  }

  protected createMaterial(): THREE.ShaderMaterial {
    // Uranus has a more uniform appearance with a distinct cyan color
    const material = super.createMaterial();

    // Override fragment shader for more uniform look
    material.fragmentShader = `
      #include <common>
      #include <logdepthbuf_pars_fragment>

      uniform vec3 sunDirection;
      uniform sampler2D surfaceMap;
      uniform bool hasTexture;
      uniform vec3 fallbackColor;
      uniform float time;

      varying vec3 vNormalWorld;
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        #include <logdepthbuf_fragment>

        vec3 normal = normalize(vNormalWorld);
        float sunDot = dot(normal, sunDirection);

        float lightFactor = smoothstep(-0.3, 0.3, sunDot);

        // Uranus has very subtle banding - mostly uniform cyan
        vec3 baseColor = hasTexture
          ? texture2D(surfaceMap, vUv).rgb
          : fallbackColor;

        // Very subtle latitude variation
        float latitude = vUv.y;
        float subtleBand = sin(latitude * 10.0) * 0.02;
        baseColor = baseColor * (1.0 + subtleBand);

        vec3 darkSide = baseColor * 0.1;
        vec3 color = mix(darkSide, baseColor, lightFactor);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    material.needsUpdate = true;

    return material;
  }

  protected createAtmosphere(): THREE.Mesh | null {
    const atmosphereRadius = this.visualRadius * 1.04;
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
          fresnel = pow(fresnel, 3.0);

          // Cyan atmosphere glow
          vec3 atmosphereColor = vec3(0.6, 0.9, 0.95);
          gl_FragColor = vec4(atmosphereColor, fresnel * 0.5);
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

export class Neptune extends GasGiant {
  constructor() {
    super(ORBITAL_ELEMENTS.neptune, PLANET_DATA.neptune);
    // Neptune has moderate bands with white cloud features
    this.bandSpeed = 0.0001;
    this.bandIntensity = 0.2;
    this.material.uniforms.bandSpeed.value = this.bandSpeed;
    this.material.uniforms.bandIntensity.value = this.bandIntensity;
  }

  protected createAtmosphere(): THREE.Mesh | null {
    const atmosphereRadius = this.visualRadius * 1.04;
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
          fresnel = pow(fresnel, 3.0);

          // Deep blue atmosphere glow
          vec3 atmosphereColor = vec3(0.3, 0.4, 1.0);
          gl_FragColor = vec4(atmosphereColor, fresnel * 0.5);
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
