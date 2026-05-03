// @ts-check

/**
 * @fileoverview THX 1138 styled dropdown menu component
 * @module thx-dropdown
 * @description A clinical dropdown with CRT-style presentation
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} DropdownItem
 * @property {string} value - The item value
 * @property {string} label - The display label
 * @property {boolean} [disabled] - Whether the item is disabled
 * @property {'default'|'warning'|'error'} [variant] - Item variant
 */

/**
 * @typedef {Object} DropdownState
 * @property {boolean} open - Whether the dropdown is open
 * @property {string} [value] - Currently selected value
 * @property {'bottom'|'top'|'left'|'right'} placement - Dropdown placement
 */

export class ThxDropdown extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    .dropdown-trigger {
      height: calc(var(--size-7) + var(--size-2));
      padding: 0 var(--size-3);
      background: var(--neutral-100, #fafafa);
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-800, #333);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: calc(var(--size-2) + var(--size-1));
      transition: all var(--duration-quick-2);
      white-space: nowrap;
    }

    .dropdown-trigger:hover {
      border-color: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.3);
    }

    .dropdown-trigger.open {
      background: #111;
      color: var(--atmos-primary, #a6c8e1);
      border-color: var(--atmos-primary, #a6c8e1);
    }

    .dropdown-trigger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dropdown-arrow {
      font-size: var(--font-size-00);
      transition: transform var(--duration-moderate-1);
      color: var(--atmos-secondary, #707e91);
    }

    .dropdown-trigger.open .dropdown-arrow {
      transform: rotate(180deg);
      color: var(--atmos-primary, #a6c8e1);
    }

    .dropdown-menu {
      position: absolute;
      min-width: 100%;
      background: var(--crt-bg, #111);
      border: var(--size-2) solid var(--crt-border, #2a2a2a);
      border-radius: var(--radius-1);
      box-shadow: 0 var(--size-1) var(--size-4) rgba(0, 0, 0, 0.5);
      z-index: var(--layer-4);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition:
        opacity var(--duration-quick-2),
        visibility var(--duration-quick-2),
        transform var(--duration-quick-2);
      max-height: 300px;
      overflow-y: auto;
    }

    .dropdown-menu.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    /* Placement variants */
    .dropdown-menu.bottom {
      top: 100%;
      left: 0;
      margin-top: var(--size-1);
    }

    .dropdown-menu.top {
      bottom: 100%;
      left: 0;
      margin-bottom: var(--size-1);
      transform: translateY(8px);
    }

    .dropdown-menu.top.open {
      transform: translateY(0);
    }

    .dropdown-menu.left {
      right: 100%;
      top: 0;
      margin-right: var(--size-1);
      transform: translateX(8px);
    }

    .dropdown-menu.left.open {
      transform: translateX(0);
    }

    .dropdown-menu.right {
      left: 100%;
      top: 0;
      margin-left: var(--size-1);
      transform: translateX(-8px);
    }

    .dropdown-menu.right.open {
      transform: translateX(0);
    }

    /* CRT scanline effect */
    .dropdown-menu::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(166, 200, 225, 0.04) 2px,
        rgba(166, 200, 225, 0.04) var(--size-1)
      );
      pointer-events: none;
      z-index: var(--layer-2);
    }

    .dropdown-header {
      padding: calc(var(--size-2) + var(--size-1)) var(--size-3);
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-00);
      color: var(--atmos-secondary, #707e91);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-5);
      border-bottom: var(--border-size-1) solid #333;
    }

    .dropdown-item {
      padding: calc(var(--size-2) + var(--size-1)) var(--size-3);
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-3);
      color: var(--atmos-primary, #a6c8e1);
      cursor: pointer;
      transition: all var(--duration-quick-2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: var(--layer-1);
    }

    .dropdown-item:hover {
      background: rgba(166, 200, 225, 0.1);
    }

    .dropdown-item.selected {
      background: rgba(166, 200, 225, 0.15);
      color: var(--atmos-tertiary, #deffff);
    }

    .dropdown-item.selected::before {
      content: '>';
      margin-right: var(--size-2);
      color: var(--atmos-primary, #a6c8e1);
    }

    .dropdown-item.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dropdown-item.warning {
      color: var(--accent-warning, #d4aa00);
    }

    .dropdown-item.warning:hover {
      background: rgba(212, 170, 0, 0.1);
    }

    .dropdown-item.error {
      color: var(--accent-error, #d44000);
    }

    .dropdown-item.error:hover {
      background: rgba(212, 64, 0, 0.1);
    }

    .dropdown-divider {
      height: 1px;
      background: #333;
      margin: var(--size-2) 0;
    }

    .dropdown-empty {
      padding: var(--size-3);
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-0);
      color: var(--atmos-secondary, #707e91);
      text-transform: uppercase;
      text-align: center;
    }
  `;

  static properties = {
    open: { type: Boolean, reflect: true },
    value: { type: String },
    placement: { type: String },
    label: { type: String },
    headerLabel: { type: String, attribute: 'header-label' },
    disabled: { type: Boolean },
    items: { type: Array },
  };

  constructor() {
    super();
    /** @type {boolean} */
    this.open = false;
    /** @type {string|undefined} */
    this.value = undefined;
    /** @type {'bottom'|'top'|'left'|'right'} */
    this.placement = 'bottom';
    /** @type {string} */
    this.label = 'SELECT...';
    /** @type {string} */
    this.headerLabel = 'OPTIONS';
    /** @type {boolean} */
    this.disabled = false;
    /** @type {DropdownItem[]} */
    this.items = [];

    /** @type {(e: MouseEvent) => void} */
    this._handleClickOutside = this._handleClickOutside.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleClickOutside);
  }

  /**
   * Opens the dropdown
   * @returns {void}
   */
  show() {
    if (!this.disabled) {
      this.open = true;
      this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
    }
  }

  /**
   * Closes the dropdown
   * @returns {void}
   */
  hide() {
    this.open = false;
    this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
  }

  /**
   * Toggles dropdown visibility
   * @returns {void}
   */
  toggle() {
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Selects an item by value
   * @param {string} value - The value to select
   * @returns {void}
   */
  select(value) {
    const item = this.items.find(i => i.value === value);
    if (item && !item.disabled) {
      this.value = value;
      this.dispatchEvent(
        new CustomEvent('select', {
          detail: { value, item },
          bubbles: true,
          composed: true,
        })
      );
      this.hide();
    }
  }

  /**
   * Handles click outside to close
   * @param {MouseEvent} e - Click event
   * @returns {void}
   */
  _handleClickOutside(e) {
    if (this.open && !this.contains(/** @type {Node} */ (e.target))) {
      this.hide();
    }
  }

  /**
   * Handles item click
   * @param {DropdownItem} item - The clicked item
   * @returns {void}
   */
  _handleItemClick(item) {
    if (!item.disabled) {
      this.select(item.value);
    }
  }

  /**
   * Gets the display label for the current value
   * @returns {string}
   */
  _getDisplayLabel() {
    if (this.value) {
      const item = this.items.find(i => i.value === this.value);
      return item?.label || this.value;
    }
    return this.label;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const displayLabel = this._getDisplayLabel();

    return html`
      <button
        class="dropdown-trigger ${this.open ? 'open' : ''}"
        @click=${this.toggle}
        ?disabled=${this.disabled}
        type="button"
        aria-haspopup="listbox"
        aria-expanded="${this.open}"
      >
        <span>${displayLabel}</span>
        <span class="dropdown-arrow">▼</span>
      </button>

      <div
        class="dropdown-menu ${this.placement} ${this.open ? 'open' : ''}"
        role="listbox"
        aria-label="${this.headerLabel}"
      >
        ${this.headerLabel
          ? html`<div class="dropdown-header">// ${this.headerLabel} //</div>`
          : ''}
        <slot>
          ${this.items.length === 0
            ? html`<div class="dropdown-empty">NO DATA AVAILABLE</div>`
            : this.items.map(
                item => html`
                  <div
                    class="dropdown-item ${item.value === this.value
                      ? 'selected'
                      : ''} ${item.disabled ? 'disabled' : ''} ${item.variant || ''}"
                    role="option"
                    aria-selected="${item.value === this.value}"
                    @click=${() => this._handleItemClick(item)}
                  >
                    ${item.label}
                  </div>
                `
              )}
        </slot>
      </div>
    `;
  }
}

customElements.define('thx-dropdown', ThxDropdown);
