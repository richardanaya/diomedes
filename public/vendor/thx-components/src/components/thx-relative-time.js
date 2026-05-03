// @ts-check

/**
 * @fileoverview THX 1138 styled relative time component
 * @module thx-relative-time
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} RelativeTimeConfig
 * @property {string|Date} date - The date to display relative to now
 * @property {'auto'|'always'|'never'} [update='auto'] - Auto-update mode
 * @property {number} [updateInterval=60000] - Update interval in ms
 * @property {'short'|'narrow'|'long'} [style='narrow'] - Format style
 */

/**
 * Time units in milliseconds.
 * @type {Record<string, number>}
 */
const UNITS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Formats a date to relative time string.
 *
 * @param {Date} date - The date to format
 * @param {'short'|'narrow'|'long'} [style='narrow'] - Format style
 * @param {Date} [now=new Date()] - Reference date (default now)
 * @returns {string} Relative time string
 */
function formatRelativeTime(date, style = 'narrow', now = new Date()) {
  const diff = now.getTime() - date.getTime();
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  // Find appropriate unit
  let unit = 'second';
  let value = Math.floor(absDiff / UNITS.second);

  if (absDiff >= UNITS.year) {
    unit = 'year';
    value = Math.floor(absDiff / UNITS.year);
  } else if (absDiff >= UNITS.month) {
    unit = 'month';
    value = Math.floor(absDiff / UNITS.month);
  } else if (absDiff >= UNITS.week) {
    unit = 'week';
    value = Math.floor(absDiff / UNITS.week);
  } else if (absDiff >= UNITS.day) {
    unit = 'day';
    value = Math.floor(absDiff / UNITS.day);
  } else if (absDiff >= UNITS.hour) {
    unit = 'hour';
    value = Math.floor(absDiff / UNITS.hour);
  } else if (absDiff >= UNITS.minute) {
    unit = 'minute';
    value = Math.floor(absDiff / UNITS.minute);
  }

  // Format based on style
  const suffix = isFuture ? ' UNTIL' : ' AGO';
  const suffixShort = isFuture ? '' : '';

  if (style === 'narrow') {
    /** @type {Record<string, string>} */
    const narrowUnits = {
      second: 'S',
      minute: 'M',
      hour: 'H',
      day: 'D',
      week: 'W',
      month: 'MO',
      year: 'Y',
    };
    return `${value}${narrowUnits[unit]}${suffixShort}`;
  }

  if (style === 'short') {
    /** @type {Record<string, string>} */
    const shortUnits = {
      second: 'SEC',
      minute: 'MIN',
      hour: 'HR',
      day: 'DAY',
      week: 'WK',
      month: 'MO',
      year: 'YR',
    };
    return `${value} ${shortUnits[unit]}${suffix}`;
  }

  // Long style
  /** @type {Record<string, string>} */
  const longUnits = {
    second: 'SECOND',
    minute: 'MINUTE',
    hour: 'HOUR',
    day: 'DAY',
    week: 'WEEK',
    month: 'MONTH',
    year: 'YEAR',
  };
  const plural = value === 1 ? '' : 'S';
  return `${value} ${longUnits[unit]}${plural}${suffix}`;
}

/**
 * THX 1138 styled relative time component.
 * Displays time relative to now (e.g., "5 MIN AGO", "2H").
 *
 * @extends {LitElement}
 */
