import { describe, it, expect } from 'vitest';
import { ScaleLevel, ScaleLevelState } from './ScaleLevel';

describe('ScaleLevel', () => {
  it('starts at planet level', () => {
    const state = new ScaleLevelState();
    expect(state.current).toBe(ScaleLevel.Planet);
  });

  it('can go up from planet to solar system', () => {
    const state = new ScaleLevelState();
    expect(state.canGoUp()).toBe(true);
    state.goUp();
    expect(state.current).toBe(ScaleLevel.SolarSystem);
  });

  it('cannot go up from solar system (top level)', () => {
    const state = new ScaleLevelState();
    state.goUp();
    expect(state.canGoUp()).toBe(false);
  });

  it('can go down from solar system to planet', () => {
    const state = new ScaleLevelState();
    state.goUp();
    expect(state.canGoDown()).toBe(true);
    state.goDown();
    expect(state.current).toBe(ScaleLevel.Planet);
  });

  it('cannot go down from planet (bottom level)', () => {
    const state = new ScaleLevelState();
    expect(state.canGoDown()).toBe(false);
  });

  it('tracks last focused body', () => {
    const state = new ScaleLevelState();
    state.setLastFocusedBody('mars');
    expect(state.lastFocusedBody).toBe('mars');
  });

  it('defaults last focused body to earth', () => {
    const state = new ScaleLevelState();
    expect(state.lastFocusedBody).toBe('earth');
  });
});
