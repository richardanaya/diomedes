// @ts-check

/**
 * @fileoverview THX 1138 styled alert component for displaying status messages.
 * @module thx-alert
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} AlertConfig
 * @property {string} variant - Alert variant: 'info' | 'warning' | 'error' | 'success'
 * @property {boolean} closable - Whether the alert can be dismissed
 * @property {string} label - Optional label/header text
 */

/**
 * Alert component for displaying status messages and notifications.
 * Styled with THX 1138 monochrome CRT aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxAlert extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: block;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: calc(var(--size-2) + var(--size-1));
      padding: var(--size-3) var(--size-4);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      line-height: var(--font-lineheight-3);
      letter-spacing: var(--font-letterspacing-2);
      text-transform: uppercase;
      border-left: calc(var(--border-size-1) + var(--border-size-2)) solid transparent;
      background: var(--neutral-100, #fafafa);
      box-shadow: var(--inner-shadow-0);
      position: relative;
    }

    .alert--info {
      border-left-color: var(--atmos-primary, #a6c8e1);
      background: linear-gradient(
        90deg,
        rgba(166, 200, 225, 0.08) 0%,
        var(--neutral-100, #fafafa) 100%
      );
    }

    .alert--warning {
      border-left-color: var(--accent-warning, #d4aa00);
      background: linear-gradient(
        90deg,
        rgba(212, 170, 0, 0.08) 0%,
        var(--neutral-100, #fafafa) 100%
      );
    }

    .alert--error {
      border-left-color: var(--accent-error, #d44000);
      background: linear-gradient(
        90deg,
        rgba(212, 64, 0, 0.08) 0%,
        var(--neutral-100, #fafafa) 100%
      );
    }

    .alert--success {
      border-left-color: var(--atmos-secondary, #707e91);
      background: linear-gradient(
        90deg,
        rgba(112, 126, 145, 0.08) 0%,
        var(--neutral-100, #fafafa) 100%
      );
    }

    .alert__icon {
      flex-shrink: 0;
      width: var(--size-4);
      height: var(--size-4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-1);
      font-weight: var(--font-weight-6);
    }

    .alert--info .alert__icon {
      color: var(--atmos-primary, #a6c8e1);
    }

    .alert--warning .alert__icon {
      color: var(--accent-warning, #d4aa00);
    }

    .alert--error .alert__icon {
      color: var(--accent-error, #d44000);
    }

    .alert--success .alert__icon {
      color: var(--atmos-secondary, #707e91);
    }

    .alert__content {
      flex: 1;
      min-width: 0;
    }

    .alert__label {
      display: block;
      font-weight: var(--font-weight-6);
      margin-bottom: var(--size-1);
      color: var(--neutral-800, #333);
    }

    .alert__message {
      color: var(--neutral-600, #666);
      text-transform: none;
      letter-spacing: normal;
    }

    .alert__close {
      flex-shrink: 0;
      width: var(--size-5);
      height: var(--size-5);
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--neutral-600, #666);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-1);
      line-height: 1;
      padding: 0;
      transition: color var(--duration-quick-2);
    }

    .alert__close:hover {
      color: var(--neutral-800, #333);
    }

    .alert__close:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--atmos-primary, #a6c8e1);
    }

    :host([hidden]) {
      display: none;
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Alert variant: 'info' | 'warning' | 'error' | 'success' */
      variant: { type: String, reflect: true },
      /** Whether the alert can be dismissed */
      closable: { type: Boolean, reflect: true },
      /** Optional label/header text */
      label: { type: String },
      /** Whether the alert is currently hidden */
      hidden: { type: Boolean, reflect: true },
    };
  }

  constructor() {
    super();
    /** @type {string} */
    this.variant = 'info';
    /** @type {boolean} */
    this.closable = false;
    /** @type {string} */
    this.label = '';
    /** @type {boolean} */
    this.hidden = false;
  }

  /**
   * Get the icon character for the current variant.
   * @returns {string} Icon character
   * @private
   */
  _getIcon() {
    /** @type {Record<string, string>} */
    const icons = {
      info: '◆',
      warning: '▲',
      error: '■',
      success: '●',
    };
    return icons[this.variant] || icons.info;
  }

  /**
   * Get the default label for the current variant.
   * @returns {string} Default label text
   * @private
   */
  _getDefaultLabel() {
    /** @type {Record<string, string>} */
    const labels = {
      info: 'NOTICE',
      warning: 'WARNING',
      error: 'ERROR',
      success: 'CONFIRMED',
    };
    return labels[this.variant] || labels.info;
  }

  /**
   * Handle close button click.
   * @returns {void}
   * @private
   */
  _handleClose() {
    this.hidden = true;
    this.dispatchEvent(new Event('close', { bubbles: true, composed: true }));
  }

  /**
   * Render the alert component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    if (this.hidden) {
      return html``;
    }

    const displayLabel = this.label || this._getDefaultLabel();

    return html`
      <div class="alert alert--${this.variant}" role="alert" aria-live="polite">
        <span class="alert__icon" aria-hidden="true">${this._getIcon()}</span>
        <div class="alert__content">
          <span class="alert__label">${displayLabel}</span>
          <span class="alert__message"><slot></slot></span>
        </div>
        ${this.closable
          ? html`
              <button class="alert__close" @click=${this._handleClose} aria-label="Dismiss alert">
                ×
              </button>
            `
          : null}
      </div>
    `;
  }
}

customElements.define('thx-alert', ThxAlert);
