export enum ScaleLevel {
  Planet = 'planet',
  SolarSystem = 'solar-system',
  Stellar = 'stellar',
  LocalBubble = 'local-bubble',
  OrionArm = 'orion-arm',
  MilkyWay = 'milky-way',
}

const LEVELS = [ScaleLevel.Planet, ScaleLevel.SolarSystem, ScaleLevel.Stellar, ScaleLevel.LocalBubble, ScaleLevel.OrionArm, ScaleLevel.MilkyWay];

export class ScaleLevelState {
  private _current: ScaleLevel = ScaleLevel.Planet;
  private _lastFocusedBody: string = 'earth';

  get current(): ScaleLevel {
    return this._current;
  }

  get lastFocusedBody(): string {
    return this._lastFocusedBody;
  }

  setLastFocusedBody(body: string): void {
    this._lastFocusedBody = body;
  }

  canGoUp(): boolean {
    const idx = LEVELS.indexOf(this._current);
    return idx < LEVELS.length - 1;
  }

  canGoDown(): boolean {
    const idx = LEVELS.indexOf(this._current);
    return idx > 0;
  }

  goUp(): void {
    if (this.canGoUp()) {
      const idx = LEVELS.indexOf(this._current);
      this._current = LEVELS[idx + 1];
    }
  }

  goDown(): void {
    if (this.canGoDown()) {
      const idx = LEVELS.indexOf(this._current);
      this._current = LEVELS[idx - 1];
    }
  }

  isOrreryMode(): boolean {
    return this._current === ScaleLevel.SolarSystem;
  }

  isStellarMode(): boolean {
    return this._current === ScaleLevel.Stellar;
  }

  isLocalBubbleMode(): boolean {
    return this._current === ScaleLevel.LocalBubble;
  }

  isOrionArmMode(): boolean {
    return this._current === ScaleLevel.OrionArm;
  }

  isMilkyWayMode(): boolean {
    return this._current === ScaleLevel.MilkyWay;
  }
}
