import { ScaleLevelState, ScaleLevel } from '../state/ScaleLevel';

export class ScaleLevelNav {
  private container: HTMLElement;
  private state: ScaleLevelState;
  private onLevelChange: ((level: ScaleLevel) => void) | null = null;

  constructor(container: HTMLElement, state: ScaleLevelState) {
    this.container = container;
    this.state = state;
    this.render();
  }

  setOnLevelChange(callback: (level: ScaleLevel) => void): void {
    this.onLevelChange = callback;
  }

  private render(): void {
    this.container.innerHTML = `
      <button class="scale-nav-btn" id="scale-up" ${this.state.canGoUp() ? '' : 'disabled'}>
        <span>▲</span>
      </button>
      <div class="scale-nav-label">${this.getLevelLabel()}</div>
      <button class="scale-nav-btn" id="scale-down" ${this.state.canGoDown() ? '' : 'disabled'}>
        <span>▼</span>
      </button>
    `;

    this.container.querySelector('#scale-up')?.addEventListener('click', () => {
      if (this.state.canGoUp()) {
        this.state.goUp();
        this.render();
        this.onLevelChange?.(this.state.current);
      }
    });

    this.container.querySelector('#scale-down')?.addEventListener('click', () => {
      if (this.state.canGoDown()) {
        this.state.goDown();
        this.render();
        this.onLevelChange?.(this.state.current);
      }
    });
  }

  private getLevelLabel(): string {
    switch (this.state.current) {
      case ScaleLevel.Planet:
        return 'Planet';
      case ScaleLevel.SolarSystem:
        return 'System';
      case ScaleLevel.Stellar:
        return 'Stellar';
      case ScaleLevel.LocalBubble:
        return 'Bubble';
      case ScaleLevel.OrionArm:
        return 'Orion';
      case ScaleLevel.MilkyWay:
        return 'Galaxy';
      default:
        return '';
    }
  }

  update(): void {
    this.render();
  }
}
