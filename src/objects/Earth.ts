// src/objects/Earth.ts
import * as THREE from 'three';

export interface EarthConfig {
  radius?: number;
  segments?: number;
}

export class Earth {
  readonly mesh: THREE.Mesh;
  readonly atmosphere: THREE.Mesh;
  private dayTexture: THREE.Texture | null = null;
  private nightTexture: THREE.Texture | null = null;
  private cloudsTexture: THREE.Texture | null = null;
  private material: THREE.ShaderMaterial;

  private static vertexShader = `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      #include <logdepthbuf_vertex>
    }
  `;

  private static fragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform sampler2D cloudsMap;
    uniform vec3 sunDirection;
    uniform float cloudsOpacity;
    uniform bool hasDay;
    uniform bool hasNight;
    uniform bool hasClouds;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      #include <logdepthbuf_fragment>

      vec3 normal = normalize(vNormal);
      float sunDot = dot(normal, sunDirection);
      float dayFactor = smoothstep(-0.1, 0.2, sunDot);

      vec3 dayColor = hasDay ? texture2D(dayMap, vUv).rgb : vec3(0.1, 0.3, 0.6);
      vec3 nightColor = hasNight ? texture2D(nightMap, vUv).rgb * 1.5 : vec3(0.02, 0.02, 0.05);

      vec3 color = mix(nightColor, dayColor, dayFactor);

      if (hasClouds) {
        float clouds = texture2D(cloudsMap, vUv).r;
        color = mix(color, vec3(1.0), clouds * cloudsOpacity * dayFactor);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  private static atmosphereVertexShader = `
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
  `;

  private static atmosphereFragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      #include <logdepthbuf_fragment>

      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - dot(viewDir, vNormal);
      fresnel = pow(fresnel, 3.0);

      vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
      gl_FragColor = vec4(atmosphereColor, fresnel * 0.6);
    }
  `;

  constructor(config: EarthConfig = {}) {
    const { radius = 6_371_000, segments = 128 } = config;

    // Earth sphere
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    this.material = new THREE.ShaderMaterial({
      vertexShader: Earth.vertexShader,
      fragmentShader: Earth.fragmentShader,
      uniforms: {
        dayMap: { value: null },
        nightMap: { value: null },
        cloudsMap: { value: null },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        cloudsOpacity: { value: 0.4 },
        hasDay: { value: false },
        hasNight: { value: false },
        hasClouds: { value: false },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    // Atmosphere - rendered as front-facing glow ring
    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.02, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: Earth.atmosphereVertexShader,
      fragmentShader: Earth.atmosphereFragmentShader,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

    this.loadTextures();
  }

  private async loadTextures(): Promise<void> {
    const loader = new THREE.TextureLoader();

    try {
      this.dayTexture = await loader.loadAsync('/textures/earth_day_2k.jpg');
      this.material.uniforms.dayMap.value = this.dayTexture;
      this.material.uniforms.hasDay.value = true;
    } catch {
      console.log('Day texture not found, using procedural color');
    }

    try {
      this.nightTexture = await loader.loadAsync('/textures/earth_night_2k.jpg');
      this.material.uniforms.nightMap.value = this.nightTexture;
      this.material.uniforms.hasNight.value = true;
    } catch {
      console.log('Night texture not found, using procedural color');
    }

    try {
      this.cloudsTexture = await loader.loadAsync('/textures/earth_clouds_2k.jpg');
      this.material.uniforms.cloudsMap.value = this.cloudsTexture;
      this.material.uniforms.hasClouds.value = true;
    } catch {
      console.log('Clouds texture not found, skipping');
    }
  }

  update(_time: number): void {
    // Sun direction is fixed - based on current UTC time
    // This gives realistic day/night based on actual time of day
    const now = new Date();
    const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
    // Sun is overhead at noon UTC (12:00) at longitude 0
    // Convert to angle: 12:00 = sun at +X, 0:00 = sun at -X
    const sunAngle = ((hours - 12) / 24) * Math.PI * 2;

    this.material.uniforms.sunDirection.value.set(
      Math.cos(sunAngle),
      0.3,  // Slight tilt for seasonal variation
      Math.sin(sunAngle)
    ).normalize();

    // Earth doesn't visibly rotate (satellites are in Earth-fixed frame)
    // The day/night terminator moves as real time passes
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
    scene.add(this.atmosphere);
  }
}
