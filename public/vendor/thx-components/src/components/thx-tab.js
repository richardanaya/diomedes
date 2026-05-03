// @ts-check

/**
 * @fileoverview THX 1138 styled tab component
 * @module thx-tab
 */

import { LitElement, html, css } from '../../vendor/lit.js';

// Forward declaration for type checking
/** @typedef {import('./thx-tab-group.js').ThxTabGroup} ThxTabGroup */

/**
 * Individual tab trigger component
 * THX 1138 style: phosphor glow on active state
 * @element thx-tab
 */
export class ThxTab extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    .tab {
      display: flex;
      align-items: center;
      gap: var(--size-2);
      padding: calc(var(--size-2) + var(--size-1)) var(--size-4);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-600, #666);
      background: transparent;
      border: none;
      border-bottom: var(--border-size-2) solid transparent;
      cursor: pointer;
      transition: all var(--duration-quick-2);
      white-space: nowrap;
      position: relative;
    }

    .tab:hover {
      color: var(--atmos-primary, #a6c8e1);
      background: rgba(166, 200, 225, 0.05);
    }

    .tab.active,
    :host([active]) .tab {
      color: var(--atmos-primary, #a6c8e1);
      border-bottom-color: var(--atmos-primary, #a6c8e1);
    }

    .tab.active::after,
    :host([active]) .tab::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.6);
    }

    .tab.disabled,
    :host([disabled]) .tab {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* CRT variant */
    :host([variant='crt']) .tab {
      color: var(--atmos-secondary, #707e91);
    }

    :host([variant='crt']) .tab:hover {
      color: var(--atmos-tertiary, #deffff);
      background: rgba(166, 200, 225, 0.1);
    }

    :host([variant='crt']) .tab.active,
    :host([variant='crt']):host([active]) .tab {
      color: var(--atmos-tertiary, #deffff);
      text-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.8);
    }

    /* Indicator badge */
    .indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--size-3);
      height: var(--size-3);
      padding: 0 var(--size-1);
      font-size: var(--font-size-00);
      background: var(--atmos-secondary, #707e91);
      color: var(--neutral-100, #fafafa);
    }

    .indicator.warning {
      background: var(--accent-warning, #d4aa00);
      color: var(--neutral-800, #333);
    }

    .indicator.error {
      background: var(--accent-error, #d44000);
      color: var(--neutral-100, #fafafa);
    }

    /* Close button */
    .close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--size-3);
      height: var(--size-3);
      margin-left: var(--size-1);
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .close:hover {
      color: var(--accent-error, #d44000);
    }

    /* Icon slot */
    ::slotted([slot='icon']) {
      width: var(--size-3);
      height: var(--size-3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    panel: { type: String, reflect: true },
    active: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    closable: { type: Boolean, reflect: true },
    indicator: { type: String },
    variant: { type: String, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} Associated panel ID */
    this.panel = '';
    /** @type {boolean} Whether this tab is active */
    this.active = false;
    /** @type {boolean} Whether this tab is disabled */
    this.disabled = false;
    /** @type {boolean} Whether tab is closable */
    this.closable = false;
    /** @type {string} Optional indicator badge */
    this.indicator = '';
    /** @type {string} Variant inherited from parent */
    this.variant = 'default';
  }

  focus() {
    this.updateComplete.then(() => {
      const button = /** @type {HTMLElement|null} */ (this.renderRoot.querySelector('button'));
      button?.focus();
    });
  }

  /**
   * Handle tab click
   * @param {MouseEvent} e
   * @returns {void}
   * @private
   */
  _handleClick(e) {
    if (this.disabled) return;

    // Find parent tab group and select this panel
    const groupEl = this.closest('thx-tab-group');
    if (groupEl && this.panel) {
      const group = /** @type {ThxTabGroup} */ (/** @type {unknown} */ (groupEl));
      group.selectTab(this.panel);
    }

    this.dispatchEvent(
      new CustomEvent('tab-click', {
        bubbles: true,
        composed: true,
        detail: { panel: this.panel },
      })
    );
  }

  /**
   * Handle close click
   * @param {MouseEvent} e
   * @returns {void}
   * @private
   */
  _handleClose(e) {
    e.stopPropagation();

    this.dispatchEvent(
      new CustomEvent('tab-close', {
        bubbles: true,
        composed: true,
        detail: { panel: this.panel },
      })
    );
  }

  /**
   * Get indicator classes
   * @returns {string}
   * @private
   */
  _getIndicatorClass() {
    if (this.indicator === '!') return 'indicator error';
    if (this.indicator?.includes('WARN')) return 'indicator warning';
    return 'indicator';
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = {
      tab: true,
      active: this.active,
      disabled: this.disabled,
    };

    const classString = Object.entries(classes)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');

    const tabIndex = this.getAttribute('tabindex') || (this.active && !this.disabled ? '0' : '-1');

    return html`
      <button
        class="${classString}"
        role="tab"
        tabindex="${this.disabled ? '-1' : tabIndex}"
        aria-selected="${this.active ? 'true' : 'false'}"
        aria-controls="${this.panel}"
        @click="${this._handleClick}"
      >
        <slot name="icon"></slot>
        <span class="label"><slot></slot></span>
        ${this.indicator
          ? html`<span class="${this._getIndicatorClass()}">${this.indicator}</span>`
          : ''}
        ${this.closable
          ? html`
              <span class="close" @click="${this._handleClose}" aria-label="Close tab">✕</span>
            `
          : ''}
      </button>
    `;
  }
}

customElements.define('thx-tab', ThxTab);
