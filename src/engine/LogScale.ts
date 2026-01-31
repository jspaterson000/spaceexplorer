export const LogScale = {
  metersToLogDistance(meters: number): number {
    return Math.log10(Math.max(1, meters));
  },

  logDistanceToMeters(logDistance: number): number {
    return Math.pow(10, logDistance);
  },

  clampZoom(zoom: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, zoom));
  },

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    const km = meters / 1000;
    if (km < 10) {
      return `${km.toFixed(1)} km`;
    }
    return `${Math.round(km)} km`;
  },

  /**
   * Square-root scaling for orrery orbit distances
   * Input: distance in AU (or any unit)
   * Output: compressed distance
   */
  orreryOrbitScale(distanceAU: number): number {
    return Math.sqrt(distanceAU);
  },

  /**
   * Compress planet size ratios for orrery view
   * Uses cube root to compress 11x -> ~3x, 0.38x -> ~0.7x
   * Input: relative size (Earth = 1)
   * Output: compressed relative size
   */
  orreryPlanetScale(relativeSize: number): number {
    // Cube root compresses the range nicely
    // 11^(1/3) ≈ 2.22, but we want ~3, so use 0.45 power
    // 0.38^0.45 ≈ 0.66
    return Math.pow(relativeSize, 0.45);
  },
} as const;
