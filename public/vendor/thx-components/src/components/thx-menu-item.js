// @ts-check

/**
 * @fileoverview THX 1138 styled menu item component
 * @module thx-menu-item
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * Individual menu item with hover/active states
 * THX 1138 style: clinical precision with phosphor glow
 * @element thx-menu-item
 */
export class ThxMenuItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: calc(var(--size-2) + var(--size-1));
      padding: var(--size-2) var(--size-3);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      color: var(--neutral-800, #333);
      cursor: pointer;
      transition: all var(--duration-quick-2);
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.04);
      background: transparent;
      text-decoration: none;
      position: relative;
    }

    .menu-item:hover {
      background: rgba(166, 200, 225, 0.08);
      color: var(--atmos-primary, #a6c8e1);
    }

    .menu-item.active,
    :host([active]) .menu-item {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
    }

    .menu-item.active::before,
    :host([active]) .menu-item::before {
      content: '▸';
      position: absolute;
      left: var(--size-1);
      font-size: var(--font-size-0);
    }

    :host([active]) .menu-item {
      padding-left: var(--size-4);
    }

    .menu-item.disabled,
    :host([disabled]) .menu-item {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* CRT variant styling */
    :host([variant='crt']) .menu-item {
      color: var(--atmos-secondary, #707e91);
      border-bottom-color: rgba(166, 200, 225, 0.1);
    }

    :host([variant='crt']) .menu-item:hover {
      color: var(--atmos-tertiary, #deffff);
      background: rgba(166, 200, 225, 0.15);
      text-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.5);
    }

    :host([variant='crt']) .menu-item.active {
      background: rgba(166, 200, 225, 0.25);
      color: var(--atmos-tertiary, #deffff);
      text-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.8);
    }

    /* Badge/pill indicator */
    .indicator {
      margin-left: auto;
      font-size: var(--font-size-0);
      padding: var(--size-1) var(--size-1);
      background: var(--atmos-secondary, #707e91);
      color: var(--neutral-100, #fafafa);
      min-width: var(--size-4);
      text-align: center;
    }

    .indicator.warning {
      background: var(--accent-warning, #d4aa00);
      color: var(--neutral-800, #333);
    }

    .indicator.error {
      background: var(--accent-error, #d44000);
      color: var(--neutral-100, #fafafa);
    }

    /* Icon slot */
    ::slotted([slot='icon']) {
      width: var(--size-3);
      height: var(--size-3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    href: { type: String },
    active: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    variant: { type: String, reflect: true },
    indicator: { type: String },
  };

  constructor() {
    super();
    /** @type {string} URL for link menu items */
    this.href = '';
    /** @type {boolean} Whether this item is active/selected */
    this.active = false;
    /** @type {boolean} Whether this item is disabled */
    this.disabled = false;
    /** @type {string} Variant inherited from parent */
    this.variant = 'default';
    /** @type {string} Optional indicator badge text */
    this.indicator = '';
  }

  focus() {
    this.updateComplete.then(() => {
      const item = /** @type {HTMLElement|null} */ (
        this.renderRoot.querySelector('[role="menuitem"]')
      );
      item?.focus();
    });
  }

  activate() {
    const item = /** @type {HTMLElement|null} */ (
      this.renderRoot.querySelector('[role="menuitem"]')
    );
    item?.click();
  }

  /**
   * Handle click events
   * @param {MouseEvent} e
   * @returns {void}
   * @private
   */
  _handleClick(e) {
    if (this.disabled) {
      e.preventDefault();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('select', {
        bubbles: true,
        composed: true,
        detail: {
          href: this.href,
          active: this.active,
        },
      })
    );
  }

  /**
   * Get indicator classes
   * @returns {string}
   * @private
   */
  _getIndicatorClass() {
    if (this.indicator === '!') return 'indicator error';
    if (this.indicator?.includes('WARN')) return 'indicator warning';
    return 'indicator';
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = {
      'menu-item': true,
      active: this.active,
      disabled: this.disabled,
    };

    const classString = Object.entries(classes)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');

    const content = html`
      <slot name="icon"></slot>
      <span class="label"><slot></slot></span>
      ${this.indicator
        ? html`<span class="${this._getIndicatorClass()}">${this.indicator}</span>`
        : ''}
    `;

    if (this.href && !this.disabled) {
      return html`
        <a
          href="${this.href}"
          class="${classString}"
          role="menuitem"
          tabindex="0"
          @click="${this._handleClick}"
        >
          ${content}
        </a>
      `;
    }

    return html`
      <div
        class="${classString}"
        role="menuitem"
        tabindex="${this.disabled ? '-1' : '0'}"
        @click="${this._handleClick}"
      >
        ${content}
      </div>
    `;
  }
}

customElements.define('thx-menu-item', ThxMenuItem);
