// src/data/SatelliteWorker.ts
import type { TLE } from './types';

export class SatelliteWorker {
  private worker: Worker;
  private positionsCallback: ((positions: Float32Array) => void) | null = null;
  private resolveReady: ((count: number) => void) | null = null;

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    this.worker.onmessage = (event) => {
      const { type } = event.data;

      if (type === 'ready' && this.resolveReady) {
        this.resolveReady(event.data.count);
        this.resolveReady = null;
      }

      if (type === 'positions' && this.positionsCallback) {
        this.positionsCallback(event.data.positions);
      }
    };

    this.worker.onerror = (error) => {
      console.error('[Worker] Error:', error);
    };
  }

  async init(tles: TLE[]): Promise<number> {
    return new Promise((resolve) => {
      this.resolveReady = resolve;
      this.worker.postMessage({ type: 'init', tles });
    });
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
