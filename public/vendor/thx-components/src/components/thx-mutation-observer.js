// @ts-check

/**
 * @fileoverview THX 1138 styled mutation observer component
 * @module thx-mutation-observer
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} MutationRecordInfo
 * @property {string} type - The type of mutation
 * @property {string} target - The target element description
 * @property {number} timestamp - When the mutation occurred
 * @property {string} [attributeName] - The attribute that changed
 * @property {string} [oldValue] - The old attribute value
 */

/**
 * THX 1138 styled mutation observer component.
 * Observes DOM mutations in a child element and displays them in a clinical log format.
 *
 * @extends {LitElement}
 */
export class ThxMutationObserver extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .observer-container {
      position: relative;
    }

    /* CRT Monitor display for mutation log */
    .observer-log {
      background: var(--crt-bg, #111);
      border: calc(var(--size-2) + var(--size-1)) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 0 var(--size-4) rgba(0, 0, 0, 0.5);
    }

    .observer-log::before {
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

    .observer-log::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
      pointer-events: none;
      z-index: calc(var(--layer-2) + 1);
    }

    .log-label {
      position: absolute;
      top: var(--size-1);
      right: var(--size-2);
      font-size: var(--font-size-0);
      color: #666;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      z-index: calc(var(--layer-2) + 5);
    }

    .log-content {
      position: relative;
      z-index: var(--layer-1);
      padding: var(--size-5);
      max-height: 300px;
      overflow-y: auto;
    }

    /* Mutation entries */
    .mutation-entry {
      display: flex;
      gap: calc(var(--size-2) + var(--size-1));
      padding: var(--size-1) 0;
      font-size: var(--font-size-0);
      border-bottom: var(--border-size-1) solid rgba(166, 200, 225, 0.1);
      color: var(--atmos-primary, #a6c8e1);
    }

    .mutation-entry:last-child {
      border-bottom: none;
    }

    .mutation-time {
      color: var(--atmos-secondary, #707e91);
      flex-shrink: 0;
    }

    .mutation-type {
      color: var(--atmos-tertiary, #deffff);
      text-transform: uppercase;
      flex-shrink: 0;
      width: 60px;
    }

    .mutation-type.attr {
      color: var(--accent-warning, #d4aa00);
    }

    .mutation-type.child {
      color: var(--atmos-primary, #a6c8e1);
    }

    .mutation-type.data {
      color: var(--atmos-tertiary, #deffff);
    }

    .mutation-details {
      color: #888;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Status indicators */
    .observer-status {
      display: flex;
      align-items: center;
      gap: var(--size-2);
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

    .observer-controls {
      display: flex;
      gap: var(--size-2);
      margin-left: auto;
    }

    .observer-btn {
      background: transparent;
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
      color: var(--atmos-secondary, #707e91);
      padding: var(--size-1) var(--size-2);
      font-size: var(--font-size-00);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      cursor: pointer;
      font-family: inherit;
    }

    .observer-btn:hover {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
      border-color: var(--atmos-primary, #a6c8e1);
    }

    /* Empty state */
    .log-empty {
      text-align: center;
      padding: var(--size-7);
      color: var(--atmos-secondary, #707e91);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-4);
    }

    /* Content slot wrapper */
    .content-slot {
      margin-top: var(--size-3);
      padding: var(--size-3);
      background: var(--neutral-100, #fafafa);
      box-shadow: var(--inner-shadow-0);
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
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Whether the observer is active */
      active: { type: Boolean },
      /** Observe attribute changes */
      observeAttributes: { type: Boolean, attribute: 'observe-attributes' },
      /** Observe child list changes */
      observeChildList: { type: Boolean, attribute: 'observe-child-list' },
      /** Observe character data changes */
      observeCharacterData: { type: Boolean, attribute: 'observe-character-data' },
      /** Comma-separated list of attributes to observe */
      attributeFilter: { type: String, attribute: 'attribute-filter' },
      /** Maximum number of entries to keep */
      maxEntries: { type: Number, attribute: 'max-entries' },
      /** Log of mutations */
      _mutations: { type: Array, state: true },
    };
  }

  constructor() {
    super();
    /** @type {boolean} */
    this.active = false;
    /** @type {boolean} */
    this.observeAttributes = true;
    /** @type {boolean} */
    this.observeChildList = true;
    /** @type {boolean} */
    this.observeCharacterData = false;
    /** @type {string} */
    this.attributeFilter = '';
    /** @type {number} */
    this.maxEntries = 100;
    /** @type {MutationRecordInfo[]} */
    this._mutations = [];
    /** @type {MutationObserver|null} */
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

    // Find the target element (the slot content wrapper or a designated target)
    this._targetElement = this.shadowRoot?.querySelector('.content-slot') || this;

    if (!this._targetElement || !this.shadowRoot) return;

    const options = {
      attributes: this.observeAttributes,
      childList: this.observeChildList,
      characterData: this.observeCharacterData,
      subtree: true,
    };

    if (this.attributeFilter) {
      const filters = this.attributeFilter.split(',').map(s => s.trim());
      if (filters.length > 0) {
        // @ts-ignore - attributeFilter is valid
        options.attributeFilter = filters;
      }
    }

    this._observer = new MutationObserver(mutations => {
      this._handleMutations(mutations);
    });

    this._observer.observe(this._targetElement, options);
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
   * Handles mutation records.
   * @param {MutationRecord[]} mutations
   * @returns {void}
   */
  _handleMutations(mutations) {
    const timestamp = Date.now();

    /** @type {MutationRecordInfo[]} */
    const newEntries = mutations.map(mutation => {
      /** @type {MutationRecordInfo} */
      const entry = {
        type: mutation.type,
        target: this._describeTarget(mutation.target),
        timestamp,
      };

      if (mutation.type === 'attributes') {
        entry.attributeName = mutation.attributeName || undefined;
        entry.oldValue = mutation.oldValue || undefined;
      }

      return entry;
    });

    this._mutations = [...this._mutations, ...newEntries].slice(-this.maxEntries);
  }

  /**
   * Describes a target node.
   * @param {Node} target
   * @returns {string}
   */
  _describeTarget(target) {
    if (target instanceof Element) {
      const tag = target.tagName.toLowerCase();
      const id = target.id ? `#${target.id}` : '';
      const cls =
        target.className && typeof target.className === 'string'
          ? `.${target.className.split(' ').join('.')}`
          : '';
      return `${tag}${id}${cls}`.slice(0, 40);
    }
    return target.nodeName.toLowerCase();
  }

  /**
   * Formats a timestamp.
   * @param {number} timestamp
   * @returns {string}
   */
  _formatTime(timestamp) {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  /**
   * Clears the mutation log.
   * @returns {void}
   */
  clearLog() {
    this._mutations = [];
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="observer-container" part="base">
        <div class="observer-log" part="log">
          <span class="log-label">MUT-LOG-01</span>

          <div class="observer-status">
            <div class="status-led ${this.active ? 'active' : ''}"></div>
            <span>${this.active ? 'OBSERVING' : 'STANDBY'}</span>
            <span>|</span>
            <span>ENTRIES: ${this._mutations.length}</span>
            <div class="observer-controls">
              <button class="observer-btn" @click=${() => (this.active = !this.active)}>
                ${this.active ? 'STOP' : 'START'}
              </button>
              <button class="observer-btn" @click=${this.clearLog}>CLEAR</button>
            </div>
          </div>

          <div class="log-content" part="content">
            ${this._mutations.length === 0
              ? html`<div class="log-empty">NO MUTATIONS DETECTED</div>`
              : this._mutations.map(
                  mutation => html`
                    <div class="mutation-entry" part="entry">
                      <span class="mutation-time">${this._formatTime(mutation.timestamp)}</span>
                      <span class="mutation-type ${mutation.type.slice(0, 4)}">
                        ${mutation.type.slice(0, 4)}
                      </span>
                      <span class="mutation-details">
                        ${mutation.attributeName
                          ? `${mutation.attributeName}: ${mutation.oldValue || 'null'} → ...`
                          : mutation.target}
                      </span>
                    </div>
                  `
                )}
          </div>
        </div>

        <div class="content-slot">
          <div class="content-label">// OBSERVED CONTENT //</div>
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('thx-mutation-observer', ThxMutationObserver);
