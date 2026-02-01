import { SimulatedTime } from '../state/SimulatedTime';

const SPEEDS = [1, 7, 30]; // days per second

export class TimeControls {
  private container: HTMLElement;
  private time: SimulatedTime;
  private speedIndex = 0;

  constructor(container: HTMLElement, time: SimulatedTime) {
    this.container = container;
    this.time = time;
    this.render();
  }

  private render(): void {
    const speed = SPEEDS[this.speedIndex];
    const speedLabel = speed === 1 ? '1 day/s' : speed === 7 ? '1 week/s' : '1 month/s';

    this.container.innerHTML = `
      <button class="time-btn" id="time-rew" title="Step back">◀◀</button>
      <button class="time-btn ${this.time.isPaused ? '' : 'active'}" id="time-play" title="Play/Pause">
        ${this.time.isPaused ? '▶' : '❚❚'}
      </button>
      <button class="time-btn" id="time-ff" title="Step forward">▶▶</button>
      <div class="time-divider"></div>
      <button class="time-btn" id="time-speed" title="Change speed">${speedLabel}</button>
      <div class="time-divider"></div>
      <div class="time-date" id="time-date">${this.formatDate()}</div>
    `;

    this.container.querySelector('#time-rew')?.addEventListener('click', () => {
      this.time.stepBackward(SPEEDS[this.speedIndex]);
      this.updateDate();
    });

    this.container.querySelector('#time-play')?.addEventListener('click', () => {
      this.time.toggle();
      this.render();
    });

    this.container.querySelector('#time-ff')?.addEventListener('click', () => {
      this.time.stepForward(SPEEDS[this.speedIndex]);
      this.updateDate();
    });

    this.container.querySelector('#time-speed')?.addEventListener('click', () => {
      this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
      this.time.setSpeed(SPEEDS[this.speedIndex]);
      this.render();
    });
  }

  private formatDate(): string {
    const d = this.time.getDate();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private updateDate(): void {
    const dateEl = this.container.querySelector('#time-date');
    if (dateEl) {
      dateEl.textContent = this.formatDate();
    }
  }

  show(): void {
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.container.classList.add('hidden');
  }

  update(): void {
    this.updateDate();
  }
}
