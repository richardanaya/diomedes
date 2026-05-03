// @ts-check

/**
 * @fileoverview THX 1138 styled visually hidden component
 * @module thx-visually-hidden
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} VisuallyHiddenConfig
 * @property {boolean} [focusable=false] - Whether element should be visible on focus
 * @property {string} [as='span'] - HTML tag to render as (for slot content wrapper)
 */

/**
 * THX 1138 styled visually hidden component.
 * Hides content visually while keeping it accessible to assistive technologies.
 * Essential for accessibility in the sterile, controlled THX 1138 interface.
 *
 * @extends {LitElement}
 */
export class ThxVisuallyHidden extends LitElement {
  static styles = css`
    :host {
      display: inline;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    /*
      Classic visually hidden pattern:
      - Removes element from visual flow
      - Maintains accessibility for screen readers
      - Allows focus if focusable attribute is set
    */
    .visually-hidden {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    /* Make visible on focus if focusable */
    :host([focusable]) .visually-hidden:focus,
    :host([focusable]) .visually-hidden:focus-within {
      position: static !important;
      width: auto !important;
      height: auto !important;
      padding: var(--size-2) calc(var(--size-2) + var(--size-1)) !important;
      margin: 0 !important;
      overflow: visible !important;
      clip: auto !important;
      white-space: normal !important;
      background: var(--neutral-100, #fafafa);
      border: var(--border-size-1) solid var(--atmos-primary, #a6c8e1) !important;
      box-shadow: 0 0 0 2px rgba(166, 200, 225, 0.3);
      z-index: var(--layer-5);
      font-size: var(--font-size-0);
      color: var(--neutral-800, #333);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
    }

    /* Debug mode - visually show the hidden element with an indicator */
    :host([debug]) .visually-hidden {
      position: relative !important;
      width: auto !important;
      height: auto !important;
      padding: var(--size-1) var(--size-2) !important;
      margin: 0 !important;
      overflow: visible !important;
      clip: auto !important;
      white-space: normal !important;
      background: rgba(166, 200, 225, 0.2);
      border: var(--border-size-1) dashed var(--atmos-primary, #a6c8e1) !important;
      color: var(--neutral-800, #333);
      font-size: var(--font-size-0);
    }

    :host([debug]) .visually-hidden::before {
      content: '[HIDDEN] ';
      font-size: var(--font-size-0);
      color: var(--atmos-primary, #a6c8e1);
      font-weight: var(--font-weight-6);
    }

    /* Status variants */
    :host([status='error']) .visually-hidden:focus,
    :host([status='error']) .visually-hidden:focus-within {
      background: rgba(212, 64, 0, 0.1);
      border-color: var(--accent-error, #d44000) !important;
      box-shadow: 0 0 0 2px rgba(212, 64, 0, 0.3);
    }

    :host([status='warning']) .visually-hidden:focus,
    :host([status='warning']) .visually-hidden:focus-within {
      background: rgba(212, 170, 0, 0.1);
      border-color: var(--accent-warning, #d4aa00) !important;
      box-shadow: 0 0 0 2px rgba(212, 170, 0, 0.3);
    }

    /* Skip link specific styling */
    :host([as='skip-link']) .visually-hidden {
      position: fixed !important;
      top: -100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--neutral-800, #333);
      color: var(--neutral-100, #fafafa);
      padding: var(--size-3) var(--size-5);
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      font-size: var(--font-size-1);
      font-weight: var(--font-weight-5);
      z-index: 10000;
      transition: top var(--duration-moderate-1);
      white-space: nowrap;
    }

    :host([as='skip-link']) .visually-hidden:focus {
      position: fixed !important;
      top: var(--size-4);
      width: auto !important;
      height: auto !important;
      clip: auto !important;
    }

    :host([as='skip-link']) .visually-hidden::after {
      content: ' // PRESS ENTER';
      color: var(--atmos-primary, #a6c8e1);
      font-size: var(--font-size-0);
    }

    /* Announcement variant */
    :host([as='announce']) .visually-hidden {
      position: fixed !important;
      bottom: var(--size-4);
      right: var(--size-4);
      background: var(--crt-bg, #111);
      border: var(--border-size-2) solid var(--atmos-primary, #a6c8e1) !important;
      color: var(--atmos-primary, #a6c8e1);
      padding: calc(var(--size-2) + var(--size-1)) var(--size-3);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
      text-transform: uppercase;
      z-index: 10000;
      box-shadow: 0 0 var(--size-4) rgba(166, 200, 225, 0.3);
    }

    :host([as='announce']) .visually-hidden::before {
      content: '⚠ ';
      color: var(--accent-warning, #d4aa00);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Whether element becomes visible on focus */
      focusable: { type: Boolean },
      /** Component variant: default, skip-link, announce */
      as: { type: String },
      /** Debug mode - visually show hidden content */
      debug: { type: Boolean },
      /** Status indicator: error, warning, normal */
      status: { type: String },
    };
  }

  constructor() {
    super();
    /** @type {boolean} */
    this.focusable = false;
    /** @type {'default'|'skip-link'|'announce'} */
    this.as = 'default';
    /** @type {boolean} */
    this.debug = false;
    /** @type {string} */
    this.status = 'normal';
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  _handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      this.dispatchEvent(
        new CustomEvent('thx-activate', {
          detail: { source: 'keyboard' },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    // Render as anchor for skip link, otherwise span
    if (this.as === 'skip-link') {
      return html`
        <a href="#main" class="visually-hidden" part="base" @keydown=${this._handleKeyDown}>
          <slot>SKIP TO MAIN CONTENT</slot>
        </a>
      `;
    }

    return html`
      <span
        class="visually-hidden"
        part="base"
        role=${this.as === 'announce' ? 'status' : 'none'}
        aria-live=${this.as === 'announce' ? 'polite' : 'off'}
        @keydown=${this._handleKeyDown}
      >
        <slot></slot>
      </span>
    `;
  }
}

customElements.define('thx-visually-hidden', ThxVisuallyHidden);
