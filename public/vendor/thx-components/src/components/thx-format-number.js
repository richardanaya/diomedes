// @ts-check

/**
 * @fileoverview THX 1138 styled number formatter component
 * @module thx-format-number
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} FormatNumberConfig
 * @property {number} value - The number to format
 * @property {'decimal'|'percent'|'currency'|'exponential'|'engineering'} notation - The notation style
 * @property {number} [precision=2] - Decimal places
 * @property {string} [locale] - The locale to use
 * @property {string} [currency] - Currency code for currency notation
 */

/**
 * Formats a number according to THX 1138 style.
 *
 * @param {number} value - The number to format
 * @param {'decimal'|'percent'|'currency'|'exponential'|'engineering'|'crt'} [notation='decimal'] - Notation style
 * @param {number} [precision=2] - Decimal places
 * @param {string} [locale='en-US'] - Locale string
 * @param {string} [currency='USD'] - Currency code
 * @returns {string} Formatted number string
 */
function formatNumber(
  value,
  notation = 'decimal',
  precision = 2,
  locale = 'en-US',
  currency = 'USD'
) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'NaN';
  }

  if (notation === 'crt') {
    // THX 1138 scientific style: 1.23E+03
    const exp = value === 0 ? 0 : Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exp);
    const sign = exp >= 0 ? '+' : '';
    return `${mantissa.toFixed(precision)}E${sign}${exp}`;
  }

  if (notation === 'exponential') {
    return value.toExponential(precision).toUpperCase();
  }

  if (notation === 'engineering') {
    // Engineering notation: exponent is multiple of 3
    const exp = value === 0 ? 0 : Math.floor(Math.log10(Math.abs(value)));
    const engExp = Math.floor(exp / 3) * 3;
    const mantissa = value / Math.pow(10, engExp);
    const suffixes = ['', 'K', 'M', 'G', 'T', 'P', 'E'];
    const suffixIndex = Math.abs(engExp / 3);
    const suffix = suffixes[suffixIndex] || '';
    return `${mantissa.toFixed(precision)}${suffix}`;
  }

  /** @type {Intl.NumberFormatOptions} */
  const options = {
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
  };

  if (notation === 'percent') {
    options.style = 'percent';
    options.minimumFractionDigits = precision;
  }

  if (notation === 'currency') {
    options.style = 'currency';
    options.currency = currency;
  }

  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * THX 1138 styled number formatter component.
 * Displays numbers in clinical, standardized formats with various notations.
 *
 * @extends {LitElement}
 */
export class ThxFormatNumber extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .number-container {
      display: inline-flex;
      align-items: baseline;
      gap: var(--size-1);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
      text-transform: uppercase;
    }

    .number-value {
      color: var(--neutral-800, #333);
      font-weight: var(--font-weight-6);
    }

    .number-unit {
      color: var(--neutral-600, #666);
      font-size: var(--font-size-0);
    }

    /* CRT display variant */
    :host([variant='crt']) .number-container {
      background: var(--crt-bg, #111);
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      border: var(--border-size-2) solid var(--crt-border, #2a2a2a);
    }

    :host([variant='crt']) .number-value {
      color: var(--atmos-primary, #a6c8e1);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.4);
    }

    :host([variant='crt']) .number-unit {
      color: var(--atmos-secondary, #707e91);
    }

    /* Engineering notation uses larger text for suffix */
    :host([notation='engineering']) .number-unit {
      font-size: var(--font-size-0);
      font-weight: var(--font-weight-6);
    }

    /* Error state */
    .number-error {
      color: var(--accent-error, #d44000);
      font-size: var(--font-size-0);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Number to format */
      value: { type: Number },
      /** Notation style */
      notation: { type: String },
      /** Decimal places precision */
      precision: { type: Number },
      /** Locale string */
      locale: { type: String },
      /** Currency code */
      currency: { type: String },
    };
  }

  constructor() {
    super();
    /** @type {number} */
    this.value = 0;
    /** @type {'decimal'|'percent'|'currency'|'exponential'|'engineering'|'crt'} */
    this.notation = 'decimal';
    /** @type {number} */
    this.precision = 2;
    /** @type {string} */
    this.locale = 'en-US';
    /** @type {string} */
    this.currency = 'USD';
  }

  /**
   * Gets the formatted number string.
   * @returns {string}
   */
  get formattedValue() {
    return formatNumber(this.value, this.notation, this.precision, this.locale, this.currency);
  }

  /**
   * Renders the component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const formatted = this.formattedValue;
    let value = formatted;
    let unit = '';

    // Extract unit for engineering notation
    if (this.notation === 'engineering') {
      const match = formatted.match(/^([\d.]+)([KMGTPE]?)$/);
      if (match) {
        value = match[1];
        unit = match[2];
      }
    }

    // Extract unit for exponential notation
    if (this.notation === 'exponential' || this.notation === 'crt') {
      const match = formatted.match(/^([\d.E+-]+)(.*)$/);
      if (match) {
        value = match[1];
        unit = match[2];
      }
    }

    // Handle percent
    if (this.notation === 'percent' && formatted.endsWith('%')) {
      value = formatted.slice(0, -1).trim();
      unit = '%';
    }

    // Handle currency
    if (this.notation === 'currency') {
      const match = formatted.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
      if (match) {
        value = `${match[1]}${match[2]}`;
        unit = match[3];
      }
    }

    return html`
      <span class="number-container" part="base">
        <span class="number-value" part="value">${value}</span>
        ${unit ? html`<span class="number-unit" part="unit">${unit}</span>` : null}
      </span>
    `;
  }
}

customElements.define('thx-format-number', ThxFormatNumber);
