// src/data/SatelliteWorker.ts
import type { TLE } from './types';

export class SatelliteWorker {
  private worker: Worker;
  private positionsCallback: ((positions: Float32Array) => void) | null = null;
  private readyPromise: Promise<number>;
  private resolveReady!: (count: number) => void;

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    this.readyPromise = new Promise(resolve => {
      this.resolveReady = resolve;
    });

    this.worker.onmessage = (event) => {
      const { type } = event.data;

      if (type === 'ready') {
        this.resolveReady(event.data.count);
      }

      if (type === 'positions' && this.positionsCallback) {
        this.positionsCallback(event.data.positions);
      }
    };
  }

  async init(tles: TLE[]): Promise<number> {
    this.worker.postMessage({ type: 'init', tles });
    return this.readyPromise;
  }

  requestPositions(time: number): void {
    this.worker.postMessage({ type: 'propagate', time });
  }

  onPositions(callback: (positions: Float32Array) => void): void {
    this.positionsCallback = callback;
  }

  terminate(): void {
    this.worker.terminate();
  }
}
