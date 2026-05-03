// @ts-check

/**
 * @fileoverview THX 1138 styled linear progress bar component.
 * @module thx-progress-bar
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} ProgressBarConfig
 * @property {number} value - Current progress value (0-100)
 * @property {number} max - Maximum value
 * @property {string} variant - Visual variant: 'default' | 'crt' | 'warning' | 'error'
 * @property {boolean} indeterminate - Whether to show indeterminate animation
 * @property {string} label - Optional label text
 * @property {boolean} showValue - Whether to display the numeric value
 */

/**
 * Linear progress bar component for displaying progress indicators.
 * Styled with THX 1138 CRT/phosphor aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxProgressBar extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: block;
    }

    .progress {
      display: flex;
      flex-direction: column;
      gap: var(--size-2);
    }

    .progress__track {
      width: 100%;
      height: var(--size-2);
      background: var(--neutral-200, #e0e0e0);
      position: relative;
      overflow: hidden;
    }

    .progress__fill {
      height: 100%;
      background: var(--neutral-600, #666);
      transition: width var(--duration-moderate-2) ease;
      position: relative;
    }

    .progress__fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        rgba(255, 255, 255, 0.2) 2px,
        rgba(255, 255, 255, 0.2) var(--size-1)
      );
    }

    /* Variants */
    .progress--crt .progress__track {
      background: rgba(166, 200, 225, 0.2);
      box-shadow: inset 0 0 var(--size-1) rgba(0, 0, 0, 0.3);
    }

    .progress--crt .progress__fill {
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.6);
    }

    .progress--warning .progress__fill {
      background: var(--accent-warning, #d4aa00);
    }

    .progress--error .progress__fill {
      background: var(--accent-error, #d44000);
    }

    /* Indeterminate animation */
    .progress--indeterminate .progress__fill {
      width: 40% !important;
      animation: indeterminate 1.5s ease-in-out infinite;
    }

    @keyframes indeterminate {
      0% {
        transform: translateX(-100%);
      }
      50% {
        transform: translateX(150%);
      }
      100% {
        transform: translateX(-100%);
      }
    }

    .progress__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .progress__label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-600, #666);
    }

    .progress--crt .progress__label {
      color: var(--atmos-primary, #a6c8e1);
    }

    .progress__value {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      font-weight: var(--font-weight-6);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-800, #333);
    }

    .progress--crt .progress__value {
      color: var(--atmos-primary, #a6c8e1);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.5);
    }

    /* CRT scanline effect */
    .progress--crt .progress__track::before {
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
      z-index: 2;
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Current progress value (0-100) */
      value: { type: Number },
      /** Maximum value */
      max: { type: Number },
      /** Visual variant: 'default' | 'crt' | 'warning' | 'error' */
      variant: { type: String, reflect: true },
      /** Whether to show indeterminate animation */
      indeterminate: { type: Boolean, reflect: true },
      /** Optional label text */
      label: { type: String },
      /** Whether to display the numeric value */
      showValue: { type: Boolean, reflect: true, attribute: 'show-value' },
    };
  }

  constructor() {
    super();
    /** @type {number} */
    this.value = 0;
    /** @type {number} */
    this.max = 100;
    /** @type {string} */
    this.variant = 'default';
    /** @type {boolean} */
    this.indeterminate = false;
    /** @type {string} */
    this.label = '';
    /** @type {boolean} */
    this.showValue = false;
  }

  /**
   * Calculate percentage value.
   * @returns {number} Percentage (0-100)
   * @private
   */
  _getPercentage() {
    if (this.indeterminate) return 0;
    const percentage = (this.value / this.max) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  /**
   * Format value display.
   * @returns {string} Formatted value string
   * @private
   */
  _getValueText() {
    if (this.indeterminate) return 'PROCESSING...';
    return `${Math.round(this._getPercentage())}%`;
  }

  /**
   * Render the progress bar component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = {
      progress: true,
      [`progress--${this.variant}`]: true,
      'progress--indeterminate': this.indeterminate,
    };

    const classString = Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');

    const percentage = this._getPercentage();

    return html`
      <div
        class="${classString}"
        role="progressbar"
        aria-valuenow=${this.indeterminate ? undefined : this.value}
        aria-valuemin="0"
        aria-valuemax=${this.max}
        aria-label=${this.label || 'Progress'}
      >
        ${this.label || this.showValue
          ? html`
              <div class="progress__header">
                ${this.label
                  ? html`<span class="progress__label">${this.label}</span>`
                  : html`<span></span>`}
                ${this.showValue
                  ? html`<span class="progress__value">${this._getValueText()}</span>`
                  : null}
              </div>
            `
          : null}
        <div class="progress__track">
          <div
            class="progress__fill"
            style="width: ${this.indeterminate ? '0' : percentage}%"
          ></div>
        </div>
      </div>
    `;
  }
}

customElements.define('thx-progress-bar', ThxProgressBar);
