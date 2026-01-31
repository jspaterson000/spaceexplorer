// src/engine/Renderer.ts
import * as THREE from 'three';

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
}

export interface RendererCapabilities {
  isWebGPU: boolean;
  maxSatellites: number;
}

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private _capabilities: RendererCapabilities;

  constructor(private config: RendererConfig) {
    // For now, use WebGL2 - WebGPU support in Three.js requires async init
    // We'll upgrade to WebGPU in a later task
    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
      alpha: false,
      logarithmicDepthBuffer: true, // Better precision at astronomical scales
    });

    this._capabilities = {
      isWebGPU: false,
      maxSatellites: 5000,
    };

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resize();
  }

  get capabilities(): RendererCapabilities {
    return this._capabilities;
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
