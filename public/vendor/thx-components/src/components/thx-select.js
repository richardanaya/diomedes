// @ts-check

/**
 * @fileoverview THX 1138 styled select dropdown component
 * @module thx-select
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} SelectProps
 * @property {string} value - The selected value
 * @property {string} placeholder - The placeholder text
 * @property {string} label - The select label
 * @property {boolean} disabled - Whether the select is disabled
 * @property {boolean} required - Whether the select is required
 * @property {boolean} open - Whether the dropdown is open
 */

/**
 * @typedef {Object} OptionData
 * @property {string} value
 * @property {string} label
 * @property {boolean} disabled
 */

/**
 * THX 1138 styled select component
 * @extends {LitElement}
 */
export class ThxSelect extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .select-wrapper {
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

    .select-trigger {
      height: calc(var(--size-7) + var(--size-2));
      padding: 0 calc(var(--size-7) + var(--size-2)) 0 calc(var(--size-2) + var(--size-1));
      border: none;
      border-bottom: var(--border-size-2) solid var(--neutral-200, #e0e0e0);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-1);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      background: white;
      color: var(--neutral-800, #333);
      cursor: pointer;
      display: flex;
      align-items: center;
      position: relative;
      transition:
        border-color var(--duration-moderate-1),
        box-shadow var(--duration-moderate-1);
      width: 100%;
      box-sizing: border-box;
    }

    .select-trigger:hover {
      border-color: var(--neutral-600, #666);
    }

    .select-trigger:focus {
      outline: none;
      border-color: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.3);
    }

    .select-trigger.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--neutral-200, #e0e0e0);
    }

    .select-trigger.open {
      border-color: var(--atmos-primary, #a6c8e1);
    }

    .placeholder {
      color: var(--neutral-600, #666);
    }

    .selected-value {
      color: var(--neutral-800, #333);
    }

    .arrow {
      position: absolute;
      right: calc(var(--size-2) + var(--size-1));
      top: 50%;
      transform: translateY(-50%);
      width: calc(var(--size-2) + var(--size-1));
      height: calc(var(--size-2) + var(--size-1));
      transition: transform var(--duration-moderate-1);
      pointer-events: none;
    }

    .arrow.open {
      transform: translateY(-50%) rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: var(--border-size-1) solid var(--neutral-200, #e0e0e0);
      border-top: none;
      box-shadow: 0 var(--size-1) var(--size-2) rgba(0, 0, 0, 0.1);
      z-index: var(--layer-5);
      max-height: 200px;
      overflow-y: auto;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .option {
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      color: var(--neutral-800, #333);
      cursor: pointer;
      transition: background var(--duration-quick-2);
    }

    .option:hover:not(.disabled) {
      background: var(--neutral-200, #e0e0e0);
    }

    .option.selected {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
    }

    .option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .no-options {
      padding: calc(var(--size-2) + var(--size-1));
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      text-transform: uppercase;
      text-align: center;
    }
  `;

  static properties = {
    value: { type: String },
    placeholder: { type: String },
    label: { type: String },
    name: { type: String },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean },
    open: { type: Boolean, reflect: true },
    _options: { type: Array, state: true },
    _activeIndex: { type: Number, state: true },
  };

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    /** @type {string} */
    this.value = '';
    this._defaultValue = this.value;
    /** @type {string} */
    this.placeholder = 'SELECT...';
    /** @type {string} */
    this.label = '';
    /** @type {string} */
    this.name = '';
    /** @type {boolean} */
    this.disabled = false;
    /** @type {boolean} */
    this.required = false;
    /** @type {boolean} */
    this.open = false;
    /** @type {OptionData[]} */
    this._options = [];
    /** @type {number} */
    this._activeIndex = -1;
    this._baseId = `thx-select-${Math.random().toString(36).slice(2)}`;
  }

  /** @param {import('lit').PropertyValues} changedProperties */
  updated(changedProperties) {
    if (changedProperties.has('value') || changedProperties.has('disabled')) {
      this._updateFormValue();
    }
  }

  /**
   * @returns {void}
   */
  connectedCallback() {
    super.connectedCallback();
    this._syncOptions();
  }

  /**
   * @returns {void}
   */
  firstUpdated() {
    this._defaultValue = this.value;
    this._syncOptions();
    this._updateActiveIndex();
    this._updateFormValue();
  }

  /** @returns {void} */
  _updateFormValue() {
    this._internals?.setFormValue(this.disabled ? null : this.value);
  }

  /** @returns {void} */
  formResetCallback() {
    this.value = this._defaultValue;
    this._updateActiveIndex();
  }

  /**
   * @returns {OptionData[]}
   */
  get options() {
    return this._options;
  }

  /**
   * @returns {void}
   */
  _syncOptions() {
    const elements = Array.from(this.querySelectorAll(':scope > thx-option'));
    this._options = elements.map(el => ({
      value: el.getAttribute('value') || '',
      label: el.getAttribute('label') || el.textContent?.trim() || '',
      disabled: el.hasAttribute('disabled'),
    }));
    this._updateActiveIndex();
  }

  /** @returns {number} */
  _firstEnabledIndex() {
    return this.options.findIndex(option => !option.disabled);
  }

  /** @returns {void} */
  _updateActiveIndex() {
    const selectedIndex = this.options.findIndex(option => option.value === this.value);
    this._activeIndex = selectedIndex >= 0 ? selectedIndex : this._firstEnabledIndex();
  }

  /** @returns {void} */
  _open() {
    if (this.disabled) return;
    this.open = true;
    this._updateActiveIndex();
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  _optionId(value) {
    return `${this._baseId}-option-${value.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  /**
   * @returns {string}
   */
  get selectedLabel() {
    const option = this.options.find(opt => opt.value === this.value);
    return option?.label || '';
  }

  /**
   * @returns {void}
   */
  toggle() {
    if (this.disabled) return;
    if (this.open) this.close();
    else this._open();
  }

  /**
   * @returns {void}
   */
  close() {
    this.open = false;
  }

  /**
   * @param {string} value
   * @returns {void}
   */
  select(value) {
    const option = this.options.find(opt => opt.value === value);
    if (option?.disabled) return;

    this.value = value;
    this._updateActiveIndex();
    this._updateFormValue();
    this.open = false;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @param {FocusEvent} _event
   * @returns {void}
   */
  handleBlur(_event) {
    // Delay to allow click events on dropdown to process
    setTimeout(() => {
      this.close();
    }, 150);
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  handleKeyDown(event) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open && this.options[this._activeIndex]) {
          this.select(this.options[this._activeIndex].value);
        } else {
          this._open();
        }
        break;
      case 'Escape':
        this.close();
        break;
      case 'Tab':
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open) {
          this._open();
        } else {
          this.navigateOption(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open) {
          this._open();
        } else {
          this.navigateOption(-1);
        }
        break;
      case 'Home':
        event.preventDefault();
        this._open();
        this._activeIndex = this._firstEnabledIndex();
        break;
      case 'End':
        event.preventDefault();
        this._open();
        for (let i = this.options.length - 1; i >= 0; i--) {
          if (!this.options[i].disabled) {
            this._activeIndex = i;
            break;
          }
        }
        break;
    }
  }

  /**
   * @param {number} direction
   * @returns {void}
   */
  navigateOption(direction) {
    if (this.options.length === 0) return;

    let index = this._activeIndex;
    for (let i = 0; i < this.options.length; i++) {
      index = (index + direction + this.options.length) % this.options.length;
      if (!this.options[index].disabled) {
        this._activeIndex = index;
        break;
      }
    }
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const hasValue = this.value !== '';
    const displayValue = hasValue ? this.selectedLabel : this.placeholder;
    const listboxId = `${this._baseId}-listbox`;
    const labelId = `${this._baseId}-label`;
    const activeOption = this.options[this._activeIndex];

    return html`
      <div class="select-wrapper">
        ${this.label
          ? html`
              <label class="label" id=${labelId}>
                ${this.label}${this.required
                  ? html`<span class="required-indicator">*</span>`
                  : null}
              </label>
            `
          : null}
        <div
          class="select-trigger ${this.disabled ? 'disabled' : ''} ${this.open ? 'open' : ''}"
          tabindex=${this.disabled ? '-1' : '0'}
          @click=${this.toggle}
          @blur=${this.handleBlur}
          @keydown=${this.handleKeyDown}
          role="combobox"
          aria-expanded=${this.open}
          aria-haspopup="listbox"
          aria-controls=${listboxId}
          aria-labelledby=${this.label ? labelId : undefined}
          aria-activedescendant=${this.open && activeOption
            ? this._optionId(activeOption.value)
            : undefined}
          aria-required=${this.required ? 'true' : 'false'}
          aria-disabled=${this.disabled ? 'true' : 'false'}
        >
          <span class=${hasValue ? 'selected-value' : 'placeholder'}>${displayValue}</span>
          <svg class="arrow ${this.open ? 'open' : ''}" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>
        <div class="dropdown ${this.open ? 'open' : ''}" id=${listboxId} role="listbox">
          ${this.options.length === 0
            ? html`<div class="no-options">NO OPTIONS</div>`
            : this.options.map(
                option => html`
                  <div
                    class="option ${option.value === this.value ? 'selected' : ''} ${option.disabled
                      ? 'disabled'
                      : ''}"
                    role="option"
                    id=${this._optionId(option.value)}
                    aria-selected=${option.value === this.value}
                    aria-disabled=${option.disabled ? 'true' : 'false'}
                    @click=${() => this.select(option.value)}
                  >
                    ${option.label}
                  </div>
                `
              )}
        </div>
        <slot style="display: none;" @slotchange=${this._syncOptions}></slot>
      </div>
    `;
  }
}

customElements.define('thx-select', ThxSelect);
