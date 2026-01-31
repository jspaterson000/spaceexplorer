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
} as const;
