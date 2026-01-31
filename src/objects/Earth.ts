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
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private static fragmentShader = `
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
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private static atmosphereFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
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

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.015, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: Earth.atmosphereVertexShader,
      fragmentShader: Earth.atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
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

  update(time: number): void {
    // Rotate Earth (one rotation per 24 hours, sped up for demo)
    this.mesh.rotation.y = time * 0.00001;
    this.atmosphere.rotation.y = this.mesh.rotation.y;

    // Update sun direction based on time
    const sunAngle = time * 0.0001;
    this.material.uniforms.sunDirection.value.set(
      Math.cos(sunAngle),
      0.2,
      Math.sin(sunAngle)
    ).normalize();
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
    scene.add(this.atmosphere);
  }
}
