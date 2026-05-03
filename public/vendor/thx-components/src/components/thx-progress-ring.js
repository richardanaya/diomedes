// @ts-check

/**
 * @fileoverview THX 1138 styled circular progress ring component.
 * @module thx-progress-ring
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} ProgressRingConfig
 * @property {number} value - Current progress value (0-100)
 * @property {number} size - Ring size in pixels
 * @property {number} stroke - Stroke width in pixels
 * @property {string} variant - Visual variant: 'default' | 'crt' | 'warning' | 'error'
 * @property {boolean} indeterminate - Whether to show indeterminate animation
 * @property {boolean} showValue - Whether to display value in center
 */

/**
 * Circular progress ring component.
 * Styled with THX 1138 CRT/phosphor aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxProgressRing extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: inline-flex;
    }

    .ring {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .ring__svg {
      transform: rotate(-90deg);
    }

    .ring__track {
      fill: none;
      stroke: var(--neutral-200, #e0e0e0);
    }

    .ring__fill {
      fill: none;
      stroke: var(--neutral-600, #666);
      stroke-linecap: square;
      transition: stroke-dashoffset var(--duration-moderate-2) ease;
    }

    /* Variants */
    .ring--crt .ring__track {
      stroke: rgba(166, 200, 225, 0.2);
    }

    .ring--crt .ring__fill {
      stroke: var(--atmos-primary, #a6c8e1);
      filter: drop-shadow(0 0 var(--size-1) rgba(166, 200, 225, 0.6));
    }

    .ring--warning .ring__fill {
      stroke: var(--accent-warning, #d4aa00);
    }

    .ring--error .ring__fill {
      stroke: var(--accent-error, #d44000);
    }

    /* Indeterminate animation */
    .ring--indeterminate .ring__fill {
      animation: rotate 1.5s linear infinite;
      stroke-dasharray: 60, 200;
    }

    @keyframes rotate {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .ring__value {
      position: absolute;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      font-weight: var(--font-weight-6);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      color: var(--neutral-800, #333);
    }

    .ring--crt .ring__value {
      color: var(--atmos-primary, #a6c8e1);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.5);
    }

    /* Scanline effect for CRT */
    .ring--crt::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(166, 200, 225, 0.05) 2px,
        rgba(166, 200, 225, 0.05) var(--size-1)
      );
      pointer-events: none;
      border-radius: var(--radius-round);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Current progress value (0-100) */
      value: { type: Number },
      /** Ring size in pixels */
      size: { type: Number },
      /** Stroke width in pixels */
      stroke: { type: Number },
      /** Visual variant: 'default' | 'crt' | 'warning' | 'error' */
      variant: { type: String, reflect: true },
      /** Whether to show indeterminate animation */
      indeterminate: { type: Boolean, reflect: true },
      /** Whether to display value in center */
      showValue: { type: Boolean, reflect: true, attribute: 'show-value' },
    };
  }

  constructor() {
    super();
    /** @type {number} */
    this.value = 0;
    /** @type {number} */
    this.size = 48;
    /** @type {number} */
    this.stroke = 4;
    /** @type {string} */
    this.variant = 'default';
    /** @type {boolean} */
    this.indeterminate = false;
    /** @type {boolean} */
    this.showValue = false;
  }

  /**
   * Calculate circle properties.
   * @returns {{radius: number, circumference: number, center: number}}
   * @private
   */
  _getCircleProps() {
    const center = this.size / 2;
    const radius = center - this.stroke / 2;
    const circumference = 2 * Math.PI * radius;
    return { radius, circumference, center };
  }

  /**
   * Calculate stroke dash offset.
   * @param {number} circumference - Circle circumference
   * @returns {number} Stroke dash offset
   * @private
   */
  _getStrokeDashOffset(circumference) {
    if (this.indeterminate) return circumference * 0.7;
    const percentage = Math.min(Math.max(this.value, 0), 100);
    return circumference - (percentage / 100) * circumference;
  }

  /**
   * Get value display text.
   * @returns {string} Formatted value
   * @private
   */
  _getValueText() {
    if (this.indeterminate) return '...';
    return `${Math.round(Math.min(Math.max(this.value, 0), 100))}`;
  }

  /**
   * Render the progress ring component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const { radius, circumference, center } = this._getCircleProps();
    const strokeDashoffset = this._getStrokeDashOffset(circumference);

    const classes = {
      ring: true,
      [`ring--${this.variant}`]: true,
      'ring--indeterminate': this.indeterminate,
    };

    const classString = Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');

    return html`
      <div
        class="${classString}"
        role="progressbar"
        aria-valuenow=${this.indeterminate ? undefined : this.value}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <svg
          class="ring__svg"
          width="${this.size}"
          height="${this.size}"
          viewBox="0 0 ${this.size} ${this.size}"
        >
          <circle
            class="ring__track"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            stroke-width="${this.stroke}"
          />
          <circle
            class="ring__fill"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            stroke-width="${this.stroke}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${strokeDashoffset}"
          />
        </svg>
        ${this.showValue ? html`<span class="ring__value">${this._getValueText()}</span>` : null}
      </div>
    `;
  }
}

customElements.define('thx-progress-ring', ThxProgressRing);
