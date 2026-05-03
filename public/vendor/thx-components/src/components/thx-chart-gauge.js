// @ts-check

/**
 * @fileoverview THX 1138 styled analog gauge component
 * @module thx-chart-gauge
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} GaugeConfig
 * @property {number} value
 * @property {number} [min=0]
 * @property {number} [max=100]
 * @property {string} [label='']
 * @property {string} [color]
 */

/**
 * THX 1138 styled analog gauge component
 * @extends {LitElement}
 */
export class ThxChartGauge extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .gauge-container {
      width: 140px;
      height: 140px;
      position: relative;
    }

    .gauge-container svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .gauge-bg {
      fill: none;
      stroke: rgba(166, 200, 225, 0.2);
    }

    .gauge-fill {
      fill: none;
      stroke: var(--atmos-primary, #a6c8e1);
      stroke-linecap: round;
      filter: drop-shadow(0 0 3px rgba(166, 200, 225, 0.5));
      transition: stroke-dasharray var(--duration-moderate-2) ease;
    }

    .gauge-fill.warning {
      stroke: var(--accent-warning, #d4aa00);
      filter: drop-shadow(0 0 3px rgba(212, 170, 0, 0.5));
    }

    .gauge-text {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: 22px;
      fill: var(--atmos-primary, #a6c8e1);
      text-anchor: middle;
      dominant-baseline: middle;
      filter: drop-shadow(0 0 2px rgba(166, 200, 225, 0.6));
    }

    .gauge-label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: 7px;
      fill: var(--atmos-secondary, #707e91);
      text-anchor: middle;
      dominant-baseline: middle;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
    }

    .tick {
      stroke: rgba(166, 200, 225, 0.3);
      stroke-width: 1;
    }

    .tick-label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: 4px;
      fill: var(--atmos-secondary, #707e91);
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      value: { type: Number },
      min: { type: Number },
      max: { type: Number },
      label: { type: String },
      color: { type: String },
      threshold: { type: Number },
    };
  }

  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.label = '';
    this.color = 'var(--atmos-primary, #a6c8e1)';
    this.threshold = 80;
  }

  /**
   * @returns {number}
   */
  get _radius() {
    return 55;
  }

  /**
   * @returns {number}
   */
  get _circumference() {
    return 2 * Math.PI * this._radius;
  }

  /**
   * @returns {string}
   */
  get _strokeDasharray() {
    const percent = Math.min(1, Math.max(0, (this.value - this.min) / (this.max - this.min)));
    const arcLength = this._circumference * 0.75;
    const filled = arcLength * percent;
    return `${filled} ${this._circumference - filled}`;
  }

  /**
   * @returns {number}
   */
  get _rotation() {
    return 135;
  }

  /**
   * @returns {boolean}
   */
  get _isWarning() {
    return this.value >= this.threshold;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const radius = this._radius;
    const circumference = this._circumference;
    const dasharray = this._strokeDasharray;
    const rotation = this._rotation;
    const isWarning = this._isWarning;

    return html`
      <div class="gauge-container">
        <svg viewBox="0 0 140 140">
          <!-- Background arc -->
          <circle
            cx="70"
            cy="70"
            r="${radius}"
            class="gauge-bg"
            stroke-width="8"
            stroke-dasharray="${circumference * 0.75} ${circumference}"
            transform="rotate(${rotation} 70 70)"
          />

          <!-- Value arc -->
          <circle
            cx="70"
            cy="70"
            r="${radius}"
            class="gauge-fill ${isWarning ? 'warning' : ''}"
            stroke="${isWarning ? 'var(--accent-warning, #d4aa00)' : this.color}"
            stroke-width="8"
            stroke-dasharray="${dasharray}"
            transform="rotate(${rotation} 70 70)"
          />

          <!-- Ticks -->
          ${[0, 25, 50, 75, 100].map(pct => {
            const angle = (pct / 100) * 270 + 135;
            const rad = (angle * Math.PI) / 180;
            const x1 = 70 + (radius - 12) * Math.cos(rad);
            const y1 = 70 + (radius - 12) * Math.sin(rad);
            const x2 = 70 + (radius - 8) * Math.cos(rad);
            const y2 = 70 + (radius - 8) * Math.sin(rad);
            const labelX = 70 + (radius - 18) * Math.cos(rad);
            const labelY = 70 + (radius - 18) * Math.sin(rad);
            return html`
              <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tick" />
              <text x="${labelX}" y="${labelY}" class="tick-label">${pct}</text>
            `;
          })}

          <!-- Value text -->
          <text x="70" y="75" class="gauge-text">${this.value}</text>

          <!-- Label -->
          ${this.label ? html`<text x="70" y="95" class="gauge-label">${this.label}</text>` : ''}
        </svg>
      </div>
    `;
  }
}

customElements.define('thx-chart-gauge', ThxChartGauge);
