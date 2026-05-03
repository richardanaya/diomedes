// @ts-check

/**
 * @fileoverview THX 1138 styled button group component
 * @module thx-button-group
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * Button group for grouping related actions together
 * THX 1138 style: stark borders, clinical precision
 * @element thx-button-group
 */
export class ThxButtonGroup extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
      background: var(--neutral-100, #fafafa);
      box-shadow: var(--inner-shadow-0);
    }

    ::slotted(button) {
      margin: 0 !important;
      border-radius: 0 !important;
      border: none !important;
      border-right: var(--border-size-1) solid var(--atmos-secondary, #707e91) !important;
      background: transparent !important;
      color: var(--atmos-secondary, #707e91) !important;
      font-family: var(--font-mono, 'Courier New', Courier, monospace) !important;
      font-size: var(--font-size-0) !important;
      text-transform: uppercase !important;
      letter-spacing: var(--font-letterspacing-4) !important;
      padding: var(--size-2) var(--size-3) !important;
      height: calc(var(--size-7) + var(--size-1)) !important;
      cursor: pointer !important;
      transition: all var(--duration-quick-2) !important;
    }

    ::slotted(thx-button) {
      margin: 0 !important;
      --thx-button-grouped: true;
    }

    ::slotted(thx-button[grouped]) {
      margin: 0 !important;
    }

    ::slotted(button:last-child) {
      border-right: none !important;
    }

    ::slotted(button:hover) {
      background: rgba(166, 200, 225, 0.1) !important;
      color: var(--atmos-primary, #a6c8e1) !important;
    }

    ::slotted(button[active]),
    ::slotted(button.active) {
      background: var(--atmos-primary, #a6c8e1) !important;
      color: var(--neutral-800, #333) !important;
      box-shadow: inset 0 0 var(--size-2) rgba(166, 200, 225, 0.3) !important;
    }

    ::slotted(button:disabled) {
      opacity: 0.4 !important;
      cursor: not-allowed !important;
      background: transparent !important;
    }

    /* Size variants */
    :host([size='sm']) ::slotted(button),
    :host([size='sm']) ::slotted(thx-button) {
      padding: var(--size-1) calc(var(--size-2) + var(--size-1)) !important;
      font-size: var(--font-size-00) !important;
      height: var(--size-6) !important;
    }

    :host([size='lg']) ::slotted(button),
    :host([size='lg']) ::slotted(thx-button) {
      padding: calc(var(--size-2) + var(--size-1)) var(--size-5) !important;
      font-size: var(--font-size-0) !important;
      height: 44px !important;
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    size: { type: String, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} Size variant: sm, md, lg */
    this.size = 'md';
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`<slot></slot>`;
  }
}

customElements.define('thx-button-group', ThxButtonGroup);
