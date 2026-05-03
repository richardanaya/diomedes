// @ts-check

/**
 * @fileoverview THX 1138 styled cron expression input with presets & description.
 * @module thx-cron-input
 */

import { LitElement, html, css } from '../../vendor/lit.js';

// ── Cron presets ────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'EVERY MINUTE', value: '* * * * *' },
  { label: 'EVERY 5 MIN', value: '*/5 * * * *' },
  { label: 'EVERY 15 MIN', value: '*/15 * * * *' },
  { label: 'EVERY 30 MIN', value: '*/30 * * * *' },
  { label: 'EVERY HOUR', value: '0 * * * *' },
  { label: 'EVERY 6 HOURS', value: '0 */6 * * *' },
  { label: 'DAILY AT 9 AM', value: '0 9 * * *' },
  { label: 'DAILY AT NOON', value: '0 12 * * *' },
  { label: 'WEEKDAYS 9 AM', value: '0 9 * * 1-5' },
  { label: 'MONDAYS 9 AM', value: '0 9 * * 1' },
  { label: '1ST OF MONTH', value: '0 9 1 * *' },
];

// ── Cron field names & ranges ───────────────────────────────────────────────

const FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'];
const FIELD_RANGES = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 7 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function describeCron(expr) {
  if (!expr?.trim()) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'INVALID: NEED 5 FIELDS';

  const [min, hour, dom, mon, dow] = parts;

  // Every minute
  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'EVERY MINUTE';
  }

  // Every N minutes
  const minEvery = min.match(/^\*\/(\d+)$/);
  if (minEvery && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `EVERY ${minEvery[1]} MINUTES`;
  }

  // Specific minute of every hour
  if (/^\d+$/.test(min) && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `AT MINUTE ${min} OF EVERY HOUR`;
  }

  // Every hour at specific minute
  if (/^\d+$/.test(min) && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `HOURLY AT :${min.padStart(2, '0')}`;
  }

  // Daily at specific time
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*' && dow === '*') {
    return `DAILY AT ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  // Specific day of week
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*' && !['*', '?'].includes(dow)) {
    const dowNames = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT', 7: 'SUN' };
    let dowDesc = dow;
    if (/^\d+$/.test(dow)) dowDesc = dowNames[parseInt(dow)] || dow;
    if (/^\d+-\d+$/.test(dow)) {
      const [s, e] = dow.split('-').map(Number);
      dowDesc = `${dowNames[s] || s}-${dowNames[e] || e}`;
    }
    return `EVERY ${dowDesc} AT ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  // First of month
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '1' && mon === '*' && dow === '*') {
    return `1ST OF MONTH AT ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  // Every N hours at minute 0
  const hourEvery = hour.match(/^\*\/(\d+)$/);
  if (min === '0' && hourEvery && dom === '*' && mon === '*' && dow === '*') {
    return `EVERY ${hourEvery[1]} HOURS`;
  }

  return expr; // fallback: show raw expression
}

function validateCron(expr) {
  if (!expr?.trim()) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'NEED 5 FIELDS: MIN HOUR DOM MON DOW';

  for (let i = 0; i < 5; i++) {
    const field = parts[i];
    const range = FIELD_RANGES[i];

    // Wildcard
    if (field === '*') continue;

    // Step values like */5
    const stepMatch = field.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1]);
      if (step < 1 || step > range.max) return `${FIELD_NAMES[i]}: STEP OUT OF RANGE`;
      continue;
    }

    // Ranges like 1-5
    const rangeMatch = field.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const s = parseInt(rangeMatch[1]);
      const e = parseInt(rangeMatch[2]);
      if (s < range.min || s > range.max || e < range.min || e > range.max)
        return `${FIELD_NAMES[i]}: RANGE OUT OF BOUNDS`;
      if (s > e) return `${FIELD_NAMES[i]}: START > END`;
      continue;
    }

    // Lists like 1,3,5
    if (field.includes(',')) {
      const listParts = field.split(',');
      for (const p of listParts) {
        if (!/^\d+$/.test(p.trim())) return `${FIELD_NAMES[i]}: INVALID LIST VALUE`;
        const v = parseInt(p.trim());
        if (v < range.min || v > range.max) return `${FIELD_NAMES[i]}: VALUE OUT OF RANGE`;
      }
      continue;
    }

    // Single value
    if (!/^\d+$/.test(field)) return `${FIELD_NAMES[i]}: INVALID`;
    const v = parseInt(field);
    if (v < range.min || v > range.max) return `${FIELD_NAMES[i]}: OUT OF RANGE`;
  }

  return ''; // valid
}

// ── Component ───────────────────────────────────────────────────────────────

export class ThxCronInput extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-2, 8px);
    }

    .label {
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-0, 13px);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4, 2px);
      color: var(--neutral-600, #666);
    }

    /* ── Input row ────────────────── */
    .input-row {
      display: flex;
      align-items: stretch;
      gap: var(--size-1, 4px);
    }

    .input-container {
      flex: 1;
    }

    input {
      width: 100%;
      height: calc(var(--size-7, 28px) + var(--size-2, 8px));
      padding: 0 calc(var(--size-2, 8px) + var(--size-1, 4px));
      border: none;
      border-bottom: var(--border-size-2, 2px) solid var(--neutral-200, #e0e0e0);
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-1, 14px);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2, 1px);
      background: white;
      color: var(--neutral-800, #333);
      transition: border-color var(--duration-moderate-1, 0.2s),
                  box-shadow var(--duration-moderate-1, 0.2s);
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.3);
    }
    input.error {
      border-color: var(--accent-error, #d44000);
    }
    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--neutral-200, #e0e0e0);
    }

    /* ── Presets ──────────────────── */
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: var(--size-1, 4px);
    }
    .preset-btn {
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-00, 9px);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-1, 0.5px);
      padding: 1px 8px;
      border: var(--border-size-1, 1px) solid var(--neutral-200, #e0e0e0);
      background: var(--neutral-100, #fafafa);
      color: var(--atmos-secondary, #707e91);
      cursor: pointer;
      transition: background var(--duration-quick-2, 0.15s),
                  border-color var(--duration-quick-2, 0.15s),
                  color var(--duration-quick-2, 0.15s);
    }
    .preset-btn:hover {
      background: rgba(166, 200, 225, 0.1);
      border-color: var(--atmos-primary, #a6c8e1);
      color: var(--atmos-primary, #a6c8e1);
    }
    .preset-btn.active {
      background: rgba(166, 200, 225, 0.15);
      border-color: var(--atmos-primary, #a6c8e1);
      color: var(--atmos-primary, #a6c8e1);
    }

    /* ── Description / error ──────── */
    .status {
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-00, 10px);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2, 1px);
      min-height: var(--size-3, 12px);
      color: var(--atmos-secondary, #707e91);
    }
    .status.error {
      color: var(--accent-error, #d44000);
    }
  `;

  static properties = {
    value: { type: String },
    label: { type: String },
    disabled: { type: Boolean },
    _error: { type: String, state: true },
  };

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    /** @type {string} */
    this.value = '';
    /** @type {string} */
    this.label = '';
    /** @type {boolean} */
    this.disabled = false;
    /** @type {string} */
    this._error = '';
  }

  /** @param {Map<string, unknown>} changedProperties */
  updated(changedProperties) {
    if (changedProperties.has('value')) {
      this._error = validateCron(this.value);
      this._updateFormValue();
    }
  }

  /** @returns {void} */
  firstUpdated() {
    this._error = validateCron(this.value);
  }

  /** @returns {void} */
  _updateFormValue() {
    this._internals?.setFormValue(this.disabled ? null : this.value);
  }

  // ── Handlers ───────────────────────────────────────────────────────────

  /** @param {InputEvent} event */
  _handleInput(event) {
    event.stopPropagation();
    const target = /** @type {HTMLInputElement} */ (event.target);
    this.value = target.value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  /** @param {Event} event */
  _handleChange(event) {
    event.stopPropagation();
    const target = /** @type {HTMLInputElement} */ (event.target);
    this.value = target.value;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /** @param {string} cronExpr */
  _applyPreset(cronExpr) {
    this.value = cronExpr;
    this._error = '';
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  // ── Focus ──────────────────────────────────────────────────────────────

  /** @returns {void} */
  focus() {
    this.renderRoot?.querySelector('input')?.focus();
  }

  /** @returns {void} */
  blur() {
    this.renderRoot?.querySelector('input')?.blur();
  }

  // ── Render ─────────────────────────────────────────────────────────────

  /** @returns {import('lit').TemplateResult} */
  render() {
    const description = this._error || describeCron(this.value);
    const isError = !!this._error;

    return html`
      <div class="wrapper">
        ${this.label
          ? html`<span class="label">${this.label}</span>`
          : ''}
        <div class="input-row">
          <div class="input-container">
            <input
              type="text"
              .value=${this.value}
              placeholder="* * * * *"
              ?disabled=${this.disabled}
              class=${isError ? 'error' : ''}
              @input=${this._handleInput}
              @change=${this._handleChange}
            />
          </div>
        </div>
        <div class="presets">
          ${PRESETS.map(
            (p) => html`
              <button
                type="button"
                class="preset-btn ${this.value === p.value ? 'active' : ''}"
                ?disabled=${this.disabled}
                @click=${() => this._applyPreset(p.value)}
              >
                ${p.label}
              </button>
            `,
          )}
        </div>
        <div class="status ${isError ? 'error' : ''}">${description || ' '}</div>
      </div>
    `;
  }
}

customElements.define('thx-cron-input', ThxCronInput);
