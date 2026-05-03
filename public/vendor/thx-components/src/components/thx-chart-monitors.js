// @ts-check

/**
 * @fileoverview THX 1138 styled monitor bank component (small multiples)
 * @module thx-chart-monitors
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} MonitorData
 * @property {string} label
 * @property {string} value
 * @property {number} percent
 * @property {boolean} [alert=false]
 */

/**
 * THX 1138 styled monitor bank component
 * @extends {LitElement}
 */
export class ThxChartMonitors extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .monitor-bank {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: var(--size-2);
      background: var(--crt-grid, #1a1a1a);
      padding: var(--size-3);
      border: var(--size-1) solid #333;
    }

    .monitor-unit {
      background: var(--crt-bg, #111);
      border: var(--border-size-2) solid #333;
      aspect-ratio: 4/3;
      position: relative;
      overflow: hidden;
    }

    .monitor-unit::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 1px,
        rgba(166, 200, 225, 0.03) 1px,
        rgba(166, 200, 225, 0.03) 2px
      );
      pointer-events: none;
    }

    .monitor-unit::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.4) 100%);
      pointer-events: none;
    }

    .monitor-label {
      position: absolute;
      bottom: var(--size-1);
      left: var(--size-1);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-00);
      color: var(--atmos-secondary, #707e91);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      opacity: 0.8;
    }

    .monitor-content {
      position: absolute;
      inset: var(--size-2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-3);
      color: var(--atmos-primary, #a6c8e1);
      text-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.7);
    }

    .monitor-content.alert {
      color: var(--accent-warning, #d4aa00);
      text-shadow: 0 0 var(--size-2) rgba(212, 170, 0, 0.7);
    }

    .monitor-bar {
      position: absolute;
      bottom: var(--size-4);
      left: var(--size-2);
      right: var(--size-2);
      height: var(--size-1);
      background: rgba(166, 200, 225, 0.2);
    }

    .monitor-bar-fill {
      height: 100%;
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.8);
      transition: width var(--duration-moderate-2) ease;
    }

    .monitor-bar-fill.alert {
      background: var(--accent-warning, #d4aa00);
      box-shadow: 0 0 var(--size-1) rgba(212, 170, 0, 0.8);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      data: { type: Array },
      columns: { type: Number },
    };
  }

  constructor() {
    super();
    /** @type {MonitorData[]} */
    this.data = /** @type {MonitorData[]} */ ([]);
    this.columns = 4;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="monitor-bank" style="grid-template-columns: repeat(${this.columns}, 1fr);">
        ${this.data.map(
          item => html`
            <div class="monitor-unit">
              <span class="monitor-label">${item.label}</span>
              <div class="monitor-content ${item.alert ? 'alert' : ''}">${item.value}</div>
              <div class="monitor-bar">
                <div
                  class="monitor-bar-fill ${item.alert ? 'alert' : ''}"
                  style="width: ${item.percent}%"
                ></div>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }
}

customElements.define('thx-chart-monitors', ThxChartMonitors);
