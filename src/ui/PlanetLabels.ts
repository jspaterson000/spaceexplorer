// src/ui/PlanetLabels.ts
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

interface LabelConfig {
  name: string;
  color: string;
  getPosition: () => THREE.Vector3;
}

/**
 * Floating labels for planets in orrery mode
 * Uses CSS2DRenderer for crisp HTML-based labels
 */
export class PlanetLabels {
  private renderer: CSS2DRenderer;
  private labels: Map<string, CSS2DObject> = new Map();
  private scene: THREE.Scene;
  private visible = false;

  constructor(container: HTMLElement, scene: THREE.Scene) {
    this.scene = scene;

    // Create CSS2D renderer
    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addLabel(id: string, config: LabelConfig): void {
    const labelDiv = document.createElement('div');
    labelDiv.className = `planet-label ${id}`;

    // Create line element with planet-specific color
    const lineEl = document.createElement('span');
    lineEl.className = 'planet-label-line';
    lineEl.style.background = `linear-gradient(90deg, transparent 0%, ${config.color} 100%)`;

    // Create name element
    const nameEl = document.createElement('span');
    nameEl.className = 'planet-label-name';
    nameEl.textContent = config.name;

    labelDiv.appendChild(lineEl);
    labelDiv.appendChild(nameEl);

    const label = new CSS2DObject(labelDiv);
    label.visible = this.visible;

    // Store position getter for updates
    (label as any).getTargetPosition = config.getPosition;

    this.labels.set(id, label);
    this.scene.add(label);
  }

  update(): void {
    if (!this.visible) return;

    // Update label positions
    this.labels.forEach((label) => {
      const getPos = (label as any).getTargetPosition;
      if (getPos) {
        const pos = getPos();
        label.position.copy(pos);
      }
    });
  }

  render(camera: THREE.Camera): void {
    if (this.visible) {
      this.renderer.render(this.scene, camera);
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.renderer.domElement.style.display = visible ? 'block' : 'none';

    if (visible) {
      // Make labels visible but reset animation classes
      this.labels.forEach((label) => {
        label.visible = true;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible');
      });

      // Stage 1: Draw lines with stagger (short delay, called after fade-in)
      let lineDelay = 200;
      this.labels.forEach((label) => {
        const el = label.element as HTMLElement;
        setTimeout(() => {
          el.classList.add('line-visible');
        }, lineDelay);
        lineDelay += 100; // Stagger lines by 100ms each
      });

      // Stage 2: After lines draw (~0.6s), fade in text with stagger
      let textDelay = 200 + 600;
      this.labels.forEach((label) => {
        const el = label.element as HTMLElement;
        setTimeout(() => {
          el.classList.add('text-visible');
        }, textDelay);
        textDelay += 80; // Stagger text by 80ms each
      });
    } else {
      // Hide immediately
      this.labels.forEach((label) => {
        label.visible = false;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible');
      });
    }
  }
}
