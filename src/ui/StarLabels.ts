// src/ui/StarLabels.ts
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

interface StarData {
  name: string;
  distance: number; // in light years
}

/**
 * Floating labels for stars in stellar mode
 * Uses CSS2DRenderer for crisp HTML-based labels with animated leader lines
 * Notable stars show labels always; non-notable stars show labels on hover
 */
export class StarLabels {
  private renderer: CSS2DRenderer;
  private labels: Map<string, CSS2DObject> = new Map();
  private notableLabels: Set<string> = new Set();
  private hoverLabels: Set<string> = new Set();
  private scene: THREE.Scene;
  private visible = false;
  private currentHover: string | null = null;
  private starPositions: Map<string, THREE.Vector3> = new Map();

  constructor(container: HTMLElement, _scene: THREE.Scene) {
    this.scene = new THREE.Scene();

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

  addLabel(star: StarData, position: THREE.Vector3, color: string, notable: boolean): void {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'star-label';

    const contentEl = document.createElement('span');
    contentEl.className = 'star-label-content';

    // Create line element with star-specific color gradient
    const lineEl = document.createElement('span');
    lineEl.className = 'star-label-line';
    lineEl.style.background = `linear-gradient(90deg, transparent 0%, ${color} 100%)`;

    // Create text container
    const textEl = document.createElement('span');
    textEl.className = 'star-label-text';

    // Create name element
    const nameEl = document.createElement('span');
    nameEl.className = 'star-label-name';
    nameEl.textContent = star.name;

    // Create distance element
    const distanceEl = document.createElement('span');
    distanceEl.className = 'star-label-distance';
    distanceEl.textContent = star.distance === 0 ? 'You are here' : `${star.distance.toFixed(2)} ly`;

    textEl.appendChild(nameEl);
    textEl.appendChild(distanceEl);

    contentEl.appendChild(textEl);
    contentEl.appendChild(lineEl);
    labelDiv.appendChild(contentEl);

    const label = new CSS2DObject(labelDiv);
    label.position.copy(position);
    label.center.set(1, 0.5);
    // Notable labels follow visibility; hover labels start hidden
    label.visible = notable ? this.visible : false;

    this.labels.set(star.name, label);
    this.starPositions.set(star.name, position.clone());

    // Track label type
    if (notable) {
      this.notableLabels.add(star.name);
    } else {
      this.hoverLabels.add(star.name);
    }

    this.scene.add(label);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.renderer.domElement.style.display = visible ? 'block' : 'none';

    if (visible) {
      // Make notable labels visible but reset animation classes
      // Hover labels stay hidden until hovered
      this.labels.forEach((label, name) => {
        const isNotable = this.notableLabels.has(name);
        label.visible = isNotable;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible', 'hover-visible');
      });

      // Stage 1: Draw lines with stagger after a brief delay (notable only)
      let lineDelay = 500;
      this.notableLabels.forEach((name) => {
        const label = this.labels.get(name);
        if (label) {
          const el = label.element as HTMLElement;
          setTimeout(() => {
            el.classList.add('line-visible');
          }, lineDelay);
          lineDelay += 100; // Stagger lines by 100ms each
        }
      });

      // Stage 2: After lines draw (~0.5s), fade in text with stagger (notable only)
      let textDelay = 500 + 500; // After initial delay + line animation
      this.notableLabels.forEach((name) => {
        const label = this.labels.get(name);
        if (label) {
          const el = label.element as HTMLElement;
          setTimeout(() => {
            el.classList.add('text-visible');
          }, textDelay);
          textDelay += 80; // Stagger text by 80ms each
        }
      });
    } else {
      // Hide immediately and clear hover state
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

  /**
   * Get star positions for raycasting hover detection
   */
  getStarPositions(): Map<string, THREE.Vector3> {
    return this.starPositions;
  }

  /**
   * Get the set of hover-only (non-notable) star names
   */
  getHoverLabels(): Set<string> {
    return this.hoverLabels;
  }

  /**
   * Show hover label for a specific star
   */
  showHoverLabel(starName: string): void {
    if (!this.visible || !this.hoverLabels.has(starName)) return;
    if (this.currentHover === starName) return;

    // Hide previous hover label
    this.hideHoverLabel();

    const label = this.labels.get(starName);
    if (label) {
      this.currentHover = starName;
      label.visible = true;
      const el = label.element as HTMLElement;
      // Instant show for hover labels
      el.classList.add('line-visible', 'text-visible', 'hover-visible');
    }
  }

  /**
   * Hide the current hover label
   */
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
