// @ts-check

/**
 * @fileoverview THX 1138 styled tab panel component
 * @module thx-tab-panel
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * Tab panel content container
 * THX 1138 style: clinical content areas
 * @element thx-tab-panel
 */
export class ThxTabPanel extends LitElement {
  static styles = css`
    :host {
      display: none;
      padding: var(--size-5);
    }

    :host([active]) {
      display: block;
      animation: panelFadeIn var(--duration-moderate-1) ease-out;
    }

    @keyframes panelFadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* CRT variant */
    :host([variant='crt']) {
      padding: var(--size-4);
      background: var(--crt-bg-dark, #0a0a0a);
      color: var(--atmos-primary, #a6c8e1);
    }

    :host([variant='crt']) slot {
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
    }

    /* Compact variant */
    :host([variant='compact']) {
      padding: var(--size-3) 0;
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    id: { type: String, reflect: true },
    active: { type: Boolean, reflect: true },
    variant: { type: String, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} Panel ID (must match tab panel attribute) */
    this.id = '';
    /** @type {boolean} Whether this panel is active */
    this.active = false;
    /** @type {string} Variant inherited from parent */
    this.variant = 'default';
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'tabpanel');
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`<slot></slot>`;
  }
}

customElements.define('thx-tab-panel', ThxTabPanel);
