// src/ui/InfoCard.ts
import type { TLE, SatelliteCategory } from '../data/types';

const CATEGORY_COLORS: Record<SatelliteCategory, string> = {
  station: 'var(--pulse)',      // orange
  science: 'var(--ice)',        // blue
  communication: 'var(--stardust)', // gray
  navigation: 'var(--sol)',     // amber
  other: 'var(--stardust)',     // gray
};

const CATEGORY_LABELS: Record<SatelliteCategory, string> = {
  station: 'Space Station',
  science: 'Science',
  communication: 'Communication',
  navigation: 'Navigation',
  other: 'Other',
};

export interface SatelliteInfo {
  tle: TLE;
  altitude: number;  // meters
  velocity: number;  // m/s
}

export class InfoCard {
  private container: HTMLElement;
  private closeCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(info: SatelliteInfo): void {
    const { tle, altitude, velocity } = info;
    const color = CATEGORY_COLORS[tle.category];
    const categoryLabel = CATEGORY_LABELS[tle.category];

    // Format altitude
    const altitudeKm = altitude / 1000;
    const altitudeStr = altitudeKm >= 1000
      ? `${(altitudeKm / 1000).toFixed(2)} thousand km`
      : `${altitudeKm.toFixed(0)} km`;

    // Format velocity
    const velocityKmS = velocity / 1000;
    const velocityStr = `${velocityKmS.toFixed(2)} km/s`;

    // CelesTrak URL
    const celestrakUrl = `https://celestrak.org/satcat/table.php?CATNR=${tle.catalogNumber}`;

    this.container.innerHTML = `
      <div class="info-card-content">
        <button class="info-card-close" aria-label="Close">&times;</button>
        <div class="info-card-header">
          <span class="info-card-category-dot" style="background-color: ${color};"></span>
          <span class="info-card-category">${categoryLabel}</span>
        </div>
        <h2 class="info-card-name">${this.escapeHtml(tle.name)}</h2>
        <div class="info-card-stats">
          <div class="info-card-stat">
            <span class="info-card-stat-label">Altitude</span>
            <span class="info-card-stat-value">${altitudeStr}</span>
          </div>
          <div class="info-card-stat">
            <span class="info-card-stat-label">Velocity</span>
            <span class="info-card-stat-value">${velocityStr}</span>
          </div>
          <div class="info-card-stat">
            <span class="info-card-stat-label">NORAD ID</span>
            <span class="info-card-stat-value">${tle.catalogNumber}</span>
          </div>
        </div>
        <a href="${celestrakUrl}" target="_blank" rel="noopener noreferrer" class="info-card-link">
          View on CelesTrak &rarr;
        </a>
      </div>
    `;

    // Add close button handler
    const closeBtn = this.container.querySelector('.info-card-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Show the card
    this.container.classList.add('visible');
  }

  hide(): void {
    this.container.classList.remove('visible');
    if (this.closeCallback) {
      this.closeCallback();
    }
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
