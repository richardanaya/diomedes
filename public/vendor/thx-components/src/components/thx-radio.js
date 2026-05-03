// @ts-check

/**
 * @fileoverview THX 1138 styled radio button component
 * @module thx-radio
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} RadioProps
 * @property {boolean} checked - Whether the radio is checked
 * @property {boolean} disabled - Whether the radio is disabled
 * @property {string} value - The radio value
 * @property {string} name - The radio name (group)
 */

/**
 * THX 1138 styled radio button component
 * @extends {LitElement}
 */
export class ThxRadio extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
    }

    :host([disabled]) {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .radio-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--size-2);
    }

    input[type='radio'] {
      appearance: none;
      width: var(--size-3);
      height: var(--size-3);
      border: var(--border-size-2) solid var(--neutral-600, #666);
      border-radius: var(--radius-round);
      background: white;
      cursor: pointer;
      transition: all var(--duration-quick-2);
      margin: 0;
      position: relative;
    }

    input[type='radio']:hover {
      border-color: var(--neutral-600, #666);
    }

    input[type='radio']:checked {
      border-color: var(--neutral-800, #333);
    }

    input[type='radio']:checked::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: var(--size-2);
      height: var(--size-2);
      background: var(--neutral-800, #333);
      border-radius: var(--radius-round);
    }

    input[type='radio']:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.5);
    }

    .label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: var(--neutral-800, #333);
      user-select: none;
    }

    :host([disabled]) .label {
      color: var(--neutral-600, #666);
    }
  `;

  static properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    value: { type: String },
    name: { type: String },
  };

  constructor() {
    super();
    /** @type {boolean} */
    this.checked = false;
    /** @type {boolean} */
    this.disabled = false;
    /** @type {string} */
    this.value = '';
    /** @type {string} */
    this.name = '';
  }

  /**
   * @returns {void}
   */
  select() {
    if (this.disabled || this.checked) return;
    this.checked = true;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @param {MouseEvent} _event
   * @returns {void}
   */
  handleClick(_event) {
    this.select();
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  handleKeyDown(event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.select();
    }
  }

  /**
   * @param {Event} event
   * @returns {void}
   */
  handleChange(event) {
    event.stopPropagation();
    const target = /** @type {HTMLInputElement} */ (event.target);
    if (target.checked) {
      this.select();
    }
  }

  /** @returns {void} */
  focus() {
    /** @type {HTMLElement|null} */ (this.renderRoot?.querySelector('.radio-wrapper'))?.focus();
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <label
        class="radio-wrapper"
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        tabindex=${this.disabled ? '-1' : '0'}
      >
        <input
          type="radio"
          .checked=${this.checked}
          ?disabled=${this.disabled}
          .value=${this.value}
          .name=${this.name}
          @click=${(/** @type {MouseEvent} */ e) => e.stopPropagation()}
          @change=${this.handleChange}
        />
        <span class="label"><slot></slot></span>
      </label>
    `;
  }
}

customElements.define('thx-radio', ThxRadio);
