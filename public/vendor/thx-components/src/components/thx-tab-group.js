// @ts-check

/**
 * @fileoverview THX 1138 styled tab group component
 * @module thx-tab-group
 */

import { LitElement, html, css } from '../../vendor/lit.js';

// Forward declarations for type checking
/** @typedef {import('./thx-tab.js').ThxTab} ThxTab */
/** @typedef {import('./thx-tab-panel.js').ThxTabPanel} ThxTabPanel */

/**
 * Tab group container for organizing tabbed interfaces
 * THX 1138 style: clinical tab bar with phosphor active states
 * @element thx-tab-group
 */
export class ThxTabGroup extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--neutral-100, #fafafa);
      border: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      box-shadow: var(--inner-shadow-0);
    }

    .tab-nav {
      display: flex;
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      background: rgba(0, 0, 0, 0.02);
      padding: 0 var(--size-3);
      gap: 0;
      overflow-x: auto;
    }

    ::slotted(thx-tab) {
      flex-shrink: 0;
    }

    .tab-panels {
      position: relative;
    }

    ::slotted(thx-tab-panel) {
      display: none;
    }

    ::slotted(thx-tab-panel[active]) {
      display: block;
    }

    /* CRT variant */
    :host([variant='crt']) {
      background: var(--crt-bg, #111);
      border: calc(var(--size-2) + var(--size-1)) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      box-shadow: inset 0 0 var(--size-4) rgba(0, 0, 0, 0.5);
    }

    :host([variant='crt']) .tab-nav {
      background: rgba(0, 0, 0, 0.3);
      border-bottom-color: rgba(166, 200, 225, 0.2);
    }

    :host([variant='crt'])::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(166, 200, 225, 0.04) 2px,
        rgba(166, 200, 225, 0.04) var(--size-1)
      );
      pointer-events: none;
      z-index: var(--layer-2);
    }

    /* Compact variant */
    :host([variant='compact']) {
      border: none;
      box-shadow: none;
      background: transparent;
    }

    :host([variant='compact']) .tab-nav {
      background: transparent;
      border-bottom: var(--border-size-2) solid rgba(0, 0, 0, 0.06);
      padding: 0;
    }

    /* Position variants */
    :host([placement='bottom']) {
      display: flex;
      flex-direction: column-reverse;
    }

    :host([placement='bottom']) .tab-nav {
      border-bottom: none;
      border-top: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
    }

    :host([placement='start']) {
      display: flex;
      flex-direction: row;
    }

    :host([placement='start']) .tab-nav {
      flex-direction: column;
      border-bottom: none;
      border-right: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      padding: var(--size-3) 0;
    }

    :host([placement='end']) {
      display: flex;
      flex-direction: row-reverse;
    }

    :host([placement='end']) .tab-nav {
      flex-direction: column;
      border-bottom: none;
      border-left: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      padding: var(--size-3) 0;
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    activeTab: { type: String, reflect: true, attribute: 'active-tab' },
    variant: { type: String, reflect: true },
    placement: { type: String, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} Currently active tab panel */
    this.activeTab = '';
    /** @type {string} Variant: default, crt, compact */
    this.variant = 'default';
    /** @type {string} Tab placement: top, bottom, start, end */
    this.placement = 'top';
  }

  /**
   * Select a tab by panel ID
   * @param {string} panelId
   * @returns {void}
   */
  selectTab(panelId) {
    this.activeTab = panelId;
    this._updateTabs();

    this.dispatchEvent(
      new CustomEvent('tab-change', {
        bubbles: true,
        composed: true,
        detail: { activeTab: panelId },
      })
    );
  }

  /**
   * Update tab and panel states
   * @returns {void}
   * @private
   */
  _updateTabs() {
    const tabs = this.querySelectorAll('thx-tab');
    const panels = this.querySelectorAll('thx-tab-panel');

    tabs.forEach((tab, index) => {
      const thxTab = /** @type {ThxTab} */ (/** @type {unknown} */ (tab));
      const panelId = thxTab.getAttribute('panel');
      thxTab.active = panelId === this.activeTab;
      if (!thxTab.id) thxTab.id = `thx-tab-${index + 1}`;
      thxTab.setAttribute('aria-controls', panelId || '');
      thxTab.setAttribute('tabindex', thxTab.active && !thxTab.disabled ? '0' : '-1');
    });

    panels.forEach(panel => {
      const thxPanel = /** @type {ThxTabPanel} */ (/** @type {unknown} */ (panel));
      thxPanel.active = thxPanel.id === this.activeTab;
      const tab = Array.from(tabs).find(tab => tab.getAttribute('panel') === thxPanel.id);
      if (tab?.id) thxPanel.setAttribute('aria-labelledby', tab.id);
    });
  }

  /** @returns {ThxTab[]} */
  _getEnabledTabs() {
    return /** @type {ThxTab[]} */ (
      Array.from(this.querySelectorAll('thx-tab')).filter(tab => {
        const thxTab = /** @type {ThxTab} */ (/** @type {unknown} */ (tab));
        return !thxTab.disabled;
      })
    );
  }

  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  _handleKeydown(e) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;

    const tabs = this._getEnabledTabs();
    if (tabs.length === 0) return;

    e.preventDefault();
    const currentIndex = Math.max(
      0,
      tabs.findIndex(tab => tab === document.activeElement || tab.shadowRoot?.activeElement)
    );
    let nextIndex = currentIndex;

    if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = tabs.length - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;

    const nextTab = /** @type {ThxTab} */ (/** @type {unknown} */ (tabs[nextIndex]));
    nextTab.focus();
    if (nextTab.panel) this.selectTab(nextTab.panel);
  }

  /**
   * Handle slot change
   * @returns {void}
   * @private
   */
  _handleSlotChange() {
    if (!this.activeTab) {
      const firstPanel = this.querySelector('thx-tab-panel');
      if (firstPanel?.id) {
        this.selectTab(firstPanel.id);
      }
    } else {
      this._updateTabs();
    }
  }

  /**
   * Lifecycle: when first updated
   * @returns {void}
   */
  firstUpdated() {
    this._handleSlotChange();
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="tab-nav" role="tablist" @keydown="${this._handleKeydown}">
        <slot name="tab" @slotchange="${this._handleSlotChange}"></slot>
      </div>
      <div class="tab-panels">
        <slot @slotchange="${this._handleSlotChange}"></slot>
      </div>
    `;
  }
}

customElements.define('thx-tab-group', ThxTabGroup);
