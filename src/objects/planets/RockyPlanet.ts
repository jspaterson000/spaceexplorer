// src/objects/planets/RockyPlanet.ts
import * as THREE from 'three';
import { Planet } from './Planet';
import {
  ORBITAL_ELEMENTS,
  PLANET_DATA,
  OrbitalElements,
  PlanetPhysicalData,
} from './PlanetData';

/**
 * Rocky planet with solid surface (Mercury, Venus, Mars)
 * Features day/night terminator and optional atmosphere
 */
export class RockyPlanet extends Planet {
  private textureMap: THREE.Texture | null = null;
  private hasTexture = false;

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
    uniform sampler2D surfaceMap;
    uniform bool hasTexture;
    uniform vec3 fallbackColor;
    uniform float atmosphereScatter;

    varying vec3 vNormalWorld;
    varying vec2 vUv;

    void main() {
      #include <logdepthbuf_fragment>

      vec3 normal = normalize(vNormalWorld);
      float sunDot = dot(normal, sunDirection);

      // Sharp terminator for rocky planets (minimal atmosphere scattering)
      float lightFactor = smoothstep(-0.05 - atmosphereScatter * 0.1, 0.1 + atmosphereScatter * 0.1, sunDot);

      // Surface color
      vec3 baseColor = hasTexture
        ? texture2D(surfaceMap, vUv).rgb
        : fallbackColor;

      // Very dark night side (less than Moon for atmosphere-less, slightly brighter with atmosphere)
      vec3 darkSide = baseColor * (0.02 + atmosphereScatter * 0.03);
      vec3 color = mix(darkSide, baseColor, lightFactor);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  constructor(orbitalElements: OrbitalElements, physicalData: PlanetPhysicalData) {
    super(orbitalElements, physicalData);
  }

  protected createMaterial(): THREE.ShaderMaterial {
    const fallbackColor = new THREE.Color(this.physicalData.fallbackColor);
    const hasAtmosphere = this.physicalData.hasAtmosphere;
    const thickness = this.physicalData.atmosphereThickness || 0;

    return new THREE.ShaderMaterial({
      vertexShader: RockyPlanet.vertexShader,
      fragmentShader: RockyPlanet.fragmentShader,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        surfaceMap: { value: null },
        hasTexture: { value: false },
        fallbackColor: { value: fallbackColor },
        atmosphereScatter: { value: hasAtmosphere ? thickness * 10 : 0 },
      },
    });
  }

  protected async loadTextures(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const planetName = this.physicalData.name.toLowerCase();
    const texturePath = `/textures/${planetName}_2k.jpg`;

    try {
      this.textureMap = await loader.loadAsync(texturePath);
      this.material.uniforms.surfaceMap.value = this.textureMap;
      this.material.uniforms.hasTexture.value = true;
      this.hasTexture = true;
    } catch {
      console.log(`${this.physicalData.name} texture not found, using fallback color`);
    }
  }
}

// Factory functions for each rocky planet

export class Mercury extends RockyPlanet {
  constructor() {
    super(ORBITAL_ELEMENTS.mercury, PLANET_DATA.mercury);
  }
}

export class Venus extends RockyPlanet {
  constructor() {
    super(ORBITAL_ELEMENTS.venus, PLANET_DATA.venus);
  }

  protected createAtmosphere(): THREE.Mesh | null {
    // Venus has a very thick, bright atmosphere
    const atmosphereRadius = this.visualRadius * 1.15;
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
          fresnel = pow(fresnel, 2.0);

          // Thick yellowish-white atmosphere
          vec3 atmosphereColor = vec3(1.0, 0.95, 0.7);
          gl_FragColor = vec4(atmosphereColor, fresnel * 0.8);
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

export class Mars extends RockyPlanet {
  constructor() {
    super(ORBITAL_ELEMENTS.mars, PLANET_DATA.mars);
  }

  protected createAtmosphere(): THREE.Mesh | null {
    // Mars has a thin blue atmosphere visible at the limb
    const atmosphereRadius = this.visualRadius * 1.02;
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
          fresnel = pow(fresnel, 4.0);  // Sharper edge for thin atmosphere

          // Thin blue atmosphere
          vec3 atmosphereColor = vec3(0.4, 0.6, 1.0);
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
