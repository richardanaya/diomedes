// @ts-check

/**
 * @fileoverview THX 1138 styled modal dialog component
 * @module thx-dialog
 * @description A clinical, dystopian dialog with CRT-style overlay aesthetics
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} DialogState
 * @property {boolean} open - Whether the dialog is currently open
 * @property {string} headerLabel - The dialog header label (e.g., "ALERT-1138")
 * @property {'sm'|'md'|'lg'} size - Dialog size variant
 */

export class ThxDialog extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 10, 10, 0.85);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--layer-5);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity var(--duration-moderate-1),
        visibility var(--duration-moderate-1);
    }

    .dialog-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .dialog-container {
      background: var(--neutral-100, #fafafa);
      border: calc(var(--size-2) + var(--size-1)) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      box-shadow:
        var(--inner-shadow-0),
        0 0 calc(var(--size-7) + var(--size-2)) rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
      transform: scale(0.95);
      transition: transform var(--duration-moderate-1);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-overlay.open .dialog-container {
      transform: scale(1);
    }

    .dialog-container.sm {
      width: min(400px, 90vw);
    }

    .dialog-container.md {
      width: min(600px, 90vw);
    }

    .dialog-container.lg {
      width: min(800px, 90vw);
    }

    /* CRT scanline effect overlay */
    .dialog-container::before {
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

    .dialog-header {
      background: var(--crt-bg, #111);
      padding: calc(var(--size-2) + var(--size-1)) var(--size-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: var(--border-size-1) solid #333;
      position: relative;
      z-index: var(--layer-1);
    }

    .dialog-label {
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-0);
      color: var(--atmos-primary, #a6c8e1);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-5);
      text-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.5);
    }

    .dialog-close {
      width: var(--size-6);
      height: var(--size-6);
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

    .dialog-close:hover {
      border-color: var(--atmos-primary, #a6c8e1);
      color: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.4);
    }

    .dialog-body {
      padding: var(--size-5) var(--size-4);
      overflow-y: auto;
      flex: 1;
      position: relative;
      z-index: var(--layer-1);
    }

    .dialog-footer {
      padding: var(--size-3) var(--size-4);
      border-top: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: calc(var(--size-2) + var(--size-1));
      position: relative;
      z-index: var(--layer-1);
    }

    ::slotted([slot='footer']) {
      display: flex;
      gap: calc(var(--size-2) + var(--size-1));
    }
  `;

  static properties = {
    open: { type: Boolean, reflect: true },
    headerLabel: { type: String, attribute: 'header-label' },
    size: { type: String },
    noHeader: { type: Boolean, attribute: 'no-header' },
    noFooter: { type: Boolean, attribute: 'no-footer' },
  };

  constructor() {
    super();
    /** @type {boolean} */
    this.open = false;
    /** @type {string} */
    this.headerLabel = 'ALERT-1138';
    /** @type {'sm'|'md'|'lg'} */
    this.size = 'md';
    /** @type {boolean} */
    this.noHeader = false;
    /** @type {boolean} */
    this.noFooter = false;
    /** @type {Element|null} */
    this._previousFocus = null;
  }

  /** @param {import('lit').PropertyValues} changedProperties */
  updated(changedProperties) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this._previousFocus = document.activeElement;
        this.updateComplete.then(() => this._focusDialog());
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

  _focusDialog() {
    const firstFocusable = /** @type {HTMLElement|undefined} */ (this._getFocusableElements()[0]);
    const container = /** @type {HTMLElement|null} */ (
      this.renderRoot.querySelector('.dialog-container')
    );
    (firstFocusable || container)?.focus();
  }

  _restoreFocus() {
    const previousFocus = /** @type {HTMLElement|null} */ (this._previousFocus);
    if (previousFocus?.isConnected) previousFocus.focus();
    this._previousFocus = null;
  }

  /**
   * Opens the dialog
   * @returns {void}
   */
  show() {
    this.open = true;
    this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
  }

  /**
   * Closes the dialog
   * @returns {void}
   */
  hide() {
    this.open = false;
    this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
  }

  /**
   * Toggles dialog visibility
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
   * Handles click on overlay background
   * @param {MouseEvent} e - Click event
   * @returns {void}
   */
  _handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      this.hide();
    }
  }

  /**
   * Handles keyboard events for accessibility
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
        this._focusDialog();
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
        class="dialog-overlay ${this.open ? 'open' : ''}"
        @click=${this._handleOverlayClick}
        @keydown=${this._handleKeydown}
      >
        <div
          class="dialog-container ${this.size}"
          role="dialog"
          aria-modal="true"
          aria-labelledby=${this.noHeader ? undefined : 'dialog-title'}
          tabindex="-1"
        >
          ${!this.noHeader
            ? html`
                <div class="dialog-header">
                  <span class="dialog-label" id="dialog-title">${this.headerLabel}</span>
                  <button
                    class="dialog-close"
                    @click=${this.hide}
                    aria-label="Close dialog"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              `
            : ''}
          <div class="dialog-body">
            <slot></slot>
          </div>
          ${!this.noFooter
            ? html`
                <div class="dialog-footer">
                  <slot name="footer">
                    <button
                      class="btn btn-secondary"
                      @click=${this.hide}
                      style="
                        height: calc(var(--size-7) + var(--size-1));
                        padding: 0 var(--size-4);
                        background: var(--atmos-secondary, #707e91);
                        color: var(--neutral-100, #fafafa);
                        border: none;
                        font-family: var(--font-mono, 'Courier New', monospace);
                        font-size: var(--font-size-0);
                        text-transform: uppercase;
                        letter-spacing: var(--font-letterspacing-4);
                        cursor: pointer;
                        transition: all var(--duration-quick-2);
                      "
                      type="button"
                    >
                      CANCEL
                    </button>
                    <button
                      class="btn btn-primary"
                      @click=${() =>
                        this.dispatchEvent(
                          new CustomEvent('thx-confirm', { bubbles: true, composed: true })
                        )}
                      style="
                        height: calc(var(--size-7) + var(--size-1));
                        padding: 0 var(--size-4);
                        background: var(--atmos-primary, #a6c8e1);
                        color: var(--neutral-800, #333);
                        border: none;
                        font-family: var(--font-mono, 'Courier New', monospace);
                        font-size: var(--font-size-0);
                        text-transform: uppercase;
                        letter-spacing: var(--font-letterspacing-4);
                        cursor: pointer;
                        transition: all var(--duration-quick-2);
                      "
                      type="button"
                    >
                      CONFIRM
                    </button>
                  </slot>
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('thx-dialog', ThxDialog);
