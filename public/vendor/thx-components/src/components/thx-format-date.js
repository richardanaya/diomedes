// @ts-check

/**
 * @fileoverview THX 1138 styled date formatter component
 * @module thx-format-date
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} FormatDateConfig
 * @property {string|Date} date - The date to format
 * @property {'short'|'medium'|'long'|'full'|'iso'|'unix'} format - The format style
 * @property {string} [locale] - The locale to use
 * @property {string} [timeZone] - The timezone
 */

/**
 * Formats a date according to THX 1138 style.
 *
 * @param {Date|string|number} date - The date to format
 * @param {'short'|'medium'|'long'|'full'|'iso'|'unix'|'crt'} [format='medium'] - Format style
 * @param {string} [locale='en-US'] - Locale string
 * @param {string} [timeZone] - Timezone identifier
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'medium', locale = 'en-US', timeZone) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'INVALID DATE';
  }

  if (format === 'iso') {
    return d.toISOString();
  }

  if (format === 'unix') {
    return String(Math.floor(d.getTime() / 1000));
  }

  if (format === 'crt') {
    // THX 1138 style: YYYY-MM-DD // HH:MM:SS
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} // ${hours}:${minutes}:${seconds}`;
  }

  /** @type {Intl.DateTimeFormatOptions} */
  const options = {
    year: 'numeric',
    month: format === 'short' ? '2-digit' : 'short',
    day: '2-digit',
  };

  if (format === 'full' || format === 'long' || format === 'medium') {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  if (format === 'full' || format === 'long') {
    options.second = '2-digit';
  }

  if (timeZone) {
    options.timeZone = timeZone;
  }

  return new Intl.DateTimeFormat(locale, options).format(d).toUpperCase();
}

/**
 * THX 1138 styled date formatter component.
 * Displays dates in clinical, standardized formats.
 *
 * @extends {LitElement}
 */
export class ThxFormatDate extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .date-container {
      display: inline-flex;
      align-items: center;
      gap: var(--size-1);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
      text-transform: uppercase;
    }

    .date-value {
      color: var(--neutral-800, #333);
    }

    /* CRT display variant */
    :host([variant='crt']) .date-container {
      background: var(--crt-bg, #111);
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      border: var(--border-size-2) solid var(--crt-border, #2a2a2a);
      color: var(--atmos-primary, #a6c8e1);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.4);
    }

    /* Label style */
    .date-label {
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      margin-right: var(--size-2);
      letter-spacing: var(--font-letterspacing-4);
    }

    :host([show-label]) .date-container::before {
      content: 'DATE //';
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      margin-right: var(--size-2);
      letter-spacing: var(--font-letterspacing-4);
    }

    :host([variant='crt'][show-label]) .date-container::before {
      color: var(--atmos-secondary, #707e91);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Date to format */
      date: { type: String },
      /** Format style */
      format: { type: String },
      /** Locale string */
      locale: { type: String },
      /** Timezone identifier */
      timeZone: { type: String },
      /** Show date label */
      showLabel: { type: Boolean, attribute: 'show-label' },
    };
  }

  constructor() {
    super();
    /** @type {string|Date} */
    this.date = new Date().toISOString();
    /** @type {'short'|'medium'|'long'|'full'|'iso'|'unix'|'crt'} */
    this.format = 'medium';
    /** @type {string} */
    this.locale = 'en-US';
    /** @type {string|undefined} */
    this.timeZone = undefined;
    /** @type {boolean} */
    this.showLabel = false;
  }

  /**
   * Gets the formatted date string.
   * @returns {string}
   */
  get formattedDate() {
    return formatDate(this.date, this.format, this.locale, this.timeZone);
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <span class="date-container" part="base">
        <span class="date-value" part="value">${this.formattedDate}</span>
      </span>
    `;
  }
}

customElements.define('thx-format-date', ThxFormatDate);
