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

  it('can go up from stellar (not top level anymore)', () => {
    const state = new ScaleLevelState();
    state.goUp(); // Planet -> SolarSystem
    state.goUp(); // SolarSystem -> Stellar
    expect(state.canGoUp()).toBe(true);
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

  it('can go up from stellar to local bubble', () => {
    const state = new ScaleLevelState();
    state.goUp(); // Planet -> SolarSystem
    state.goUp(); // SolarSystem -> Stellar
    expect(state.canGoUp()).toBe(true);
    state.goUp(); // Stellar -> LocalBubble
    expect(state.current).toBe(ScaleLevel.LocalBubble);
  });

  it('can go up from local bubble to orion arm', () => {
    const state = new ScaleLevelState();
    state.goUp(); // Planet -> SolarSystem
    state.goUp(); // SolarSystem -> Stellar
    state.goUp(); // Stellar -> LocalBubble
    expect(state.canGoUp()).toBe(true);
    state.goUp(); // LocalBubble -> OrionArm
    expect(state.current).toBe(ScaleLevel.OrionArm);
  });

  it('cannot go up from orion arm (top level)', () => {
    const state = new ScaleLevelState();
    state.goUp(); // Planet -> SolarSystem
    state.goUp(); // SolarSystem -> Stellar
    state.goUp(); // Stellar -> LocalBubble
    state.goUp(); // LocalBubble -> OrionArm
    expect(state.canGoUp()).toBe(false);
  });

  it('can go down from local bubble to stellar', () => {
    const state = new ScaleLevelState();
    state.goUp();
    state.goUp();
    state.goUp();
    expect(state.canGoDown()).toBe(true);
    state.goDown();
    expect(state.current).toBe(ScaleLevel.Stellar);
  });

  it('isLocalBubbleMode returns true at local bubble level', () => {
    const state = new ScaleLevelState();
    state.goUp();
    state.goUp();
    state.goUp();
    expect(state.isLocalBubbleMode()).toBe(true);
  });

  it('isLocalBubbleMode returns false at other levels', () => {
    const state = new ScaleLevelState();
    expect(state.isLocalBubbleMode()).toBe(false);
    state.goUp();
    expect(state.isLocalBubbleMode()).toBe(false);
    state.goUp();
    expect(state.isLocalBubbleMode()).toBe(false);
  });
});
