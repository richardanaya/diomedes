// @ts-check

/**
 * @fileoverview THX 1138 styled checkbox component
 * @module thx-checkbox
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} CheckboxProps
 * @property {boolean} checked - Whether the checkbox is checked
 * @property {boolean} indeterminate - Whether the checkbox is in indeterminate state
 * @property {boolean} disabled - Whether the checkbox is disabled
 * @property {string} value - The checkbox value
 * @property {string} name - The checkbox name
 */

/**
 * THX 1138 styled checkbox component
 * @extends {LitElement}
 */
export class ThxCheckbox extends LitElement {
  static formAssociated = true;

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

    .checkbox-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--size-2);
    }

    .checkbox {
      appearance: none;
      width: var(--size-3);
      height: var(--size-3);
      border: var(--border-size-2) solid var(--neutral-600, #666);
      background: white;
      cursor: pointer;
      transition: all var(--duration-quick-2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      position: relative;
    }

    .checkbox:hover {
      border-color: var(--neutral-600, #666);
    }

    .checkbox:checked {
      border-color: var(--neutral-800, #333);
      background: var(--neutral-800, #333);
    }

    .checkbox:indeterminate {
      border-color: var(--neutral-800, #333);
      background: var(--neutral-800, #333);
    }

    .check-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: var(--size-3);
      height: var(--size-3);
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--duration-quick-2);
    }

    .checkbox:checked ~ .check-icon,
    .checkbox:indeterminate ~ .check-icon.indeterminate {
      opacity: 1;
    }

    .check-icon svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .check-icon path {
      fill: none;
      stroke: white;
      stroke-width: 2;
      stroke-linecap: square;
    }

    .checkbox:focus {
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
    indeterminate: { type: Boolean },
    disabled: { type: Boolean, reflect: true },
    value: { type: String },
    name: { type: String },
  };

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    /** @type {boolean} */
    this.checked = false;
    this._defaultChecked = this.checked;
    /** @type {boolean} */
    this.indeterminate = false;
    /** @type {boolean} */
    this.disabled = false;
    /** @type {string} */
    this.value = 'on';
    /** @type {string} */
    this.name = '';
  }

  /** @param {Map<string, unknown>} changedProperties */
  updated(changedProperties) {
    if (
      changedProperties.has('checked') ||
      changedProperties.has('disabled') ||
      changedProperties.has('value')
    ) {
      this._updateFormValue();
    }
  }

  /** @returns {void} */
  firstUpdated() {
    this._defaultChecked = this.checked;
    this._updateFormValue();
  }

  /** @returns {void} */
  _updateFormValue() {
    this._internals?.setFormValue(this.checked && !this.disabled ? this.value : null);
  }

  /** @returns {void} */
  formResetCallback() {
    this.checked = this._defaultChecked;
    this.indeterminate = false;
  }

  /**
   * @returns {void}
   */
  toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.indeterminate = false;
    this._updateFormValue();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @param {MouseEvent} _event
   * @returns {void}
   */
  handleClick(_event) {
    this.toggle();
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  handleKeyDown(event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div
        class="checkbox-wrapper"
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        tabindex=${this.disabled ? '-1' : '0'}
        role="checkbox"
        aria-checked=${this.indeterminate ? 'mixed' : this.checked}
        aria-disabled=${this.disabled}
      >
        <input
          class="checkbox"
          type="checkbox"
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.disabled}
          .value=${this.value}
          .name=${this.name}
          tabindex="-1"
          @click=${(/** @type {MouseEvent} */ e) => e.stopPropagation()}
          @change=${(/** @type {Event} */ e) => {
            e.stopPropagation();
            const target = /** @type {HTMLInputElement} */ (e.target);
            this.checked = target.checked;
            this._updateFormValue();
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          }}
        />
        <span class="check-icon">
          <svg viewBox="0 0 14 14">
            <path d="M3 3 L11 11 M11 3 L3 11" />
          </svg>
        </span>
        <span class="check-icon indeterminate">
          <svg viewBox="0 0 14 14">
            <path d="M2 7 L12 7" />
          </svg>
        </span>
        <span class="label"><slot></slot></span>
      </div>
    `;
  }
}

customElements.define('thx-checkbox', ThxCheckbox);
