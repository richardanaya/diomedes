// @ts-check

/**
 * @fileoverview THX 1138 styled range slider component
 * @module thx-range
 */

import { LitElement, html, css } from '../../vendor/lit.js';

let rangeIdCounter = 0;

/**
 * @typedef {Object} RangeProps
 * @property {number} value - The current value
 * @property {number} min - The minimum value
 * @property {number} max - The maximum value
 * @property {number} step - The step increment
 * @property {boolean} disabled - Whether the slider is disabled
 * @property {string} label - The label text
 * @property {string} name - The range name
 * @property {boolean} required - Whether the range is required
 * @property {boolean} showValue - Whether to show the current value
 * @property {string} valueFormat - Format string for value display
 */

/**
 * THX 1138 styled range slider component
 * @extends {LitElement}
 */
export class ThxRange extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: block;
    }

    .range-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-2);
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-600, #666);
    }

    .value-display {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: var(--neutral-800, #333);
      background: var(--neutral-200, #e0e0e0);
      padding: var(--size-1) var(--size-2);
      min-width: calc(var(--size-7) + var(--size-2));
      text-align: center;
    }

    .required-indicator {
      color: var(--accent-error, #d44000);
      margin-left: var(--size-1);
    }

    .range-status {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      color: var(--neutral-600, #666);
    }

    .range-status.error {
      color: var(--accent-error, #d44000);
    }

    .slider-container {
      position: relative;
      display: flex;
      align-items: center;
      height: var(--size-5);
    }

    input[type='range'] {
      width: 100%;
      height: var(--size-2);
      appearance: none;
      background: var(--neutral-200, #e0e0e0);
      outline: none;
      cursor: pointer;
      margin: 0;
      padding: 0;
      vertical-align: middle;
      position: relative;
      z-index: 2;
    }

    input[type='range']:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Webkit slider thumb - margin-top centers var(--size-3) thumb on var(--size-2) track */
    input[type='range']::-webkit-slider-thumb {
      appearance: none;
      width: var(--size-3);
      height: var(--size-3);
      background: var(--neutral-800, #333);
      cursor: pointer;
      border: none;
      border-radius: 0;
      transition: all var(--duration-quick-2);
      margin-top: -5px;
      position: relative;
      z-index: 3;
    }

    input[type='range']::-webkit-slider-thumb:hover {
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.6);
    }

    input[type='range']:focus::-webkit-slider-thumb {
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.5);
    }

    /* Webkit slider runnable track */
    input[type='range']::-webkit-slider-runnable-track {
      height: var(--size-2);
      background: var(--neutral-200, #e0e0e0);
      border: none;
    }

    /* Firefox slider thumb */
    input[type='range']::-moz-range-thumb {
      width: var(--size-3);
      height: var(--size-3);
      background: var(--neutral-800, #333);
      cursor: pointer;
      border: none;
      border-radius: 0;
      transition: all var(--duration-quick-2);
      position: relative;
      z-index: 3;
    }

    input[type='range']::-moz-range-thumb:hover {
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.6);
    }

    /* Firefox slider track */
    input[type='range']::-moz-range-track {
      height: var(--size-2);
      background: var(--neutral-200, #e0e0e0);
      border: none;
    }

    input[type='range']::-moz-range-progress {
      height: var(--size-2);
      background: var(--atmos-secondary, #707e91);
      border: none;
    }

    .ticks {
      display: flex;
      justify-content: space-between;
      margin-top: var(--size-1);
      padding: 0 9px;
    }

    .tick {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-00);
      color: var(--neutral-600, #666);
      text-transform: uppercase;
    }

    .progress-bar {
      position: absolute;
      height: var(--size-2);
      top: 50%;
      transform: translateY(-50%);
      left: 0;
      background: var(--atmos-secondary, #707e91);
      pointer-events: none;
      z-index: 1;
    }
  `;

  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    name: { type: String },
    required: { type: Boolean },
    errorMessage: { type: String },
    showValue: { type: Boolean },
    valueFormat: { type: String },
    showTicks: { type: Boolean },
    tickCount: { type: Number },
  };

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    this._rangeId = `thx-range-${++rangeIdCounter}`;
    this._labelId = `${this._rangeId}-label`;
    this._helpId = `${this._rangeId}-help`;
    this._errorId = `${this._rangeId}-error`;
    /** @type {number} */
    this.value = 50;
    this._defaultValue = this.value;
    /** @type {number} */
    this.min = 0;
    /** @type {number} */
    this.max = 100;
    /** @type {number} */
    this.step = 1;
    /** @type {boolean} */
    this.disabled = false;
    /** @type {string} */
    this.label = '';
    /** @type {string} */
    this.name = '';
    /** @type {boolean} */
    this.required = false;
    /** @type {string} */
    this.errorMessage = '';
    /** @type {boolean} */
    this.showValue = true;
    /** @type {string} */
    this.valueFormat = '{value}';
    /** @type {boolean} */
    this.showTicks = false;
    /** @type {number} */
    this.tickCount = 5;
  }

  /** @param {Map<string, unknown>} changedProperties */
  updated(changedProperties) {
    if (changedProperties.has('value') || changedProperties.has('disabled')) {
      this._updateFormValue();
    }
  }

  /** @returns {void} */
  firstUpdated() {
    this._defaultValue = this.value;
    this._updateFormValue();
  }

  /** @returns {void} */
  _updateFormValue() {
    this._internals?.setFormValue(this.disabled ? null : String(this.value));
  }

  /** @returns {void} */
  formResetCallback() {
    this.value = this._defaultValue;
  }

  /** @returns {string} */
  get describedBy() {
    return this.errorMessage ? this._errorId : this._helpId;
  }

  /**
   * @returns {string}
   */
  get formattedValue() {
    return this.valueFormat.replace('{value}', String(this.value));
  }

  /**
   * @returns {number[]}
   */
  get tickValues() {
    const ticks = [];
    const range = this.max - this.min;
    for (let i = 0; i <= this.tickCount; i++) {
      ticks.push(Math.round(this.min + (range * i) / this.tickCount));
    }
    return ticks;
  }

  /**
   * @returns {number}
   */
  get progressPercentage() {
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }

  /**
   * @param {InputEvent} event
   * @returns {void}
   */
  handleInput(event) {
    event.stopPropagation();
    const target = /** @type {HTMLInputElement} */ (event.target);
    this.value = Number(target.value);
    this._updateFormValue();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  /**
   * @param {Event} event
   * @returns {void}
   */
  handleChange(event) {
    event.stopPropagation();
    const target = /** @type {HTMLInputElement} */ (event.target);
    this.value = Number(target.value);
    this._updateFormValue();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="range-wrapper">
        <div class="label-row">
          ${this.label
            ? html`<label class="label" id=${this._labelId} for=${this._rangeId}
                >${this.label}${this.required
                  ? html`<span class="required-indicator">*</span>`
                  : null}</label
              >`
            : null}
          ${this.showValue ? html`<span class="value-display">${this.formattedValue}</span>` : null}
        </div>
        <div class="slider-container">
          <div class="progress-bar" style="width: ${this.progressPercentage}%"></div>
          <input
            id=${this._rangeId}
            type="range"
            .min=${this.min}
            .max=${this.max}
            .step=${this.step}
            .value=${this.value}
            ?disabled=${this.disabled}
            .name=${this.name}
            ?required=${this.required}
            aria-describedby=${this.describedBy}
            aria-invalid=${this.errorMessage ? 'true' : 'false'}
            aria-required=${this.required ? 'true' : 'false'}
            @input=${this.handleInput}
            @change=${this.handleChange}
          />
        </div>
        ${this.showTicks
          ? html`
              <div class="ticks">
                ${this.tickValues.map(tick => html`<span class="tick">${tick}</span>`)}
              </div>
            `
          : null}
        ${this.errorMessage
          ? html`<div class="range-status error" id=${this._errorId}>${this.errorMessage}</div>`
          : html`<div class="range-status" id=${this._helpId}><slot name="help-text"></slot></div>`}
      </div>
    `;
  }
}

customElements.define('thx-range', ThxRange);