export class ThxRelativeTime extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .time-container {
      display: inline-flex;
      align-items: center;
      gap: var(--size-1);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
      text-transform: uppercase;
    }

    .time-value {
      color: var(--neutral-800, #333);
      font-weight: var(--font-weight-6);
    }

    .time-label {
      color: var(--neutral-600, #666);
      font-size: var(--font-size-0);
    }

    /* CRT display variant */
    :host([variant='crt']) .time-container {
      background: var(--crt-bg, #111);
      padding: var(--size-1) var(--size-2);
      border: var(--border-size-2) solid var(--crt-border, #2a2a2a);
    }

    :host([variant='crt']) .time-value {
      color: var(--atmos-primary, #a6c8e1);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.4);
    }

    :host([variant='crt']) .time-label {
      color: var(--atmos-secondary, #707e91);
    }

    /* Badge variant */
    :host([variant='badge']) .time-container {
      background: var(--atmos-secondary, #707e91);
      color: var(--neutral-100, #fafafa);
      padding: var(--size-1) var(--size-2);
      font-size: var(--font-size-0);
    }

    :host([variant='badge']) .time-value {
      color: var(--neutral-100, #fafafa);
    }

    :host([variant='badge']) .time-label {
      color: var(--atmos-tertiary, #deffff);
    }

    /* Warning state for old times */
    :host([variant='warning']) .time-container {
      background: rgba(212, 170, 0, 0.15);
      border: var(--border-size-1) solid var(--accent-warning, #d4aa00);
      padding: var(--size-1) var(--size-2);
    }

    :host([variant='warning']) .time-value {
      color: var(--accent-warning, #d4aa00);
    }

    /* Error state for very old times */
    :host([variant='error']) .time-container {
      background: rgba(212, 64, 0, 0.15);
      border: var(--border-size-1) solid var(--accent-error, #d44000);
      padding: var(--size-1) var(--size-2);
    }

    :host([variant='error']) .time-value {
      color: var(--accent-error, #d44000);
    }

    /* Live indicator */
    .live-indicator {
      width: var(--size-1);
      height: var(--size-1);
      background: var(--accent-warning, #d4aa00);
      border-radius: var(--radius-round);
      margin-left: var(--size-1);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }

    :host([live]) .live-indicator {
      display: inline-block;
    }

    :host(:not([live])) .live-indicator {
      display: none;
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Date to display relative time for */
      date: { type: String },
      /** Format style: short, narrow, long */
      format: { type: String },
      /** Auto-update mode: auto, always, never */
      updateMode: { type: String, attribute: 'update-mode' },
      /** Update interval in ms */
      updateInterval: { type: Number, attribute: 'update-interval' },
      /** Threshold in ms for warning variant */
      warningThreshold: { type: Number, attribute: 'warning-threshold' },
      /** Threshold in ms for error variant */
      errorThreshold: { type: Number, attribute: 'error-threshold' },
      /** Show live indicator */
      live: { type: Boolean },
      /** Current relative time string */
      _relativeTime: { type: String, state: true },
    };
  }

  constructor() {
    super();
    /** @type {string|Date} */
    this.date = new Date().toISOString();
    /** @type {'short'|'narrow'|'long'} */
    this.format = 'narrow';
    /** @type {'auto'|'always'|'never'} */
    this.updateMode = 'auto';
    /** @type {number} */
    this.updateInterval = 60000; // 1 minute
    /** @type {number} */
    this.warningThreshold = 24 * 60 * 60 * 1000; // 1 day
    /** @type {number} */
    this.errorThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
    /** @type {boolean} */
    this.live = false;
    /** @type {string} */
    this._relativeTime = '';
    /** @type {number|null} */
    this._timer = null;
  }

  /**
   * @returns {void}
   */
  connectedCallback() {
    super.connectedCallback();
    this._updateTime();
    this._startTimer();
  }

  /**
   * @returns {void}
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTimer();
  }

  /**
   * @param {import('lit').PropertyValues} changedProperties
   * @returns {void}
   */
  updated(changedProperties) {
    if (changedProperties.has('date')) {
      this._updateTime();
    }
    if (changedProperties.has('updateInterval') || changedProperties.has('updateMode')) {
      this._stopTimer();
      this._startTimer();
    }
  }

  /**
   * Starts the update timer.
   * @returns {void}
   */
  _startTimer() {
    if (this.updateMode === 'never') return;

    const interval =
      this.updateMode === 'always' ? this.updateInterval : this._calculateDynamicInterval();
    this._timer = window.setInterval(() => {
      this._updateTime();
      if (this.updateMode === 'auto') {
        this._stopTimer();
        this._startTimer(); // Recalculate interval
      }
    }, interval);
  }

  /**
   * Stops the update timer.
   * @returns {void}
   */
  _stopTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Calculates dynamic update interval based on time difference.
   * @returns {number}
   */
  _calculateDynamicInterval() {
    const date = this._parsedDate;
    if (!date) return this.updateInterval;

    const diff = Math.abs(Date.now() - date.getTime());

    if (diff < UNITS.minute) return 5000; // 5 seconds
    if (diff < UNITS.hour) return 60000; // 1 minute
    if (diff < UNITS.day) return 300000; // 5 minutes
    return 3600000; // 1 hour
  }

  /**
   * Updates the relative time string.
   * @returns {void}
   */
  _updateTime() {
    const date = this._parsedDate;
    if (!date) {
      this._relativeTime = 'INVALID';
      return;
    }

    this._relativeTime = formatRelativeTime(date, this.format);

    // Auto-set variant based on thresholds
    const diff = Math.abs(Date.now() - date.getTime());
    if (this.errorThreshold && diff >= this.errorThreshold) {
      this.setAttribute('variant', 'error');
    } else if (this.warningThreshold && diff >= this.warningThreshold) {
      this.setAttribute('variant', 'warning');
    }
  }

  /**
   * Gets the parsed date.
   * @returns {Date|null}
   */
  get _parsedDate() {
    if (!this.date) return null;
    const date = this.date instanceof Date ? this.date : new Date(this.date);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <span class="time-container" part="base">
        <span class="time-value" part="value">${this._relativeTime}</span>
        ${this.live ? html`<span class="live-indicator" part="indicator"></span>` : null}
      </span>
    `;
  }
}

customElements.define('thx-relative-time', ThxRelativeTime);
