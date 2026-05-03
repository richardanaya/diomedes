// @ts-check

/**
 * @fileoverview THX 1138 styled toggle switch component
 * @module thx-switch
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} SwitchProps
 * @property {boolean} checked - Whether the switch is checked/on
 * @property {boolean} disabled - Whether the switch is disabled
 * @property {string} value - The value when checked
 * @property {string} name - The switch name
 * @property {string} size - The switch size (sm, md, lg)
 * @property {string} onLabel - Label for ON state
 * @property {string} offLabel - Label for OFF state
 */

/**
 * THX 1138 styled toggle switch component
 * @extends {LitElement}
 */
export class ThxSwitch extends LitElement {
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

    .switch-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--size-2);
    }

    .switch-track {
      position: relative;
      background: var(--neutral-600, #666);
      cursor: pointer;
      transition: all var(--duration-moderate-1);
    }

    .switch-track.checked {
      background: var(--atmos-primary, #a6c8e1);
    }

    /* Sizes */
    .size-sm .switch-track {
      width: var(--size-7);
      height: var(--size-3);
    }

    .size-md .switch-track {
      width: 44px;
      height: var(--size-5);
    }

    .size-lg .switch-track {
      width: 56px;
      height: 30px;
    }

    .switch-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      background: white;
      transition: transform var(--duration-moderate-1);
    }

    .size-sm .switch-thumb {
      width: var(--size-3);
      height: var(--size-3);
    }

    .size-md .switch-thumb {
      width: var(--size-4);
      height: var(--size-4);
    }

    .size-lg .switch-thumb {
      width: 26px;
      height: 26px;
    }

    .size-sm .switch-track.checked .switch-thumb {
      transform: translateX(14px);
    }

    .size-md .switch-track.checked .switch-thumb {
      transform: translateX(20px);
    }

    .size-lg .switch-track.checked .switch-thumb {
      transform: translateX(26px);
    }

    .switch-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .switch-track:focus-within {
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.5);
    }

    .switch-label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: var(--neutral-800, #333);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      user-select: none;
    }

    .state-label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      min-width: 30px;
    }
  `;

  static properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    value: { type: String },
    name: { type: String },
    size: { type: String },
    onLabel: { type: String },
    offLabel: { type: String },
  };

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    /** @type {boolean} */
    this.checked = false;
    this._defaultChecked = this.checked;
    /** @type {boolean} */
    this.disabled = false;
    /** @type {string} */
    this.value = 'on';
    /** @type {string} */
    this.name = '';
    /** @type {string} */
    this.size = 'md';
    /** @type {string} */
    this.onLabel = 'ON';
    /** @type {string} */
    this.offLabel = 'OFF';
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
  }

  /**
   * @returns {void}
   */
  toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
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
    const stateLabel = this.checked ? this.onLabel : this.offLabel;

    return html`
      <div class="switch-wrapper size-${this.size}">
        <slot name="label"></slot>
        <div
          class="switch-track ${this.checked ? 'checked' : ''}"
          @click=${this.handleClick}
          @keydown=${this.handleKeyDown}
          tabindex=${this.disabled ? '-1' : '0'}
          role="switch"
          aria-checked=${this.checked}
        >
          <input
            class="switch-input"
            type="checkbox"
            .checked=${this.checked}
            ?disabled=${this.disabled}
            .value=${this.value}
            .name=${this.name}
            @change=${(/** @type {Event} */ e) => {
              e.stopPropagation();
              this.toggle();
            }}
          />
          <span class="switch-thumb"></span>
        </div>
        <span class="state-label">${stateLabel}</span>
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('thx-switch', ThxSwitch);
