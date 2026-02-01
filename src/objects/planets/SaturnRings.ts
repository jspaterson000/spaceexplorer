// src/objects/planets/SaturnRings.ts
import * as THREE from 'three';

/**
 * Saturn's ring system
 * Uses custom shader for radial texture sampling and planet shadow
 */
export class SaturnRings {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  // Ring dimensions relative to Saturn's radius
  private static readonly INNER_RADIUS_RATIO = 1.2;  // Inner edge at 1.2x planet radius
  private static readonly OUTER_RADIUS_RATIO = 2.3;  // Outer edge at 2.3x planet radius

  private static vertexShader = `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;

      #include <logdepthbuf_vertex>
    }
  `;

  private static fragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform vec3 sunDirection;
    uniform vec3 planetPosition;
    uniform float planetRadius;
    uniform sampler2D ringTexture;
    uniform bool hasTexture;
    uniform float innerRadius;
    uniform float outerRadius;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      #include <logdepthbuf_fragment>

      // Calculate radial distance from planet center
      vec3 toPoint = vWorldPosition - planetPosition;
      float dist = length(toPoint.xz);  // Distance in ring plane

      // Normalized position along ring (0 = inner, 1 = outer)
      float ringPos = (dist - innerRadius) / (outerRadius - innerRadius);

      // Discard if outside ring bounds
      if (ringPos < 0.0 || ringPos > 1.0) {
        discard;
      }

      // Sample ring texture based on radial position
      vec3 ringColor;
      float ringAlpha;

      if (hasTexture) {
        vec4 texColor = texture2D(ringTexture, vec2(ringPos, 0.5));
        ringColor = texColor.rgb;
        ringAlpha = texColor.a;
      } else {
        // Procedural ring pattern if no texture
        // Create bands of varying density
        float band1 = smoothstep(0.0, 0.15, ringPos) * (1.0 - smoothstep(0.15, 0.2, ringPos));
        float band2 = smoothstep(0.25, 0.3, ringPos) * (1.0 - smoothstep(0.7, 0.75, ringPos));
        float band3 = smoothstep(0.8, 0.85, ringPos) * (1.0 - smoothstep(0.95, 1.0, ringPos));

        float density = band1 * 0.3 + band2 * 0.8 + band3 * 0.5;

        // Add fine structure
        float fine = sin(ringPos * 200.0) * 0.1 + 0.9;
        density *= fine;

        // Ring color (icy particles)
        ringColor = vec3(0.9, 0.85, 0.7) * (0.7 + density * 0.3);
        ringAlpha = density * 0.9;
      }

      // Calculate planet shadow on rings
      // Ray from point toward sun
      vec3 toSun = normalize(sunDirection);
      vec3 toPointFromCenter = toPoint;

      // Check if this point is in planet's shadow
      // Project point onto sun direction and check if it passes through planet
      float projDist = dot(toPointFromCenter, -toSun);

      if (projDist > 0.0) {
        // Point is on the side away from the sun
        vec3 closestPoint = toPointFromCenter + toSun * projDist;
        float closestDist = length(closestPoint);

        if (closestDist < planetRadius) {
          // In shadow - darken significantly
          float shadowFactor = smoothstep(planetRadius * 0.8, planetRadius, closestDist);
          ringColor *= 0.1 + 0.9 * shadowFactor;
        }
      }

      // Basic lighting from sun
      float lightFactor = max(0.3, dot(vNormal, sunDirection) * 0.5 + 0.5);
      ringColor *= lightFactor;

      // Fade edges for anti-aliasing
      float edgeFade = smoothstep(0.0, 0.02, ringPos) * (1.0 - smoothstep(0.98, 1.0, ringPos));
      ringAlpha *= edgeFade;

      gl_FragColor = vec4(ringColor, ringAlpha);
    }
  `;

  constructor(planetRadius: number, planetPosition: THREE.Vector3) {
    const innerRadius = planetRadius * SaturnRings.INNER_RADIUS_RATIO;
    const outerRadius = planetRadius * SaturnRings.OUTER_RADIUS_RATIO;

    // Create ring geometry
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);

    // Rotate UV coordinates to be radial
    const uvs = geometry.attributes.uv;
    const positions = geometry.attributes.position;
    for (let i = 0; i < uvs.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const radialPos = (dist - innerRadius) / (outerRadius - innerRadius);
      uvs.setXY(i, radialPos, 0.5);
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: SaturnRings.vertexShader,
      fragmentShader: SaturnRings.fragmentShader,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        planetPosition: { value: planetPosition },
        planetRadius: { value: planetRadius },
        ringTexture: { value: null },
        hasTexture: { value: false },
        innerRadius: { value: innerRadius },
        outerRadius: { value: outerRadius },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    // Rotate to lie in equatorial plane
    this.mesh.rotation.x = Math.PI / 2;

    this.loadTexture();
  }

  private async loadTexture(): Promise<void> {
    const loader = new THREE.TextureLoader();
    try {
      const texture = await loader.loadAsync('/textures/saturn_rings.png');
      texture.wrapS = THREE.ClampToEdgeWrapping;
      this.material.uniforms.ringTexture.value = texture;
      this.material.uniforms.hasTexture.value = true;
    } catch {
      console.log('Saturn rings texture not found, using procedural pattern');
    }
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(direction);
  }

  updatePlanetPosition(position: THREE.Vector3): void {
    this.material.uniforms.planetPosition.value.copy(position);
  }
}
