// @ts-check

/**
 * @fileoverview THX 1138 styled bytes formatter component
 * @module thx-format-bytes
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} FormatBytesConfig
 * @property {number} value - The number of bytes to format
 * @property {'bytes'|'bits'|'b'|'B'} unit - The unit type
 * @property {number} [precision=2] - Decimal places to show
 */

/**
 * Formats a number of bytes to a human-readable string.
 *
 * @param {number} bytes - The number of bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @param {'bytes'|'bits'|'b'|'B'} [unit='bytes'] - Unit type
 * @returns {string} Formatted string with appropriate unit
 */
function formatBytes(bytes, decimals = 2, unit = 'bytes') {
  if (bytes === 0) return `0 ${unit === 'bits' ? 'b' : 'B'}`;

  const isBits = unit === 'bits' || unit === 'b';
  const base = isBits ? 1000 : 1024;
  const k = isBits ? 1000 : 1024;

  const sizes = isBits
    ? ['b', 'kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(Math.abs(bytes) * base) / Math.log(k));
  const dm = decimals < 0 ? 0 : decimals;

  const value = (bytes * base) / Math.pow(k, i);
  return `${value.toFixed(dm)} ${sizes[i] || 'B'}`;
}

/**
 * THX 1138 styled bytes formatter component.
 * Displays file sizes in a clinical, monospace format matching the dystopian aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxFormatBytes extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .bytes-container {
      display: inline-flex;
      align-items: baseline;
      gap: var(--size-1);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
      text-transform: uppercase;
    }

    .bytes-value {
      color: var(--neutral-800, #333);
      font-weight: var(--font-weight-6);
    }

    .bytes-unit {
      color: var(--neutral-600, #666);
      font-size: var(--font-size-0);
    }

    /* CRT display variant */
    :host([variant='crt']) .bytes-container {
      background: var(--crt-bg, #111);
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      border: var(--border-size-2) solid var(--crt-border, #2a2a2a);
    }

    :host([variant='crt']) .bytes-value {
      color: var(--atmos-primary, #a6c8e1);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.4);
    }

    :host([variant='crt']) .bytes-unit {
      color: var(--atmos-secondary, #707e91);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Number of bytes to format */
      value: { type: Number },
      /** Unit type: bytes, bits, b, B */
      unit: { type: String },
      /** Decimal places for precision */
      precision: { type: Number },
    };
  }

  constructor() {
    super();
    /** @type {number} */
    this.value = 0;
    /** @type {'bytes'|'bits'|'b'|'B'} */
    this.unit = 'bytes';
    /** @type {number} */
    this.precision = 2;
  }

  /**
   * Gets the formatted bytes string.
   * @returns {string}
   */
  get formattedValue() {
    return formatBytes(this.value, this.precision, this.unit);
  }

  /**
   * Parses the formatted value into numeric and unit parts.
   * @returns {{value: string, unit: string}}
   */
  get parsedValue() {
    const formatted = this.formattedValue;
    const parts = formatted.split(' ');
    return {
      value: parts[0] || '0',
      unit: parts[1] || 'B',
    };
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const { value, unit } = this.parsedValue;

    return html`
      <span class="bytes-container" part="base">
        <span class="bytes-value" part="value">${value}</span>
        <span class="bytes-unit" part="unit">${unit}</span>
      </span>
    `;
  }
}

customElements.define('thx-format-bytes', ThxFormatBytes);
