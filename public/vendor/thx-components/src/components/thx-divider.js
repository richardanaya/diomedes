// @ts-check

/**
 * @fileoverview THX 1138 styled divider component for section separation.
 * @module thx-divider
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} DividerConfig
 * @property {string} style - Divider style: 'solid' | 'dashed' | 'inset' | 'crt'
 * @property {string} label - Optional label text to display on divider
 * @property {string} spacing - Spacing size: 'sm' | 'md' | 'lg'
 * @property {boolean} vertical - Whether to render as vertical divider
 */

/**
 * Divider component for visual separation of content sections.
 * Styled with THX 1138 monochrome aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxDivider extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: block;
    }

    :host([vertical]) {
      display: inline-flex;
      align-self: stretch;
    }

    .divider {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .divider__line {
      flex: 1;
      height: 0;
      border: none;
      border-top: var(--border-size-1) solid rgba(0, 0, 0, 0.1);
    }

    .divider--solid .divider__line {
      border-top-style: solid;
    }

    .divider--dashed .divider__line {
      border-top-style: dashed;
    }

    .divider--inset {
      padding: 0 var(--size-3);
    }

    .divider--inset .divider__line {
      border-top-color: rgba(0, 0, 0, 0.08);
    }

    .divider--crt .divider__line {
      border-top-color: rgba(166, 200, 225, 0.3);
      box-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.5);
    }

    .divider__label {
      padding: 0 var(--size-3);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-5);
      color: var(--neutral-600, #666);
    }

    .divider--crt .divider__label {
      color: var(--atmos-primary, #a6c8e1);
    }

    /* Spacing variants */
    .divider--spacing-sm {
      margin: var(--size-3) 0;
    }

    .divider--spacing-md {
      margin: var(--size-5) 0;
    }

    .divider--spacing-lg {
      margin: var(--size-7) 0;
    }

    /* Vertical divider */
    .divider--vertical {
      display: inline-flex;
      flex-direction: column;
      height: 100%;
      width: auto;
      margin: 0;
    }

    .divider--vertical .divider__line {
      width: 0;
      height: 100%;
      border-top: none;
      border-left: var(--border-size-1) solid rgba(0, 0, 0, 0.1);
    }

    .divider--vertical.divider--dashed .divider__line {
      border-left-style: dashed;
    }

    .divider--vertical.divider--crt .divider__line {
      border-left-color: rgba(166, 200, 225, 0.3);
    }

    .divider--vertical .divider__label {
      padding: var(--size-2) 0;
      writing-mode: vertical-rl;
      text-orientation: mixed;
    }

    .divider--vertical.divider--spacing-sm {
      margin: 0 var(--size-3);
    }

    .divider--vertical.divider--spacing-md {
      margin: 0 var(--size-5);
    }

    .divider--vertical.divider--spacing-lg {
      margin: 0 var(--size-7);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Divider style: 'solid' | 'dashed' | 'inset' | 'crt' */
      style: { type: String, reflect: true },
      /** Optional label text to display on divider */
      label: { type: String },
      /** Spacing size: 'sm' | 'md' | 'lg' */
      spacing: { type: String, reflect: true },
      /** Whether to render as vertical divider */
      vertical: { type: Boolean, reflect: true },
    };
  }

  constructor() {
    super();
    /** @type {string} */
    this.style = 'solid';
    /** @type {string} */
    this.label = '';
    /** @type {string} */
    this.spacing = 'md';
    /** @type {boolean} */
    this.vertical = false;
  }

  /**
   * Render the divider component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = {
      divider: true,
      [`divider--${this.style}`]: true,
      [`divider--spacing-${this.spacing}`]: true,
      'divider--vertical': this.vertical,
    };

    const classString = Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');

    return html`
      <div
        class="${classString}"
        role="separator"
        aria-orientation=${this.vertical ? 'vertical' : 'horizontal'}
      >
        <hr class="divider__line" />
        ${this.label
          ? html`
              <span class="divider__label">${this.label}</span>
              <hr class="divider__line" />
            `
          : null}
      </div>
    `;
  }
}

customElements.define('thx-divider', ThxDivider);
