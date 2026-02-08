import type { ScaleLevel } from '../state/ScaleLevel';
import type { CelestialBody } from '../ui/Navigation';

type ActionHandler<T extends unknown[] = []> = (...args: T) => void;

class CosmicActionsImpl {
  private handlers = new Map<string, ActionHandler<any>>();

  on<T extends unknown[]>(action: string, handler: ActionHandler<T>): void {
    this.handlers.set(action, handler);
  }

  private emit<T extends unknown[]>(action: string, ...args: T): void {
    const handler = this.handlers.get(action);
    if (handler) handler(...args);
  }

  // Navigation
  flyToBody(body: CelestialBody): void {
    this.emit('flyToBody', body);
  }

  // Scale level
  changeScaleLevel(direction: 'up' | 'down'): void {
    this.emit('changeScaleLevel', direction);
  }

  // Satellites
  toggleSatellites(enabled: boolean): void {
    this.emit('toggleSatellites', enabled);
  }

  // Mission
  startMission(): void {
    this.emit('startMission');
  }

  stopMission(): void {
    this.emit('stopMission');
  }

  // Time controls
  timeToggle(): void {
    this.emit('timeToggle');
  }

  timeStepForward(): void {
    this.emit('timeStepForward');
  }

  timeStepBackward(): void {
    this.emit('timeStepBackward');
  }

  timeChangeSpeed(): void {
    this.emit('timeChangeSpeed');
  }

  // Info card
  closeSatelliteInfo(): void {
    this.emit('closeSatelliteInfo');
  }
}

export const cosmicActions = new CosmicActionsImpl();
