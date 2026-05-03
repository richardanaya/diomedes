// @ts-check

/**
 * @fileoverview THX 1138 styled rating component
 * @module thx-rating
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} RatingProps
 * @property {number} value - The current rating value
 * @property {number} max - Maximum rating value
 * @property {boolean} readonly - Whether the rating is readonly
 * @property {boolean} disabled - Whether the rating is disabled
 * @property {number} precision - Rating precision (1, 0.5)
 * @property {string} size - The size (sm, md, lg)
 */

/**
 * THX 1138 styled rating component
 * @extends {LitElement}
 */
export class ThxRating extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: inline-block;
    }

    .rating-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--size-1);
    }

    .rating-items {
      display: flex;
      gap: var(--size-1);
    }

    .rating-items:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.5);
    }

    .rating-item {
      cursor: pointer;
      transition: all var(--duration-quick-2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rating-item:hover:not(.disabled) {
      transform: scale(1.1);
    }

    .rating-item.disabled {
      cursor: default;
    }

    /* Sizes */
    .size-sm .rating-item {
      width: var(--size-3);
      height: var(--size-3);
    }

    .size-md .rating-item {
      width: var(--size-4);
      height: var(--size-4);
    }

    .size-lg .rating-item {
      width: var(--size-6);
      height: var(--size-6);
    }

    .rating-item svg {
      width: 100%;
      height: 100%;
    }

    .item-filled svg {
      fill: var(--atmos-primary, #a6c8e1);
      stroke: none;
      filter: drop-shadow(0 0 3px rgba(166, 200, 225, 0.5));
    }

    .item-empty svg {
      fill: transparent;
      stroke: var(--neutral-600, #666);
      stroke-width: 2;
    }

    .item-half svg {
      fill: url(#half-fill-circle);
      stroke: var(--atmos-primary, #a6c8e1);
      stroke-width: 2;
    }

    .value-display {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: var(--neutral-800, #333);
      margin-left: var(--size-2);
      text-transform: uppercase;
    }
  `;

  static properties = {
    value: { type: Number },
    max: { type: Number },
    readonly: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    precision: { type: Number },
    size: { type: String },
    name: { type: String },
  };

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    /** @type {number} */
    this.value = 0;
    this._defaultValue = this.value;
    /** @type {number} */
    this.max = 5;
    /** @type {boolean} */
    this.readonly = false;
    /** @type {boolean} */
    this.disabled = false;
    /** @type {number} */
    this.precision = 1;
    /** @type {string} */
    this.size = 'md';
    /** @type {string} */
    this.name = '';
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

  /**
   * @param {number} value
   * @param {Event|null} originalEvent
   * @returns {void}
   */
  setValue(value, originalEvent = null) {
    if (this.readonly || this.disabled) return;

    const precision = this.precision || 1;
    const steppedValue = Math.round(value / precision) * precision;
    const newValue = Math.max(0, Math.min(this.max, steppedValue));
    if (newValue === this.value) return;

    this.value = newValue;
    this._updateFormValue();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @param {number} index
   * @returns {string}
   */
  getItemState(index) {
    const itemValue = index + 1;
    if (this.value >= itemValue) {
      return 'filled';
    }
    if (this.precision === 0.5 && this.value >= itemValue - 0.5) {
      return 'half';
    }
    return 'empty';
  }

  /**
   * @param {number} index
   * @param {MouseEvent} event
   * @returns {void}
   */
  handleClick(index, event) {
    if (this.readonly || this.disabled) return;

    const rect = this.renderRoot.querySelectorAll('.rating-item')[index]?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const isHalf = this.precision === 0.5 && x < rect.width / 2;
    const newValue = isHalf ? index + 0.5 : index + 1;

    this.setValue(newValue, event);
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  handleKeyDown(event) {
    if (this.readonly || this.disabled) return;

    const step = this.precision || 1;
    let nextValue = this.value;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      nextValue += step;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      nextValue -= step;
    } else if (event.key === 'Home') {
      nextValue = 0;
    } else if (event.key === 'End') {
      nextValue = this.max;
    } else {
      return;
    }

    event.preventDefault();
    this.setValue(nextValue, event);
  }

  /**
   * @param {number} index
   * @returns {import('lit').TemplateResult}
   */
  renderItem(index) {
    const state = this.getItemState(index);
    const isDisabled = this.disabled || this.readonly;

    // Filled circle (solid)
    const filledCircle = html`
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
      </svg>
    `;

    // Empty circle (outline only)
    const emptyCircle = html`
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" />
      </svg>
    `;

    return html`
      <div
        class="rating-item ${state === 'filled'
          ? 'item-filled'
          : state === 'half'
            ? 'item-half'
            : 'item-empty'} ${isDisabled ? 'disabled' : ''}"
        @click=${(/** @type {MouseEvent} */ e) => this.handleClick(index, e)}
      >
        ${state === 'filled' ? filledCircle : state === 'half' ? filledCircle : emptyCircle}
      </div>
    `;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="rating-wrapper size-${this.size}">
        <svg width="0" height="0">
          <defs>
            <linearGradient id="half-fill-circle" x1="0" x2="1" y1="0" y2="0">
              <stop offset="50%" stop-color="var(--atmos-primary, #a6c8e1)" />
              <stop offset="50%" stop-color="transparent" />
            </linearGradient>
          </defs>
        </svg>
        <div
          class="rating-items"
          role="slider"
          tabindex=${this.disabled || this.readonly ? '-1' : '0'}
          aria-valuemin="0"
          aria-valuemax=${this.max}
          aria-valuenow=${this.value}
          aria-valuetext=${`${this.value} of ${this.max}`}
          aria-disabled=${this.disabled ? 'true' : 'false'}
          aria-readonly=${this.readonly ? 'true' : 'false'}
          @keydown=${this.handleKeyDown}
        >
          ${Array.from({ length: this.max }, (_, i) => this.renderItem(i))}
        </div>
        <span class="value-display"
          >${this.value.toFixed(this.precision === 0.5 ? 1 : 0)}/${this.max}</span
        >
      </div>
    `;
  }
}

customElements.define('thx-rating', ThxRating);
