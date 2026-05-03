// @ts-check

/**
 * @fileoverview THX 1138 styled menu label component
 * @module thx-menu-label
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * Menu label for grouping/categorizing menu items
 * THX 1138 style: section dividers with monospace identifiers
 * @element thx-menu-label
 */
export class ThxMenuLabel extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: var(--size-2) var(--size-3);
      margin-top: var(--size-2);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-5);
      color: var(--neutral-600, #666);
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.06);
    }

    :host::before {
      content: '// ';
    }

    :host::after {
      content: ' //';
    }

    /* First label shouldn't have top margin */
    :host(:first-child) {
      margin-top: 0;
    }

    /* CRT variant */
    :host([variant='crt']) {
      color: var(--atmos-secondary, #707e91);
      border-bottom-color: rgba(166, 200, 225, 0.2);
    }

    /* Compact variant */
    :host([variant='compact']) {
      padding: var(--size-2) 0;
      margin-top: var(--size-1);
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    variant: { type: String, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} Variant inherited from parent */
    this.variant = 'default';
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`<slot></slot>`;
  }
}

customElements.define('thx-menu-label', ThxMenuLabel);
