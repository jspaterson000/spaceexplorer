const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class SimulatedTime {
  private _date: Date;
  private _isPaused = true;
  private _speed = 1; // days per second

  constructor() {
    this._date = new Date();
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  getDate(): Date {
    return new Date(this._date.getTime());
  }

  setSpeed(daysPerSecond: number): void {
    this._speed = daysPerSecond;
  }

  getSpeed(): number {
    return this._speed;
  }

  play(): void {
    this._isPaused = false;
  }

  pause(): void {
    this._isPaused = true;
  }

  toggle(): void {
    this._isPaused = !this._isPaused;
  }

  reset(): void {
    this._date = new Date();
    this._isPaused = true;
  }

  update(deltaMs: number): void {
    if (this._isPaused) return;
    const simDeltaMs = (deltaMs / 1000) * this._speed * MS_PER_DAY;
    this._date = new Date(this._date.getTime() + simDeltaMs);
  }

  stepForward(days = 1): void {
    this._date = new Date(this._date.getTime() + days * MS_PER_DAY);
  }

  stepBackward(days = 1): void {
    this._date = new Date(this._date.getTime() - days * MS_PER_DAY);
  }
}
