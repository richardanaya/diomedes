// @ts-check

/**
 * @fileoverview THX 1138 styled menu container component
 * @module thx-menu
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * Menu container for navigation lists
 * THX 1138 style: clinical, border-separated, monospace labels
 * @element thx-menu
 */
export class ThxMenu extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--neutral-100, #fafafa);
      border: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      box-shadow: var(--inner-shadow-0);
      min-width: 200px;
    }

    .menu-header {
      padding: calc(var(--size-2) + var(--size-1)) var(--size-3);
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-5);
      color: var(--neutral-600, #666);
      background: rgba(0, 0, 0, 0.02);
    }

    .menu-header::before {
      content: '// ';
    }

    .menu-header::after {
      content: ' //';
    }

    .menu-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    ::slotted(thx-menu-label) {
      display: block;
    }

    ::slotted(thx-menu-item) {
      display: block;
    }

    /* CRT display variant */
    :host([variant='crt']) {
      background: var(--crt-bg, #111);
      border: calc(var(--size-2) + var(--size-1)) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      box-shadow: inset 0 0 var(--size-4) rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }

    :host([variant='crt']) .menu-header {
      background: transparent;
      color: var(--atmos-secondary, #707e91);
      border-bottom-color: rgba(166, 200, 225, 0.2);
    }

    :host([variant='crt'])::before {
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

    :host([variant='crt']) .crt-label {
      position: absolute;
      top: var(--size-1);
      right: var(--size-2);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: #666;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      z-index: calc(var(--layer-2) + 5);
    }

    /* Compact variant */
    :host([variant='compact']) {
      border: none;
      box-shadow: none;
      background: transparent;
    }

    :host([variant='compact']) .menu-header {
      background: transparent;
      padding: var(--size-2) 0;
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.06);
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    label: { type: String },
    variant: { type: String, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} Header label text */
    this.label = '';
    /** @type {string} Variant: default, crt, compact */
    this.variant = 'default';
  }

  /** @returns {HTMLElement[]} */
  _getItems() {
    return /** @type {HTMLElement[]} */ (
      Array.from(this.querySelectorAll('thx-menu-item')).filter(
        item => !(/** @type {HTMLElement & {disabled?: boolean}} */ (item).disabled)
      )
    );
  }

  /**
   * @param {HTMLElement|undefined} item
   * @returns {void}
   */
  _focusItem(item) {
    item?.focus();
  }

  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  _handleKeydown(e) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '];
    if (!keys.includes(e.key)) return;

    const items = this._getItems();
    if (items.length === 0) return;

    const currentIndex = Math.max(
      0,
      items.findIndex(item => item === document.activeElement || item.shadowRoot?.activeElement)
    );

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const currentItem = /** @type {HTMLElement & {activate?: () => void}|undefined} */ (
        items[currentIndex]
      );
      currentItem?.activate?.();
      return;
    }

    e.preventDefault();
    let nextIndex = currentIndex;
    if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = items.length - 1;
    else if (e.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    else nextIndex = (currentIndex - 1 + items.length) % items.length;

    this._focusItem(/** @type {HTMLElement} */ (items[nextIndex]));
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      ${this.variant === 'crt' ? html`<span class="crt-label">MENU-01</span>` : ''}
      ${this.label ? html`<div class="menu-header">${this.label}</div>` : ''}
      <ul class="menu-list" role="menu" @keydown="${this._handleKeydown}">
        <slot></slot>
      </ul>
    `;
  }
}

customElements.define('thx-menu', ThxMenu);
