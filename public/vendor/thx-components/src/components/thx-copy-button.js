// @ts-check

/**
 * @fileoverview THX 1138 styled copy to clipboard button
 * @module thx-copy-button
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} CopyButtonProps
 * @property {string} value - The value to copy to clipboard
 * @property {string} variant - The button variant
 * @property {string} size - The button size
 * @property {boolean} disabled - Whether the button is disabled
 * @property {string} successText - Text to show after successful copy
 * @property {string} copyText - Text to show for copy action
 * @property {number} feedbackDuration - Duration to show success feedback in ms
 */

/**
 * THX 1138 styled copy to clipboard button
 * @extends {LitElement}
 */
export class ThxCopyButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--size-1);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      border: none;
      cursor: pointer;
      transition: all var(--duration-quick-2);
      position: relative;
      overflow: hidden;
      font-weight: var(--font-weight-6);
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Sizes */
    .size-sm {
      padding: var(--size-1) calc(var(--size-2) + var(--size-1));
      font-size: var(--font-size-00);
      height: var(--size-6);
    }

    .size-md {
      padding: var(--size-2) var(--size-4);
      font-size: var(--font-size-0);
      height: calc(var(--size-7) + var(--size-2));
    }

    .size-lg {
      padding: var(--size-3) var(--size-6);
      font-size: var(--font-size-0);
      height: var(--size-8);
    }

    /* Primary */
    .variant-primary {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
    }

    .variant-primary:hover:not(:disabled) {
      background: var(--atmos-tertiary, #deffff);
      box-shadow: 0 0 15px rgba(166, 200, 225, 0.5);
    }

    /* Secondary */
    .variant-secondary {
      background: var(--atmos-secondary, #707e91);
      color: var(--neutral-100, #fafafa);
    }

    .variant-secondary:hover:not(:disabled) {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
    }

    /* Ghost */
    .variant-ghost {
      background: transparent;
      color: var(--neutral-600, #666);
      border: var(--border-size-1) solid transparent;
    }

    .variant-ghost:hover:not(:disabled) {
      color: var(--atmos-primary, #a6c8e1);
      border-color: var(--atmos-primary, #a6c8e1);
    }

    /* Success state */
    .success {
      background: var(--neutral-800, #333) !important;
      color: var(--neutral-100, #fafafa) !important;
    }

    /* Icons */
    .icon {
      width: 1em;
      height: 1em;
      display: inline-block;
    }

    button:active:not(:disabled) {
      transform: translateY(1px);
    }
  `;

  static properties = {
    value: { type: String },
    variant: { type: String },
    size: { type: String },
    disabled: { type: Boolean },
    successText: { type: String },
    copyText: { type: String },
    feedbackDuration: { type: Number },
  };

  constructor() {
    super();
    /** @type {string} */
    this.value = '';
    /** @type {string} */
    this.variant = 'primary';
    /** @type {string} */
    this.size = 'md';
    /** @type {boolean} */
    this.disabled = false;
    /** @type {string} */
    this.successText = 'COPIED';
    /** @type {string} */
    this.copyText = 'COPY';
    /** @type {number} */
    this.feedbackDuration = 2000;
    /** @type {boolean} */
    this._showSuccess = false;
    /** @type {number|null} */
    this._timeoutId = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async copyToClipboard() {
    if (this.disabled || !this.value) return;

    try {
      await navigator.clipboard.writeText(this.value);
      this._showSuccess = true;
      this.requestUpdate();

      this.dispatchEvent(new Event('copy', { bubbles: true, composed: true }));

      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
      }

      this._timeoutId = window.setTimeout(() => {
        this._showSuccess = false;
        this.requestUpdate();
      }, this.feedbackDuration);
    } catch (err) {
      this.dispatchEvent(new Event('error', { bubbles: true, composed: true }));
    }
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = `size-${this.size} variant-${this.variant} ${
      this._showSuccess ? 'success' : ''
    }`;

    const copyIcon = html`
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;

    const checkIcon = html`
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

    return html`
      <button
        class=${classes}
        ?disabled=${this.disabled}
        @click=${this.copyToClipboard}
        title=${this._showSuccess ? 'Copied!' : 'Copy to clipboard'}
      >
        ${this._showSuccess ? checkIcon : copyIcon}
        <span>${this._showSuccess ? this.successText : this.copyText}</span>
      </button>
    `;
  }
}

customElements.define('thx-copy-button', ThxCopyButton);
