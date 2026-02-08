// src/ui/OrionArmLabels.ts
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { OrionArmObject } from '../data/OrionArmData';

/**
 * Floating labels for nebulae and objects in Orion Arm mode.
 * Uses CSS2DRenderer for crisp HTML-based labels with animated leader lines.
 * Notable objects show labels always; non-notable show on hover.
 */
export class OrionArmLabels {
  private renderer: CSS2DRenderer;
  private labels: Map<string, CSS2DObject> = new Map();
  private notableLabels: Set<string> = new Set();
  private hoverLabels: Set<string> = new Set();
  private scene: THREE.Scene;
  private visible = false;
  private currentHover: string | null = null;
  private objectPositions: Map<string, THREE.Vector3> = new Map();

  constructor(container: HTMLElement, _scene: THREE.Scene) {
    this.scene = new THREE.Scene();

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

  addLabel(obj: OrionArmObject, position: THREE.Vector3, color: string, notable: boolean): void {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'orion-arm-label';

    const contentEl = document.createElement('span');
    contentEl.className = 'orion-arm-label-content';

    const lineEl = document.createElement('span');
    lineEl.className = 'orion-arm-label-line';
    lineEl.style.background = `linear-gradient(90deg, transparent 0%, ${color} 100%)`;

    const textEl = document.createElement('span');
    textEl.className = 'orion-arm-label-text';

    const nameEl = document.createElement('span');
    nameEl.className = 'orion-arm-label-name';
    nameEl.textContent = obj.name;

    const descEl = document.createElement('span');
    descEl.className = 'orion-arm-label-desc';
    descEl.textContent = obj.description;

    textEl.appendChild(nameEl);
    textEl.appendChild(descEl);
    contentEl.appendChild(textEl);
    contentEl.appendChild(lineEl);
    labelDiv.appendChild(contentEl);

    const label = new CSS2DObject(labelDiv);
    label.position.copy(position);
    label.center.set(1, 0.5);
    label.visible = notable ? this.visible : false;

    this.labels.set(obj.name, label);
    this.objectPositions.set(obj.name, position.clone());

    if (notable) {
      this.notableLabels.add(obj.name);
    } else {
      this.hoverLabels.add(obj.name);
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

      // Stage 1: Draw lines with stagger
      let lineDelay = 500;
      this.notableLabels.forEach((name) => {
        const label = this.labels.get(name);
        if (label) {
          const el = label.element as HTMLElement;
          setTimeout(() => el.classList.add('line-visible'), lineDelay);
          lineDelay += 100;
        }
      });

      // Stage 2: Fade in text with stagger
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

  getObjectPositions(): Map<string, THREE.Vector3> {
    return this.objectPositions;
  }

  getHoverLabels(): Set<string> {
    return this.hoverLabels;
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
