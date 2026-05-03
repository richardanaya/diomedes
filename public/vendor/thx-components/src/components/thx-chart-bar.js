// @ts-check

/**
 * @fileoverview THX 1138 styled bar chart component
 * @module thx-chart-bar
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} BarDataPoint
 * @property {string} label
 * @property {number} value
 * @property {number} [max=100]
 * @property {string} [color]
 * @property {boolean} [warning=false]
 */

/**
 * THX 1138 styled bar chart component
 * @extends {LitElement}
 */
export class ThxChartBar extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .chart-container {
      display: flex;
      flex-direction: column;
      gap: var(--size-2);
      padding-top: var(--size-3);
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: calc(var(--size-2) + var(--size-1));
    }

    .bar-label {
      width: 60px;
      color: var(--atmos-secondary, #707e91);
      font-size: var(--font-size-0);
      text-align: right;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
    }

    .bar-track {
      flex: 1;
      height: var(--size-4);
      background: rgba(255, 255, 255, 0.1);
      position: relative;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #444 0%, var(--atmos-primary, #a6c8e1) 100%);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.3);
      position: relative;
      transition: width var(--duration-moderate-2) ease;
    }

    .bar-fill.warning {
      background: linear-gradient(90deg, #666 0%, var(--accent-warning, #d4aa00) 100%);
      box-shadow: 0 0 var(--size-2) rgba(212, 170, 0, 0.4);
    }

    .bar-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        rgba(255, 255, 255, 0.1) 2px,
        rgba(255, 255, 255, 0.1) var(--size-1)
      );
    }

    .bar-value {
      width: var(--size-8);
      color: var(--atmos-primary, #a6c8e1);
      font-size: var(--font-size-0);
      text-align: right;
      letter-spacing: var(--font-letterspacing-2);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      data: { type: Array },
    };
  }

  constructor() {
    super();
    /** @type {BarDataPoint[]} */
    this.data = /** @type {BarDataPoint[]} */ ([]);
  }

  /**
   * @param {BarDataPoint} item
   * @returns {string}
   */
  _getWidth(item) {
    const max = item.max || 100;
    const percent = Math.min(100, Math.max(0, (item.value / max) * 100));
    return `${percent}%`;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="chart-container">
        ${this.data.map(
          item => html`
            <div class="bar-row">
              <span class="bar-label">${item.label}</span>
              <div class="bar-track">
                <div
                  class="bar-fill ${item.warning ? 'warning' : ''}"
                  style="width: ${this._getWidth(item)}"
                ></div>
              </div>
              <span class="bar-value">${item.value}${item.max === 100 ? '%' : ''}</span>
            </div>
          `
        )}
      </div>
    `;
  }
}

customElements.define('thx-chart-bar', ThxChartBar);
