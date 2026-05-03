// @ts-check

/**
 * @fileoverview THX 1138 styled slide-out drawer component
 * @module thx-drawer
 * @description A clinical slide-out panel with CRT monitor aesthetics
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} DrawerState
 * @property {boolean} open - Whether the drawer is currently open
 * @property {'left'|'right'|'top'|'bottom'} placement - Drawer placement
 * @property {'sm'|'md'|'lg'|'xl'|'full'} size - Drawer size variant
 */

export class ThxDrawer extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 10, 10, 0.7);
      backdrop-filter: blur(1px);
      z-index: var(--layer-5);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity var(--duration-moderate-2),
        visibility var(--duration-moderate-2);
    }

    .drawer-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .drawer-panel {
      position: fixed;
      background: var(--neutral-100, #fafafa);
      border: var(--size-2) solid var(--crt-border, #2a2a2a);
      box-shadow: 0 0 calc(var(--size-7) + var(--size-2)) rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform var(--duration-moderate-2) ease-out;
    }

    /* CRT scanline effect */
    .drawer-panel::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(166, 200, 225, 0.03) 2px,
        rgba(166, 200, 225, 0.03) var(--size-1)
      );
      pointer-events: none;
      z-index: var(--layer-2);
    }

    /* Left placement */
    .drawer-panel.left {
      left: 0;
      top: 0;
      bottom: 0;
      border-right-width: var(--size-2);
      border-left-width: 0;
      transform: translateX(-100%);
    }

    .drawer-overlay.open .drawer-panel.left {
      transform: translateX(0);
    }

    /* Right placement */
    .drawer-panel.right {
      right: 0;
      top: 0;
      bottom: 0;
      border-left-width: var(--size-2);
      border-right-width: 0;
      transform: translateX(100%);
    }

    .drawer-overlay.open .drawer-panel.right {
      transform: translateX(0);
    }

    /* Top placement */
    .drawer-panel.top {
      top: 0;
      left: 0;
      right: 0;
      border-bottom-width: var(--size-2);
      border-top-width: 0;
      transform: translateY(-100%);
    }

    .drawer-overlay.open .drawer-panel.top {
      transform: translateY(0);
    }

    /* Bottom placement */
    .drawer-panel.bottom {
      bottom: 0;
      left: 0;
      right: 0;
      border-top-width: var(--size-2);
      border-bottom-width: 0;
      transform: translateY(100%);
    }

    .drawer-overlay.open .drawer-panel.bottom {
      transform: translateY(0);
    }

    /* Size variants for left/right */
    .drawer-panel.left.sm,
    .drawer-panel.right.sm {
      width: 300px;
    }

    .drawer-panel.left.md,
    .drawer-panel.right.md {
      width: 400px;
    }

    .drawer-panel.left.lg,
    .drawer-panel.right.lg {
      width: 560px;
    }

    .drawer-panel.left.xl,
    .drawer-panel.right.xl {
      width: 720px;
    }

    .drawer-panel.left.full,
    .drawer-panel.right.full {
      width: 100%;
    }

    /* Size variants for top/bottom */
    .drawer-panel.top.sm,
    .drawer-panel.bottom.sm {
      height: 200px;
    }

    .drawer-panel.top.md,
    .drawer-panel.bottom.md {
      height: 300px;
    }

    .drawer-panel.top.lg,
    .drawer-panel.bottom.lg {
      height: 400px;
    }

    .drawer-panel.top.xl,
    .drawer-panel.bottom.xl {
      height: 50vh;
    }

    .drawer-panel.top.full,
    .drawer-panel.bottom.full {
      height: 100%;
    }

    .drawer-header {
      background: var(--crt-bg, #111);
      padding: var(--size-3) var(--size-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: var(--border-size-1) solid #333;
      position: relative;
      z-index: var(--layer-1);
      flex-shrink: 0;
    }

    .drawer-label {
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-0);
      color: var(--atmos-primary, #a6c8e1);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.5);
    }

    .drawer-close {
      width: var(--size-7);
      height: var(--size-7);
      background: transparent;
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
      color: var(--atmos-secondary, #707e91);
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--duration-quick-2);
      padding: 0;
    }

    .drawer-close:hover {
      border-color: var(--atmos-primary, #a6c8e1);
      color: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.4);
    }

    .drawer-body {
      padding: var(--size-5);
      overflow-y: auto;
      flex: 1;
      position: relative;
      z-index: var(--layer-1);
    }

    .drawer-footer {
      padding: var(--size-3) var(--size-4);
      border-top: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: calc(var(--size-2) + var(--size-1));
      position: relative;
      z-index: var(--layer-1);
      flex-shrink: 0;
    }
  `;

  static properties = {
    open: { type: Boolean, reflect: true },
    placement: { type: String },
    size: { type: String },
    headerLabel: { type: String, attribute: 'header-label' },
    noHeader: { type: Boolean, attribute: 'no-header' },
    noFooter: { type: Boolean, attribute: 'no-footer' },
    noOverlay: { type: Boolean, attribute: 'no-overlay' },
  };

  constructor() {
    super();
    /** @type {boolean} */
    this.open = false;
    /** @type {'left'|'right'|'top'|'bottom'} */
    this.placement = 'right';
    /** @type {'sm'|'md'|'lg'|'xl'|'full'} */
    this.size = 'md';
    /** @type {string} */
    this.headerLabel = 'TERMINAL-1138';
    /** @type {boolean} */
    this.noHeader = false;
    /** @type {boolean} */
    this.noFooter = false;
    /** @type {boolean} */
    this.noOverlay = false;
    /** @type {Element|null} */
    this._previousFocus = null;
  }

  /** @param {import('lit').PropertyValues} changedProperties */
  updated(changedProperties) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this._previousFocus = document.activeElement;
        this.updateComplete.then(() => this._focusDrawer());
      } else {
        this._restoreFocus();
      }
    }
  }

  /** @returns {HTMLElement[]} */
  _getFocusableElements() {
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return /** @type {HTMLElement[]} */ (
      [...this.renderRoot.querySelectorAll(selector), ...this.querySelectorAll(selector)].filter(
        el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
      )
    );
  }

  _focusDrawer() {
    const firstFocusable = /** @type {HTMLElement|undefined} */ (this._getFocusableElements()[0]);
    const panel = /** @type {HTMLElement|null} */ (this.renderRoot.querySelector('.drawer-panel'));
    (firstFocusable || panel)?.focus();
  }

  _restoreFocus() {
    const previousFocus = /** @type {HTMLElement|null} */ (this._previousFocus);
    if (previousFocus?.isConnected) previousFocus.focus();
    this._previousFocus = null;
  }

  /**
   * Opens the drawer
   * @returns {void}
   */
  show() {
    this.open = true;
    this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
  }

  /**
   * Closes the drawer
   * @returns {void}
   */
  hide() {
    this.open = false;
    this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
  }

  /**
   * Toggles drawer visibility
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
   * Handles click on overlay
   * @param {MouseEvent} e - Click event
   * @returns {void}
   */
  _handleOverlayClick(e) {
    if (e.target === e.currentTarget && !this.noOverlay) {
      this.hide();
    }
  }

  /**
   * Handles keyboard events
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {void}
   */
  _handleKeydown(e) {
    if (e.key === 'Escape' && this.open) {
      this.hide();
      return;
    }

    if (e.key === 'Tab' && this.open) {
      const focusable = this._getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        this._focusDrawer();
        return;
      }

      const first = /** @type {HTMLElement} */ (focusable[0]);
      const last = /** @type {HTMLElement} */ (focusable[focusable.length - 1]);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div
        class="drawer-overlay ${this.open ? 'open' : ''}"
        @click=${this._handleOverlayClick}
        @keydown=${this._handleKeydown}
        style="${this.noOverlay ? 'pointer-events: none; background: transparent;' : ''}"
      >
        <div
          class="drawer-panel ${this.placement} ${this.size}"
          role="dialog"
          aria-modal="true"
          aria-labelledby=${this.noHeader ? undefined : 'drawer-title'}
          tabindex="-1"
          style="${this.noOverlay ? 'pointer-events: auto;' : ''}"
        >
          ${!this.noHeader
            ? html`
                <div class="drawer-header">
                  <span class="drawer-label" id="drawer-title">${this.headerLabel}</span>
                  <button
                    class="drawer-close"
                    @click=${this.hide}
                    aria-label="Close drawer"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              `
            : ''}
          <div class="drawer-body">
            <slot></slot>
          </div>
          ${!this.noFooter
            ? html`
                <div class="drawer-footer">
                  <slot name="footer"></slot>
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('thx-drawer', ThxDrawer);
