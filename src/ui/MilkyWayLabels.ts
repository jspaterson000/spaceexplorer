// src/ui/MilkyWayLabels.ts
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

interface LabelData {
  name: string;
  description: string;
  notable: boolean;
}

/**
 * Floating labels for spiral arms and galactic features in Milky Way mode.
 */
export class MilkyWayLabels {
  private renderer: CSS2DRenderer;
  private labels: Map<string, CSS2DObject> = new Map();
  private notableLabels: Set<string> = new Set();
  private hoverLabels: Set<string> = new Set();
  private scene: THREE.Scene;
  private visible = false;
  private currentHover: string | null = null;

  constructor(container: HTMLElement, scene: THREE.Scene) {
    this.scene = scene;

    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addLabel(data: LabelData, position: THREE.Vector3, color: string, notable: boolean): void {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'milky-way-label';

    const contentEl = document.createElement('span');
    contentEl.className = 'milky-way-label-content';

    const lineEl = document.createElement('span');
    lineEl.className = 'milky-way-label-line';
    lineEl.style.background = `linear-gradient(90deg, transparent 0%, ${color} 100%)`;

    const textEl = document.createElement('span');
    textEl.className = 'milky-way-label-text';

    const nameEl = document.createElement('span');
    nameEl.className = 'milky-way-label-name';
    nameEl.textContent = data.name;

    const descEl = document.createElement('span');
    descEl.className = 'milky-way-label-desc';
    descEl.textContent = data.description;

    textEl.appendChild(nameEl);
    textEl.appendChild(descEl);
    contentEl.appendChild(textEl);
    contentEl.appendChild(lineEl);
    labelDiv.appendChild(contentEl);

    const label = new CSS2DObject(labelDiv);
    label.position.copy(position);
    label.center.set(1, 0.5);
    label.visible = notable ? this.visible : false;

    this.labels.set(data.name, label);

    if (notable) {
      this.notableLabels.add(data.name);
    } else {
      this.hoverLabels.add(data.name);
    }

    this.scene.add(label);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.renderer.domElement.style.display = visible ? 'block' : 'none';

    if (visible) {
      this.labels.forEach((label, name) => {
        const isNotable = this.notableLabels.has(name);
        label.visible = isNotable;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible', 'hover-visible');
      });

      let lineDelay = 500;
      this.notableLabels.forEach((name) => {
        const label = this.labels.get(name);
        if (label) {
          const el = label.element as HTMLElement;
          setTimeout(() => el.classList.add('line-visible'), lineDelay);
          lineDelay += 100;
        }
      });

      let textDelay = 500 + 500;
      this.notableLabels.forEach((name) => {
        const label = this.labels.get(name);
        if (label) {
          const el = label.element as HTMLElement;
          setTimeout(() => el.classList.add('text-visible'), textDelay);
          textDelay += 80;
        }
      });
    } else {
      this.currentHover = null;
      this.labels.forEach((label) => {
        label.visible = false;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible', 'hover-visible');
      });
    }
  }

  render(camera: THREE.Camera): void {
    if (this.visible) {
      this.renderer.render(this.scene, camera);
    }
  }

  showHoverLabel(name: string): void {
    if (!this.visible || !this.hoverLabels.has(name)) return;
    if (this.currentHover === name) return;
    this.hideHoverLabel();
    const label = this.labels.get(name);
    if (label) {
      this.currentHover = name;
      label.visible = true;
      const el = label.element as HTMLElement;
      el.classList.add('line-visible', 'text-visible', 'hover-visible');
    }
  }

  hideHoverLabel(): void {
    if (this.currentHover && this.hoverLabels.has(this.currentHover)) {
      const label = this.labels.get(this.currentHover);
      if (label) {
        label.visible = false;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible', 'hover-visible');
      }
    }
    this.currentHover = null;
  }
}
