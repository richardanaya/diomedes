// @ts-check

/**
 * @fileoverview THX 1138 styled include component for external content
 * @module thx-include
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} IncludeConfig
 * @property {string} src - URL to fetch content from
 * @property {'html'|'text'|'json'} [mode='html'] - Parsing mode
 * @property {boolean} [allowScripts=false] - Whether to allow script execution
 * @property {number} [refreshInterval=0] - Auto-refresh interval in ms (0 = disabled)
 */

/**
 * THX 1138 styled include component.
 * Fetches and displays external HTML content with clinical styling.
 *
 * @extends {LitElement}
 */
export class ThxInclude extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .include-container {
      position: relative;
    }

    .include-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--size-5);
      color: var(--neutral-600, #666);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-4);
      text-transform: uppercase;
    }

    .include-loading::before {
      content: '';
      width: calc(var(--size-2) + var(--size-1));
      height: calc(var(--size-2) + var(--size-1));
      border: var(--border-size-2) solid var(--neutral-200, #e0e0e0);
      border-top-color: var(--atmos-primary, #a6c8e1);
      border-radius: var(--radius-round);
      margin-right: var(--size-2);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .include-error {
      padding: var(--size-3) var(--size-4);
      background: rgba(212, 64, 0, 0.1);
      border-left: calc(var(--border-size-1) + var(--border-size-2)) solid
        var(--accent-error, #d44000);
      color: var(--accent-error, #d44000);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
    }

    .include-error::before {
      content: 'ERR // ';
      font-weight: var(--font-weight-6);
    }

    .include-content {
      font-size: var(--font-size-0);
      line-height: var(--font-lineheight-4);
    }

    /* CRT variant */
    :host([variant='crt']) .include-container {
      background: var(--crt-bg, #111);
      border: var(--border-size-2) solid var(--crt-border, #2a2a2a);
      padding: var(--size-3);
    }

    :host([variant='crt']) .include-content {
      color: var(--atmos-primary, #a6c8e1);
    }

    /* Panel variant */
    :host([variant='panel']) .include-container {
      background: var(--neutral-100, #fafafa);
      padding: var(--size-5);
      box-shadow: var(--inner-shadow-0);
    }

    .include-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: calc(var(--size-2) + var(--size-1));
      margin-bottom: calc(var(--size-2) + var(--size-1));
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
    }

    .include-label {
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      letter-spacing: var(--font-letterspacing-5);
      text-transform: uppercase;
    }

    .include-refresh {
      font-size: var(--font-size-0);
      color: var(--atmos-secondary, #707e91);
      cursor: pointer;
      background: none;
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
      padding: var(--size-1) var(--size-2);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
    }

    .include-refresh:hover {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
      border-color: var(--atmos-primary, #a6c8e1);
    }

    :host([variant='crt']) .include-header {
      border-bottom-color: rgba(166, 200, 225, 0.2);
    }

    :host([variant='crt']) .include-label {
      color: var(--atmos-secondary, #707e91);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** URL to fetch content from */
      src: { type: String },
      /** Parsing mode: html, text, json */
      mode: { type: String },
      /** Whether to allow script execution */
      allowScripts: { type: Boolean, attribute: 'allow-scripts' },
      /** Auto-refresh interval in ms */
      refreshInterval: { type: Number, attribute: 'refresh-interval' },
      /** Show refresh button */
      showRefresh: { type: Boolean, attribute: 'show-refresh' },
      /** Loading state */
      _loading: { type: Boolean, state: true },
      /** Error message */
      _error: { type: String, state: true },
      /** Fetched content */
      _content: { type: String, state: true },
    };
  }

  constructor() {
    super();
    /** @type {string} */
    this.src = '';
    /** @type {'html'|'text'|'json'} */
    this.mode = 'html';
    /** @type {boolean} */
    this.allowScripts = false;
    /** @type {number} */
    this.refreshInterval = 0;
    /** @type {boolean} */
    this.showRefresh = false;
    /** @type {boolean} */
    this._loading = false;
    /** @type {string|null} */
    this._error = null;
    /** @type {string} */
    this._content = '';
    /** @type {number|null} */
    this._refreshTimer = null;
  }

  /**
   * @param {import('lit').PropertyValues} changedProperties
   * @returns {void}
   */
  updated(changedProperties) {
    if (changedProperties.has('src') && this.src) {
      this.fetchContent();
    }
    if (changedProperties.has('refreshInterval')) {
      this._setupRefreshTimer();
    }
  }

  /**
   * @returns {void}
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
    }
  }

  /**
   * Sets up the auto-refresh timer.
   * @returns {void}
   */
  _setupRefreshTimer() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    if (this.refreshInterval > 0 && this.src) {
      this._refreshTimer = window.setInterval(() => {
        this.fetchContent();
      }, this.refreshInterval);
    }
  }

  /**
   * Fetches content from the src URL.
   * @returns {Promise<void>}
   */
  async fetchContent() {
    if (!this.src) {
      this._error = 'NO SOURCE SPECIFIED';
      return;
    }

    this._loading = true;
    this._error = null;

    try {
      const response = await fetch(this.src);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.mode === 'json') {
        const data = await response.json();
        this._content = JSON.stringify(data, null, 2);
      } else {
        this._content = await response.text();
      }
    } catch (/** @type {any} */ error) {
      this._error = error?.message || 'FETCH FAILED';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Removes obvious script execution hooks when script execution is disabled.
   * This is not sanitization; html mode still treats fetched HTML as trusted content.
   * @returns {string}
   */
  get trustedHtmlContent() {
    if (this.allowScripts) {
      return this._content;
    }

    const template = document.createElement('template');
    template.innerHTML = this._content;

    template.content.querySelectorAll('script').forEach(script => script.remove());
    template.content.querySelectorAll('*').forEach(element => {
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || value.startsWith('javascript:')) {
          element.removeAttribute(attribute.name);
        }
      }
    });

    return template.innerHTML;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="include-container" part="base">
        ${this.showRefresh || this.refreshInterval
          ? html`
              <div class="include-header">
                <span class="include-label" part="label">${this.src || 'NO SOURCE'}</span>
                <button class="include-refresh" @click=${this.fetchContent} part="refresh">
                  REFRESH
                </button>
              </div>
            `
          : null}
        ${this._loading
          ? html`<div class="include-loading" part="loading">LOADING</div>`
          : this._error
            ? html`<div class="include-error" part="error">${this._error}</div>`
            : html`
                <div class="include-content" part="content">
                  ${this.mode === 'text' || this.mode === 'json'
                    ? html`<pre>${this._content}</pre>`
                    : html`<div .innerHTML=${this.trustedHtmlContent}></div>`}
                </div>
              `}
      </div>
    `;
  }
}

customElements.define('thx-include', ThxInclude);
