// @ts-check

/**
 * @fileoverview THX 1138 styled resize observer component
 * @module thx-resize-observer
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} SizeEntry
 * @property {number} width - Element width in pixels
 * @property {number} height - Element height in pixels
 * @property {number} timestamp - When the measurement was taken
 * @property {DOMRectReadOnly} contentRect - Full content rectangle
 */

/**
 * THX 1138 styled resize observer component.
 * Observes element size changes and displays dimensions in a clinical format.
 *
 * @extends {LitElement}
 */
export class ThxResizeObserver extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .observer-container {
      position: relative;
    }

    /* CRT Monitor display for dimensions */
    .dimension-display {
      background: var(--crt-bg, #111);
      border: calc(var(--size-2) + var(--size-1)) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 0 var(--size-4) rgba(0, 0, 0, 0.5);
    }

    .dimension-display::before {
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

    .dimension-display::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
      pointer-events: none;
      z-index: calc(var(--layer-2) + 1);
    }

    .display-label {
      position: absolute;
      top: var(--size-1);
      right: var(--size-2);
      font-size: var(--font-size-0);
      color: #666;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      z-index: calc(var(--layer-2) + 5);
    }

    .display-content {
      position: relative;
      z-index: var(--layer-1);
      padding: var(--size-4);
    }

    /* Dimension readout */
    .dimension-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: calc(var(--size-2) + var(--size-1));
    }

    .dimension-cell {
      display: flex;
      flex-direction: column;
      gap: var(--size-1);
      padding: calc(var(--size-2) + var(--size-1));
      background: rgba(166, 200, 225, 0.05);
      border: var(--border-size-1) solid rgba(166, 200, 225, 0.1);
    }

    .dimension-label {
      font-size: var(--font-size-0);
      color: var(--atmos-secondary, #707e91);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
    }

    .dimension-value {
      font-size: var(--font-size-3);
      color: var(--atmos-primary, #a6c8e1);
      font-weight: var(--font-weight-6);
      text-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.5);
    }

    .dimension-unit {
      font-size: var(--font-size-0);
      color: var(--atmos-secondary, #707e91);
      margin-left: var(--size-1);
    }

    /* Additional measurements */
    .measurements-detail {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--size-2);
      margin-top: calc(var(--size-2) + var(--size-1));
      padding-top: calc(var(--size-2) + var(--size-1));
      border-top: var(--border-size-1) solid rgba(166, 200, 225, 0.1);
    }

    .measurement-item {
      text-align: center;
    }

    .measurement-item label {
      display: block;
      font-size: var(--font-size-00);
      color: var(--atmos-secondary, #707e91);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-3);
      margin-bottom: var(--size-1);
    }

    .measurement-item value {
      display: block;
      font-size: var(--font-size-0);
      color: var(--atmos-tertiary, #deffff);
    }

    /* Status bar */
    .status-bar {
      display: flex;
      align-items: center;
      gap: calc(var(--size-2) + var(--size-1));
      padding: var(--size-2) calc(var(--size-2) + var(--size-1));
      background: rgba(0, 0, 0, 0.3);
      border-bottom: var(--border-size-1) solid rgba(166, 200, 225, 0.1);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--atmos-secondary, #707e91);
    }

    .status-led {
      width: var(--size-2);
      height: var(--size-2);
      background: #333;
      border: var(--border-size-1) solid #444;
    }

    .status-led.active {
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.8);
    }

    .aspect-ratio {
      margin-left: auto;
      font-size: var(--font-size-0);
    }

    /* Content slot wrapper */
    .content-slot {
      margin-top: var(--size-3);
      padding: var(--size-3);
      background: var(--neutral-100, #fafafa);
      box-shadow: var(--inner-shadow-0);
      min-height: var(--size-11);
      resize: both;
      overflow: hidden;
    }

    :host([resizable]) .content-slot {
      resize: both;
    }

    .content-label {
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      letter-spacing: var(--font-letterspacing-5);
      text-transform: uppercase;
      margin-bottom: calc(var(--size-2) + var(--size-1));
      padding-bottom: var(--size-2);
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
    }

    /* Empty state */
    .no-content {
      text-align: center;
      padding: var(--size-5);
      color: var(--neutral-600, #666);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-4);
      text-transform: uppercase;
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Whether the observer is active */
      active: { type: Boolean },
      /** Whether the content slot is resizable */
      resizable: { type: Boolean },
      /** Show detailed measurements */
      detailed: { type: Boolean },
      /** Current size entry */
      _size: { type: Object, state: true },
      /** History of size changes */
      _history: { type: Array, state: true },
    };
  }

  constructor() {
    super();
    /** @type {boolean} */
    this.active = false;
    /** @type {boolean} */
    this.resizable = true;
    /** @type {boolean} */
    this.detailed = false;
    /** @type {SizeEntry|null} */
    this._size = null;
    /** @type {SizeEntry[]} */
    this._history = [];
    /** @type {ResizeObserver|null} */
    this._observer = null;
    /** @type {HTMLElement|null} */
    this._targetElement = null;
  }

  /**
   * @param {import('lit').PropertyValues} changedProperties
   * @returns {void}
   */
  updated(changedProperties) {
    if (changedProperties.has('active')) {
      if (this.active) {
        this.startObserving();
      } else {
        this.stopObserving();
      }
    }
  }

  /**
   * @returns {void}
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopObserving();
  }

  /**
   * Starts observing the target element.
   * @returns {void}
   */
  startObserving() {
    this.stopObserving();

    const target = this.shadowRoot?.querySelector('.content-slot');
    if (!(target instanceof HTMLElement) || !window.ResizeObserver) return;
    this._targetElement = target;

    this._observer = new ResizeObserver(entries => {
      this._handleResize(entries);
    });

    this._observer.observe(this._targetElement);

    // Get initial size
    const rect = this._targetElement.getBoundingClientRect();
    this._recordSize(rect);
  }

  /**
   * Stops observing.
   * @returns {void}
   */
  stopObserving() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  /**
   * Handles resize entries.
   * @param {ResizeObserverEntry[]} entries
   * @returns {void}
   */
  _handleResize(entries) {
    for (const entry of entries) {
      const contentRect = entry.contentRect || entry.target.getBoundingClientRect();
      this._recordSize(contentRect);
    }
  }

  /**
   * Records a size measurement.
   * @param {DOMRectReadOnly} rect
   * @returns {void}
   */
  _recordSize(rect) {
    /** @type {SizeEntry} */
    const entry = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      timestamp: Date.now(),
      contentRect: rect,
    };

    this._size = entry;
    this._history = [...this._history.slice(-9), entry]; // Keep last 10
  }

  /**
   * Calculates aspect ratio.
   * @returns {string}
   */
  get _aspectRatio() {
    if (!this._size || this._size.height === 0) return 'N/A';
    const ratio = this._size.width / this._size.height;
    return ratio.toFixed(2);
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="observer-container" part="base">
        <div class="dimension-display" part="display">
          <span class="display-label">DIM-MON-01</span>

          <div class="status-bar">
            <div class="status-led ${this.active ? 'active' : ''}"></div>
            <span>${this.active ? 'MONITORING' : 'STANDBY'}</span>
            ${this._size
              ? html`
                  <span>|</span>
                  <span>W: ${this._size.width}PX</span>
                  <span>H: ${this._size.height}PX</span>
                  <span class="aspect-ratio">AR: ${this._aspectRatio}</span>
                `
              : null}
          </div>

          <div class="display-content" part="content">
            ${this._size
              ? html`
                  <div class="dimension-grid">
                    <div class="dimension-cell">
                      <span class="dimension-label">WIDTH</span>
                      <span class="dimension-value">
                        ${this._size.width}
                        <span class="dimension-unit">PX</span>
                      </span>
                    </div>
                    <div class="dimension-cell">
                      <span class="dimension-label">HEIGHT</span>
                      <span class="dimension-value">
                        ${this._size.height}
                        <span class="dimension-unit">PX</span>
                      </span>
                    </div>
                  </div>

                  ${this.detailed && this._size.contentRect
                    ? html`
                        <div class="measurements-detail">
                          <div class="measurement-item">
                            <label>TOP</label>
                            <value>${Math.round(this._size.contentRect.top)}</value>
                          </div>
                          <div class="measurement-item">
                            <label>LEFT</label>
                            <value>${Math.round(this._size.contentRect.left)}</value>
                          </div>
                          <div class="measurement-item">
                            <label>BOTTOM</label>
                            <value>${Math.round(this._size.contentRect.bottom)}</value>
                          </div>
                          <div class="measurement-item">
                            <label>RIGHT</label>
                            <value>${Math.round(this._size.contentRect.right)}</value>
                          </div>
                        </div>
                      `
                    : null}
                `
              : html`<div class="no-content">NO MEASUREMENT DATA</div>`}
          </div>
        </div>

        <div class="content-slot" ?resizable=${this.resizable}>
          <div class="content-label">// OBSERVED CONTENT //</div>
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('thx-resize-observer', ThxResizeObserver);
