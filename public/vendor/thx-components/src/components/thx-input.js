// @ts-check

/**
 * @fileoverview THX 1138 styled input component
 * @module thx-input
 */

import { LitElement, html, css } from '../../vendor/lit.js';

let inputIdCounter = 0;

/**
 * @typedef {Object} InputProps
 * @property {string} type - The input type
 * @property {string} value - The input value
 * @property {string} placeholder - The placeholder text
 * @property {string} label - The input label
 * @property {boolean} disabled - Whether the input is disabled
 * @property {boolean} readonly - Whether the input is readonly
 * @property {boolean} required - Whether the input is required
 * @property {string} name - The input name
 * @property {string} autocomplete - Autocomplete attribute
 * @property {number} minlength - Minimum length
 * @property {number} maxlength - Maximum length
 * @property {string} pattern - Pattern for validation
 */

/**
 * THX 1138 styled input component
 * @extends {LitElement}
 */
export class ThxInput extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: block;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1);
    }

    .label {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-600, #666);
    }

    .required-indicator {
      color: var(--accent-error, #d44000);
      margin-left: var(--size-1);
    }

    input {
      height: calc(var(--size-7) + var(--size-2));
      padding: 0 calc(var(--size-2) + var(--size-1));
      border: none;
      border-bottom: var(--border-size-2) solid var(--neutral-200, #e0e0e0);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-1);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      background: white;
      color: var(--neutral-800, #333);
      transition:
        border-color var(--duration-moderate-1),
        box-shadow var(--duration-moderate-1);
      width: 100%;
      box-sizing: border-box;
    }

    input::placeholder {
      color: var(--neutral-600, #666);
    }

    input:focus {
      outline: none;
      border-color: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.3);
    }

    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--neutral-200, #e0e0e0);
    }

    input:read-only {
      background: var(--neutral-200, #e0e0e0);
    }

    .input-status {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      color: var(--neutral-600, #666);
      min-height: var(--size-3);
    }

    .input-status.error {
      color: var(--accent-error, #d44000);
    }

    .input-container {
      position: relative;
    }

    .prefix,
    .suffix {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-1);
      color: var(--neutral-600, #666);
      pointer-events: none;
    }

    .prefix {
      left: calc(var(--size-2) + var(--size-1));
    }

    .suffix {
      right: calc(var(--size-2) + var(--size-1));
    }

    .has-prefix input {
      padding-left: var(--size-7);
    }

    .has-suffix input,
    .has-password-toggle input {
      padding-right: var(--size-7);
    }

    .password-toggle {
      position: absolute;
      top: 50%;
      right: var(--size-2);
      transform: translateY(-50%);
      width: var(--size-5);
      height: var(--size-5);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-1);
      color: var(--neutral-600, #666);
      transition: color var(--duration-quick-2);
      padding: 0;
    }

    .password-toggle:hover {
      color: var(--atmos-primary, #a6c8e1);
    }

    .password-toggle:focus {
      outline: none;
      color: var(--atmos-primary, #a6c8e1);
    }
  `;

  static properties = {
    type: { type: String },
    value: { type: String },
    placeholder: { type: String },
    label: { type: String },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    required: { type: Boolean },
    name: { type: String },
    autocomplete: { type: String },
    minlength: { type: Number },
    maxlength: { type: Number },
    pattern: { type: String },
    errorMessage: { type: String },
    /** Whether password is visible (for password type only) */
    passwordVisible: { type: Boolean, state: true },
    /** Whether the help-text slot currently has content */
    _hasHelpText: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    this._inputId = `thx-input-${++inputIdCounter}`;
    this._labelId = `${this._inputId}-label`;
    this._helpId = `${this._inputId}-help`;
    this._errorId = `${this._inputId}-error`;
    /** @type {string} */
    this.type = 'text';
    /** @type {string} */
    this.value = '';
    this._defaultValue = this.value;
    /** @type {string} */
    this.placeholder = '';
    /** @type {string} */
    this.label = '';
    /** @type {boolean} */
    this.disabled = false;
    /** @type {boolean} */
    this.readonly = false;
    /** @type {boolean} */
    this.required = false;
    /** @type {string} */
    this.name = '';
    /** @type {string} */
    this.autocomplete = 'off';
    /** @type {number} */
    this.minlength = -1;
    /** @type {number} */
    this.maxlength = -1;
    /** @type {string} */
    this.pattern = '';
    /** @type {string} */
    this.errorMessage = '';
    /** @type {boolean} */
    this.passwordVisible = false;
    /** @type {boolean} Internal: tracks whether help-text slot has nodes */
    this._hasHelpText = false;
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
    this._internals?.setFormValue(this.disabled ? null : this.value);
  }

  /** @returns {void} */
  formResetCallback() {
    this.value = this._defaultValue;
  }

  /** @returns {string|undefined} */
  get describedBy() {
    if (this.errorMessage) return this._errorId;
    if (this._hasHelpText) return this._helpId;
    return undefined;
  }

  /**
   * Slot change handler for the help-text slot. Keeps the status row
   * out of the layout when no help text is provided, so the input
   * lines up with siblings (like thx-select) that don't reserve a
   * status row.
   * @param {Event} e
   * @returns {void}
   * @private
   */
  _onHelpSlotChange(e) {
    const slot = /** @type {HTMLSlotElement} */ (e.target);
    this._hasHelpText = slot.assignedNodes({ flatten: true }).length > 0;
  }

  /**
   * Toggle password visibility
   * @returns {void}
   */
  togglePasswordVisibility() {
    if (this.type === 'password') {
      this.passwordVisible = !this.passwordVisible;
      this.requestUpdate();
    }
  }

  /**
   * @returns {HTMLInputElement|null}
   */
  get inputElement() {
    return /** @type {HTMLInputElement|null} */ (this.renderRoot?.querySelector('input'));
  }

  /**
   * @param {InputEvent} event
   * @returns {void}
   */
  handleInput(event) {
    event.stopPropagation();
    const target = /** @type {HTMLInputElement} */ (event.target);
    this.value = target.value;
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
    this.value = target.value;
    this._updateFormValue();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @returns {void}
   */
  focus() {
    this.inputElement?.focus();
  }

  /**
   * @returns {void}
   */
  blur() {
    this.inputElement?.blur();
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const hasPrefix = this.querySelector('[slot="prefix"]');
    const hasSuffix = this.querySelector('[slot="suffix"]');
    const isPassword = this.type === 'password';
    const effectiveType = isPassword && this.passwordVisible ? 'text' : this.type;

    return html`
      <div class="input-wrapper">
        ${this.label
          ? html`
              <label class="label" id=${this._labelId} for=${this._inputId}>
                ${this.label}${this.required
                  ? html`<span class="required-indicator">*</span>`
                  : null}
              </label>
            `
          : null}
        <div
          class="input-container ${hasPrefix ? 'has-prefix' : ''} ${hasSuffix
            ? 'has-suffix'
            : ''} ${isPassword ? 'has-password-toggle' : ''}"
        >
          <slot name="prefix"></slot>
          <input
            id=${this._inputId}
            .type=${effectiveType}
            .value=${this.value}
            .placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            .name=${this.name}
            .autocomplete=${this.autocomplete}
            minlength=${this.minlength >= 0 ? this.minlength : undefined}
            maxlength=${this.maxlength >= 0 ? this.maxlength : undefined}
            .pattern=${this.pattern || undefined}
            aria-describedby=${this.describedBy}
            aria-invalid=${this.errorMessage ? 'true' : 'false'}
            aria-required=${this.required ? 'true' : 'false'}
            @input=${this.handleInput}
            @change=${this.handleChange}
          />
          ${isPassword
            ? html`
                <button
                  type="button"
                  class="password-toggle"
                  @click=${this.togglePasswordVisibility}
                  aria-label="${this.passwordVisible ? 'Hide password' : 'Show password'}"
                  aria-pressed=${this.passwordVisible ? 'true' : 'false'}
                >
                  ${this.passwordVisible ? '◉' : '◎'}
                </button>
              `
            : ''}
          <slot name="suffix"></slot>
        </div>
        ${this.errorMessage
          ? html`<div class="input-status error" id=${this._errorId}>${this.errorMessage}</div>`
          : this._hasHelpText
            ? html`<div class="input-status" id=${this._helpId}>
                <slot name="help-text" @slotchange=${this._onHelpSlotChange}></slot>
              </div>`
            : html`<slot name="help-text" hidden @slotchange=${this._onHelpSlotChange}></slot>`}
      </div>
    `;
  }
}

customElements.define('thx-input', ThxInput);
