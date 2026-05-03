// @ts-check

/**
 * @fileoverview THX 1138 styled tooltip component
 * @module thx-tooltip
 * @description A clinical tooltip with CRT-style phosphor glow
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} TooltipState
 * @property {boolean} visible - Whether the tooltip is visible
 * @property {'top'|'bottom'|'left'|'right'} placement - Tooltip placement
 * @property {string} content - Tooltip content text
 * @property {number} delay - Show/hide delay in milliseconds
 */

export class ThxTooltip extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    .tooltip-trigger {
      display: inline-flex;
      cursor: help;
    }

    .tooltip-content {
      position: absolute;
      background: var(--crt-bg-dark, #0a0a0a);
      border: var(--border-size-1) solid var(--atmos-primary, #a6c8e1);
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--atmos-primary, #a6c8e1);
      white-space: nowrap;
      z-index: var(--layer-5);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity var(--duration-quick-2),
        visibility var(--duration-quick-2),
        transform var(--duration-quick-2);
      pointer-events: none;
      box-shadow:
        0 0 var(--size-2) rgba(166, 200, 225, 0.3),
        0 0 var(--size-4) rgba(166, 200, 225, 0.1);
      max-width: 300px;
      white-space: normal;
    }

    .tooltip-content.visible {
      opacity: 1;
      visibility: visible;
    }

    /* CRT scanline effect on tooltip */
    .tooltip-content::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 1px,
        rgba(166, 200, 225, 0.05) 1px,
        rgba(166, 200, 225, 0.05) 2px
      );
      pointer-events: none;
    }

    /* Arrow */
    .tooltip-arrow {
      position: absolute;
      width: var(--size-2);
      height: var(--size-2);
      background: var(--crt-bg-dark, #0a0a0a);
      border: var(--border-size-1) solid var(--atmos-primary, #a6c8e1);
      transform: rotate(45deg);
    }

    /* Top placement - arrow at bottom */
    .tooltip-content.top {
      bottom: calc(100% + var(--size-2));
      left: 50%;
      transform: translateX(-50%) translateY(4px);
    }

    .tooltip-content.top.visible {
      transform: translateX(-50%) translateY(0);
    }

    .tooltip-content.top .tooltip-arrow {
      bottom: -5px;
      left: 50%;
      margin-left: -4px;
      border-top-color: transparent;
      border-left-color: transparent;
    }

    /* Bottom placement - arrow at top */
    .tooltip-content.bottom {
      top: calc(100% + var(--size-2));
      left: 50%;
      transform: translateX(-50%) translateY(-4px);
    }

    .tooltip-content.bottom.visible {
      transform: translateX(-50%) translateY(0);
    }

    .tooltip-content.bottom .tooltip-arrow {
      top: -5px;
      left: 50%;
      margin-left: -4px;
      border-bottom-color: transparent;
      border-right-color: transparent;
    }

    /* Left placement - arrow at right */
    .tooltip-content.left {
      right: calc(100% + var(--size-2));
      top: 50%;
      transform: translateY(-50%) translateX(4px);
    }

    .tooltip-content.left.visible {
      transform: translateY(-50%) translateX(0);
    }

    .tooltip-content.left .tooltip-arrow {
      right: -5px;
      top: 50%;
      margin-top: -4px;
      border-top-color: transparent;
      border-right-color: transparent;
    }

    /* Right placement - arrow at left */
    .tooltip-content.right {
      left: calc(100% + var(--size-2));
      top: 50%;
      transform: translateY(-50%) translateX(-4px);
    }

    .tooltip-content.right.visible {
      transform: translateY(-50%) translateX(0);
    }

    .tooltip-content.right .tooltip-arrow {
      left: -5px;
      top: 50%;
      margin-top: -4px;
      border-bottom-color: transparent;
      border-left-color: transparent;
    }

    /* Warning variant */
    .tooltip-content.warning {
      border-color: var(--accent-warning, #d4aa00);
      color: var(--accent-warning, #d4aa00);
      box-shadow:
        0 0 var(--size-2) rgba(212, 170, 0, 0.3),
        0 0 var(--size-4) rgba(212, 170, 0, 0.1);
    }

    .tooltip-content.warning .tooltip-arrow {
      border-color: var(--accent-warning, #d4aa00);
    }

    /* Error variant */
    .tooltip-content.error {
      border-color: var(--accent-error, #d44000);
      color: var(--accent-error, #d44000);
      box-shadow:
        0 0 var(--size-2) rgba(212, 64, 0, 0.3),
        0 0 var(--size-4) rgba(212, 64, 0, 0.1);
    }

    .tooltip-content.error .tooltip-arrow {
      border-color: var(--accent-error, #d44000);
    }

    /* Label prefix styling */
    .tooltip-label {
      color: var(--atmos-secondary, #707e91);
      margin-right: var(--size-1);
    }

    /* Data value styling */
    .tooltip-value {
      color: var(--atmos-tertiary, #deffff);
    }
  `;

  static properties = {
    content: { type: String },
    placement: { type: String },
    variant: { type: String },
    delay: { type: Number },
    disabled: { type: Boolean },
    html: { type: Boolean },
    label: { type: String },
  };

  constructor() {
    super();
    /** @type {string|undefined} */
    this.content = undefined;
    /** @type {'top'|'bottom'|'left'|'right'} */
    this.placement = 'top';
    /** @type {'default'|'warning'|'error'} */
    this.variant = 'default';
    /** @type {number} */
    this.delay = 100;
    /** @type {boolean} */
    this.disabled = false;
    /** @type {boolean} */
    this.html = false;
    /** @type {string|undefined} */
    this.label = undefined;

    /** @type {boolean} */
    this._visible = false;
    /** @type {number|undefined} */
    this._showTimeout = undefined;
    /** @type {number|undefined} */
    this._hideTimeout = undefined;
    /** @type {string} */
    this._tooltipId = `thx-tooltip-${Math.random().toString(36).slice(2)}`;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._showTimeout);
    clearTimeout(this._hideTimeout);
  }

  /**
   * @param {Event} e
   * @returns {void}
   */
  _handleTriggerSlotChange(e) {
    const slot = /** @type {HTMLSlotElement} */ (e.target);
    const trigger = /** @type {HTMLElement|undefined} */ (slot.assignedElements()[0]);
    if (!trigger || trigger.hasAttribute('aria-describedby')) return;
    trigger.setAttribute('aria-describedby', this._tooltipId);
  }

  /**
   * Shows the tooltip
   * @returns {void}
   */
  _show() {
    if (this.disabled || (!this.content && !this.querySelector('[slot="content"]'))) {
      return;
    }

    clearTimeout(this._hideTimeout);
    this._showTimeout = window.setTimeout(() => {
      this._visible = true;
      this.requestUpdate();
      this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
    }, this.delay);
  }

  /**
   * Hides the tooltip
   * @returns {void}
   */
  _hide() {
    clearTimeout(this._showTimeout);
    this._hideTimeout = window.setTimeout(() => {
      this._visible = false;
      this.requestUpdate();
      this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
    }, 50);
  }

  /**
   * Programmatically shows the tooltip
   * @returns {void}
   */
  show() {
    this._show();
  }

  /**
   * Programmatically hides the tooltip
   * @returns {void}
   */
  hide() {
    this._hide();
  }

  /**
   * Gets the tooltip content
   * @returns {import('lit').TemplateResult|string}
   */
  _getContent() {
    if (this.html && this.content) {
      return html`${{ __html: this.content }}`;
    }
    return this.content || '';
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const tooltipContent = html`
      ${this.label ? html`<span class="tooltip-label">${this.label}:</span>` : ''}
      <slot name="content">${this._getContent()}</slot>
    `;

    return html`
      <span
        class="tooltip-trigger"
        @mouseenter=${this._show}
        @mouseleave=${this._hide}
        @focus=${this._show}
        @blur=${this._hide}
      >
        <slot @slotchange=${this._handleTriggerSlotChange}></slot>
      </span>

      <div
        class="tooltip-content ${this.placement} ${this.variant} ${this._visible ? 'visible' : ''}"
        id="${this._tooltipId}"
        role="tooltip"
        aria-hidden="${!this._visible}"
      >
        <div class="tooltip-arrow"></div>
        ${tooltipContent}
      </div>
    `;
  }
}

customElements.define('thx-tooltip', ThxTooltip);
