// @ts-check

/**
 * @fileoverview THX 1138 styled radio button (button style) component
 * @module thx-radio-button
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} RadioButtonProps
 * @property {boolean} checked - Whether the radio button is checked
 * @property {boolean} disabled - Whether the radio button is disabled
 * @property {string} value - The radio button value
 * @property {string} size - The size (sm, md, lg)
 */

/**
 * THX 1138 styled radio button component with button appearance
 * @extends {LitElement}
 */
export class ThxRadioButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
      cursor: pointer;
      transition: all var(--duration-quick-2);
      background: transparent;
      color: var(--atmos-secondary, #707e91);
    }

    button:hover:not(:disabled) {
      background: rgba(166, 200, 225, 0.1);
      color: var(--atmos-primary, #a6c8e1);
    }

    button.active {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
      border-color: var(--atmos-primary, #a6c8e1);
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

    button:active:not(:disabled) {
      transform: translateY(1px);
    }
  `;

  static properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    value: { type: String },
    size: { type: String },
  };

  constructor() {
    super();
    /** @type {boolean} */
    this.checked = false;
    /** @type {boolean} */
    this.disabled = false;
    /** @type {string} */
    this.value = '';
    /** @type {string} */
    this.size = 'md';
  }

  /**
   * @returns {void}
   */
  select() {
    if (this.disabled) return;
    this.checked = true;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @returns {void}
   */
  handleClick() {
    this.select();
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = `size-${this.size} ${this.checked ? 'active' : ''}`;
    return html`
      <button
        class=${classes}
        ?disabled=${this.disabled}
        role="radio"
        aria-checked=${this.checked}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('thx-radio-button', ThxRadioButton);
