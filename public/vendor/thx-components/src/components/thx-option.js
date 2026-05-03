// @ts-check

/**
 * @fileoverview THX 1138 styled select option component
 * @module thx-option
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} OptionProps
 * @property {string} value - The option value
 * @property {string} label - The option label text
 * @property {boolean} selected - Whether the option is selected
 * @property {boolean} disabled - Whether the option is disabled
 */

/**
 * THX 1138 styled option component for use within thx-select
 * @extends {LitElement}
 */
export class ThxOption extends LitElement {
  static styles = css`
    :host {
      display: none;
    }

    :host([selected]) {
      display: block;
    }
  `;

  static properties = {
    value: { type: String },
    label: { type: String },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} */
    this.value = '';
    /** @type {string} */
    this.label = '';
    /** @type {boolean} */
    this.selected = false;
    /** @type {boolean} */
    this.disabled = false;
  }

  /**
   * @returns {string}
   */
  get displayLabel() {
    return this.label || this.textContent?.trim() || this.value;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`<slot></slot>`;
  }
}

customElements.define('thx-option', ThxOption);
