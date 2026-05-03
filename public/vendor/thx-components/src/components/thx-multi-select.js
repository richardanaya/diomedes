// @ts-check

/**
 * @fileoverview THX 1138 styled multi-select component
 * @module thx-multi-select
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} MultiSelectOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} disabled
 * @property {boolean} selected
 */

/**
 * THX 1138 styled multi-select component
 * Allows selecting multiple options with checkboxes
 * @extends {LitElement}
 */
export class ThxMultiSelect extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .multi-select-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1);
    }

    .label {
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-600, #666);
    }

    .required-indicator {
      color: var(--accent-error, #d44000);
      margin-left: var(--size-1);
    }

    .trigger {
      height: calc(var(--size-7) + var(--size-2));
      padding: 0 calc(var(--size-7) + var(--size-2)) 0 calc(var(--size-2) + var(--size-1));
      border: none;
      border-bottom: var(--border-size-2) solid #ccc;
      font-family: inherit;
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

    .trigger:hover {
      border-color: #666;
    }

    .trigger:focus {
      outline: none;
      border-color: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.3);
    }

    .trigger.open {
      border-color: var(--atmos-primary, #a6c8e1);
    }

    .trigger.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--neutral-200, #e0e0e0);
    }

    .placeholder {
      color: #aaa;
    }

    .selected-text {
      color: var(--neutral-800, #333);
    }

    .arrow {
      position: absolute;
      right: calc(var(--size-2) + var(--size-1));
      top: 50%;
      transform: translateY(-50%);
      width: var(--size-3);
      height: var(--size-3);
      transition: transform var(--duration-moderate-1);
      color: var(--neutral-600, #666);
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
      border: var(--border-size-1) solid var(--atmos-primary, #a6c8e1);
      border-top: none;
      box-shadow: 0 var(--size-1) calc(var(--size-2) + var(--size-1)) rgba(0, 0, 0, 0.15);
      z-index: var(--layer-5);
      max-height: 250px;
      overflow-y: auto;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .option {
      display: flex;
      align-items: center;
      gap: calc(var(--size-2) + var(--size-1));
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      color: var(--neutral-800, #333);
      cursor: pointer;
      transition: all var(--duration-quick-2);
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.04);
    }

    .option:last-child {
      border-bottom: none;
    }

    .option:hover {
      background: rgba(166, 200, 225, 0.08);
    }

    .option.selected {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
    }

    .option.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .checkbox {
      width: var(--size-3);
      height: var(--size-3);
      border: var(--border-size-2) solid #999;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .option.selected .checkbox {
      border-color: #444;
      background: #444;
    }

    .checkbox::after {
      content: '';
      width: var(--size-1);
      height: var(--size-2);
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg) translate(-1px, -1px);
      display: none;
    }

    .option.selected .checkbox::after {
      display: block;
    }

    .no-options {
      padding: var(--size-3);
      text-align: center;
      color: var(--neutral-600, #666);
      font-size: var(--font-size-0);
    }

    .select-container {
      position: relative;
    }

    .badge-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--size-4);
      height: var(--size-4);
      padding: 0 var(--size-1);
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
      font-size: var(--font-size-0);
      font-weight: var(--font-weight-6);
      margin-left: var(--size-2);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      label: { type: String },
      name: { type: String },
      placeholder: { type: String },
      disabled: { type: Boolean, reflect: true },
      required: { type: Boolean },
      open: { type: Boolean, reflect: true },
      value: { type: Array },
      _options: { type: Array, state: true },
      _activeIndex: { type: Number, state: true },
    };
  }

  constructor() {
    super();
    this._internals = this.attachInternals?.();
    /** @type {string} */
    this.label = '';
    /** @type {string} */
    this.name = '';
    /** @type {string} */
    this.placeholder = 'SELECT...';
    /** @type {boolean} */
    this.disabled = false;
    /** @type {boolean} */
    this.required = false;
    /** @type {boolean} */
    this.open = false;
    /** @type {string[]} */
    this.value = /** @type {string[]} */ ([]);
    this._defaultValue = [...this.value];
    /** @type {Element[]} */
    this._options = [];
    /** @type {number} */
    this._activeIndex = -1;
    this._baseId = `thx-multi-select-${Math.random().toString(36).slice(2)}`;
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
    this._defaultValue = [...this.value];
    this._syncOptions();
    this._updateActiveIndex();
    this._updateFormValue();
  }

  /** @returns {void} */
  _updateFormValue() {
    if (this.disabled) {
      this._internals?.setFormValue(null);
      return;
    }

    if (!this.name || this.value.length <= 1) {
      this._internals?.setFormValue(this.value[0] || '');
      return;
    }

    const formData = new FormData();
    this.value.forEach(value => formData.append(this.name, value));
    this._internals?.setFormValue(formData);
  }

  /** @returns {void} */
  formResetCallback() {
    this.value = [...this._defaultValue];
    this._updateActiveIndex();
  }

  /**
   * @returns {Element[]}
   */
  get options() {
    return this._options;
  }

  /**
   * @returns {void}
   */
  _syncOptions() {
    this._options = Array.from(this.querySelectorAll(':scope > thx-option'));
    this._updateActiveIndex();
  }

  /** @returns {number} */
  _firstEnabledIndex() {
    return this.optionData.findIndex(option => !option.disabled);
  }

  /** @returns {void} */
  _updateActiveIndex() {
    const selectedIndex = this.optionData.findIndex(option => option.selected && !option.disabled);
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
   * @returns {MultiSelectOption[]}
   */
  get optionData() {
    return this.options.map(el => ({
      value: el.getAttribute('value') || '',
      label: el.getAttribute('label') || el.textContent?.trim() || '',
      disabled: el.hasAttribute('disabled'),
      selected: this.value.includes(el.getAttribute('value') || ''),
    }));
  }

  /**
   * @returns {string}
   */
  get displayValue() {
    const selected = this.optionData.filter(opt => opt.selected);
    if (selected.length === 0) {
      return this.placeholder;
    }
    if (selected.length === 1) {
      return selected[0].label;
    }
    return `${selected[0].label} +${selected.length - 1}`;
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
  toggleOption(value) {
    const index = this.value.indexOf(value);
    if (index > -1) {
      this.value = this.value.filter(v => v !== value);
    } else {
      this.value = [...this.value, value];
    }
    this._updateActiveIndex();
    this._updateFormValue();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @param {MouseEvent} e
   * @returns {void}
   */
  handleOptionClick(e) {
    const target = /** @type {Element} */ (e.currentTarget);
    const value = target.getAttribute('data-value') || '';
    this.toggleOption(value);
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
        if (this.open && this.optionData[this._activeIndex]) {
          this.toggleOption(this.optionData[this._activeIndex].value);
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
        if (!this.open) this._open();
        else this.navigateOption(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open) this._open();
        else this.navigateOption(-1);
        break;
      case 'Home':
        event.preventDefault();
        this._open();
        this._activeIndex = this._firstEnabledIndex();
        break;
      case 'End':
        event.preventDefault();
        this._open();
        for (let i = this.optionData.length - 1; i >= 0; i--) {
          if (!this.optionData[i].disabled) {
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
    const options = this.optionData;
    if (options.length === 0) return;

    let index = this._activeIndex;
    for (let i = 0; i < options.length; i++) {
      index = (index + direction + options.length) % options.length;
      if (!options[index].disabled) {
        this._activeIndex = index;
        break;
      }
    }
  }

  /**
   * @param {FocusEvent} e
   * @returns {void}
   */
  handleBlur(e) {
    const relatedTarget = /** @type {Node|null} */ (e.relatedTarget);
    if (relatedTarget && !this.contains(relatedTarget)) {
      this.close();
    }
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const hasValue = this.value.length > 0;
    const selectedCount = this.value.length;
    const listboxId = `${this._baseId}-listbox`;
    const labelId = `${this._baseId}-label`;
    const activeOption = this.optionData[this._activeIndex];

    return html`
      <div class="multi-select-wrapper">
        ${this.label
          ? html`
              <label class="label" id=${labelId}>
                ${this.label}${this.required
                  ? html`<span class="required-indicator">*</span>`
                  : null}
              </label>
            `
          : null}
        <div class="select-container">
          <div
            class="trigger ${this.disabled ? 'disabled' : ''} ${this.open ? 'open' : ''}"
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
            <span class=${hasValue ? 'selected-text' : 'placeholder'}> ${this.displayValue} </span>
            ${selectedCount > 0 ? html`<span class="badge-count">${selectedCount}</span>` : ''}
            <svg class="arrow ${this.open ? 'open' : ''}" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
          <div
            class="dropdown ${this.open ? 'open' : ''}"
            id=${listboxId}
            role="listbox"
            aria-multiselectable="true"
          >
            ${this.options.length === 0
              ? html`<div class="no-options">NO OPTIONS</div>`
              : this.optionData.map(
                  option => html`
                    <div
                      class="option ${option.selected ? 'selected' : ''} ${option.disabled
                        ? 'disabled'
                        : ''}"
                      role="option"
                      id=${this._optionId(option.value)}
                      aria-selected=${option.selected}
                      aria-disabled=${option.disabled ? 'true' : 'false'}
                      data-value=${option.value}
                      @click=${option.disabled ? null : this.handleOptionClick}
                    >
                      <span class="checkbox"></span>
                      <span>${option.label}</span>
                    </div>
                  `
                )}
          </div>
        </div>
        <slot style="display: none;" @slotchange=${this._syncOptions}></slot>
      </div>
    `;
  }
}

customElements.define('thx-multi-select', ThxMultiSelect);
