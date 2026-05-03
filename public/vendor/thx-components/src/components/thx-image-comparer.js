// @ts-check

/**
 * @fileoverview THX 1138 styled before/after image comparison component
 * @module thx-image-comparer
 * @description A clinical image comparison tool with CRT-style presentation
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} ImageComparerState
 * @property {number} position - Slider position (0-100)
 * @property {boolean} dragging - Whether the user is currently dragging
 */

export class ThxImageComparer extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
    }

    .comparer-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--crt-bg, #111);
      border: var(--size-2) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      box-shadow: inset 0 0 var(--size-4) rgba(0, 0, 0, 0.5);
    }

    /* CRT scanline effect */
    .comparer-container::before {
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
      z-index: 20;
    }

    /* Vignette effect */
    .comparer-container::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
      pointer-events: none;
      z-index: 21;
    }

    .image-base {
      display: block;
      width: 100%;
      height: auto;
      filter: grayscale(20%) contrast(1.1);
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      overflow: hidden;
      clip-path: inset(0 calc(100% - var(--position, 50%)) 0 0);
    }

    .image-overlay img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: grayscale(20%) contrast(1.1);
    }

    .divider {
      position: absolute;
      top: 0;
      bottom: 0;
      /* Handle is var(--size-7) wide; clamp keeps it fully visible at extremes */
      left: clamp(calc(var(--size-7) / 2), var(--position, 50%), calc(100% - var(--size-7) / 2));
      width: 2px;
      background: var(--atmos-primary, #a6c8e1);
      cursor: ew-resize;
      z-index: calc(var(--layer-2) + 5);
      box-shadow:
        0 0 var(--size-2) rgba(166, 200, 225, 0.8),
        0 0 var(--size-4) rgba(166, 200, 225, 0.4);
    }

    .divider::before,
    .divider::after {
      content: '';
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-style: solid;
    }

    .divider::before {
      top: calc(var(--size-2) + var(--size-1));
      border-width: var(--size-2) var(--size-2) var(--size-2) 0;
      border-color: transparent var(--atmos-primary, #a6c8e1) transparent transparent;
    }

    .divider::after {
      bottom: calc(var(--size-2) + var(--size-1));
      border-width: var(--size-2) 0 var(--size-2) var(--size-2);
      border-color: transparent transparent transparent var(--atmos-primary, #a6c8e1);
    }

    .divider-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: var(--size-7);
      height: var(--size-7);
      background: var(--crt-bg, #111);
      border: var(--border-size-2) solid var(--atmos-primary, #a6c8e1);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 16;
      box-shadow: 0 0 15px rgba(166, 200, 225, 0.5);
    }

    .divider-handle-icon {
      color: var(--atmos-primary, #a6c8e1);
      font-size: var(--font-size-0);
      font-family: var(--font-mono, 'Courier New', monospace);
      letter-spacing: -2px;
    }

    .labels {
      position: absolute;
      top: var(--size-3);
      left: var(--size-3);
      right: var(--size-3);
      display: flex;
      justify-content: space-between;
      z-index: calc(var(--layer-2) + 5);
      pointer-events: none;
    }

    .label {
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-00);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      padding: var(--size-1) var(--size-2);
      background: rgba(17, 17, 17, 0.8);
      color: var(--atmos-primary, #a6c8e1);
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
    }

    .label-after {
      color: var(--atmos-tertiary, #deffff);
      border-color: var(--atmos-primary, #a6c8e1);
    }

    .status-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      background: rgba(17, 17, 17, 0.9);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: calc(var(--layer-2) + 5);
      font-family: var(--font-mono, 'Courier New', monospace);
      font-size: var(--font-size-00);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--atmos-secondary, #707e91);
    }

    .status-value {
      color: var(--atmos-primary, #a6c8e1);
    }

    /* Hover states */
    .comparer-container:hover .divider {
      box-shadow:
        0 0 15px rgba(166, 200, 225, 1),
        0 0 30px rgba(166, 200, 225, 0.6);
    }

    .comparer-container:hover .divider-handle {
      box-shadow: 0 0 var(--size-4) rgba(166, 200, 225, 0.8);
    }
  `;

  static properties = {
    beforeSrc: { type: String, attribute: 'before-src' },
    afterSrc: { type: String, attribute: 'after-src' },
    beforeLabel: { type: String, attribute: 'before-label' },
    afterLabel: { type: String, attribute: 'after-label' },
    position: { type: Number },
    height: { type: String },
    showLabels: { type: Boolean, attribute: 'show-labels' },
    showStatus: { type: Boolean, attribute: 'show-status' },
  };

  constructor() {
    super();
    /** @type {string|undefined} */
    this.beforeSrc = undefined;
    /** @type {string|undefined} */
    this.afterSrc = undefined;
    /** @type {string} */
    this.beforeLabel = 'BEFORE';
    /** @type {string} */
    this.afterLabel = 'AFTER';
    /** @type {number} */
    this.position = 50;
    /** @type {string} */
    this.height = '300px';

    // Apply default height to host if user hasn't set one via inline style
    if (!this.style.height) {
      this.style.height = this.height;
    }
    /** @type {boolean} */
    this.showLabels = true;
    /** @type {boolean} */
    this.showStatus = true;

    /** @type {boolean} */
    this._dragging = false;

    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
    document.addEventListener('touchmove', this._handleMouseMove, { passive: false });
    document.addEventListener('touchend', this._handleMouseUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
    document.removeEventListener('touchmove', this._handleMouseMove);
    document.removeEventListener('touchend', this._handleMouseUp);
  }

  /**
   * Updates the slider position
   * @param {number} clientX - Mouse/touch clientX
   * @returns {void}
   */
  _updatePosition(clientX) {
    const rect = this.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    this.position = Math.round(percentage);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @param {number} position
   * @returns {void}
   */
  _setPosition(position) {
    this.position = Math.max(0, Math.min(100, Math.round(position)));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  _handleKeydown(e) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const step = e.shiftKey || e.key === 'PageUp' || e.key === 'PageDown' ? 10 : 1;
    if (e.key === 'Home') this._setPosition(0);
    else if (e.key === 'End') this._setPosition(100);
    else if (e.key === 'ArrowRight' || e.key === 'PageUp') this._setPosition(this.position + step);
    else this._setPosition(this.position - step);
  }

  /**
   * Handles mouse/touch down on divider
   * @param {MouseEvent|TouchEvent} e - Event
   * @returns {void}
   */
  _handleStart(e) {
    e.preventDefault();
    this._dragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    this._updatePosition(clientX);
  }

  /**
   * Handles mouse/touch move
   * @param {MouseEvent|TouchEvent} e - Event
   * @returns {void}
   */
  _handleMouseMove(e) {
    if (this._dragging) {
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      this._updatePosition(clientX);
    }
  }

  /**
   * Handles mouse/touch up
   * @returns {void}
   */
  _handleMouseUp() {
    if (this._dragging) {
      this._dragging = false;
      this.dispatchEvent(
        new CustomEvent('changeend', {
          detail: { position: this.position },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Handles click on container to jump
   * @param {MouseEvent} e - Click event
   * @returns {void}
   */
  _handleContainerClick(e) {
    if (!this._dragging) {
      this._updatePosition(e.clientX);
    }
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const positionStyle = `--position: ${this.position}%`;

    return html`
      <div class="comparer-container" style="${positionStyle}" @click=${this._handleContainerClick}>
        ${this.showLabels
          ? html`
              <div class="labels">
                <span class="label">${this.beforeLabel}</span>
                <span class="label label-after">${this.afterLabel}</span>
              </div>
            `
          : ''}

        <img
          class="image-base"
          src="${this.beforeSrc || ''}"
          alt="${this.beforeLabel}"
          style="height: 100%; object-fit: cover;"
        />

        <div class="image-overlay">
          <img src="${this.afterSrc || ''}" alt="${this.afterLabel}" />
        </div>

        <div
          class="divider"
          @mousedown=${this._handleStart}
          @touchstart=${this._handleStart}
          role="slider"
          aria-label="Image comparison slider"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${this.position}"
          aria-valuetext="${this.position}%"
          tabindex="0"
          @keydown=${this._handleKeydown}
        >
          <div class="divider-handle">
            <span class="divider-handle-icon">◀ ▶</span>
          </div>
        </div>

        ${this.showStatus
          ? html`
              <div class="status-bar">
                <span>ANALYSIS MODE: COMPARE</span>
                <span class="status-value"
                  >OFFSET: ${this.position.toString().padStart(3, '0')}%</span
                >
              </div>
            `
          : ''}
      </div>
    `;
  }
}

customElements.define('thx-image-comparer', ThxImageComparer);
