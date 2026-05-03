// @ts-check

/**
 * @fileoverview A custom Lit-based web component with TypeScript JSDoc annotations.
 * @module my-component
 */

import { LitElement, html, css } from 'lit';

/**
 * @typedef {Object} GreetingConfig
 * @property {string} name - The name to greet
 * @property {number} [repeatCount] - Number of times to repeat the greeting
 */

/**
 * @typedef {import('lit').PropertyDeclaration} PropertyDeclaration
 * @typedef {import('lit').PropertyValues} PropertyValues
 * @typedef {import('lit').CSSResult} CSSResult
 * @typedef {import('lit').TemplateResult} TemplateResult
 * @typedef {import('lit').EventPart} EventPart
 */

/**
 * A greeting component that displays a customizable hello message.
 *
 * @extends {LitElement}
 */
export class MyGreeting extends LitElement {
  /** @type {CSSResult} */
  static styles = css`
    :host {
      display: block;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #f0f0f0;
      padding: calc(var(--size-7) + var(--size-2));
    }
    .card {
      background: #fafafa;
      padding: var(--size-7);
      max-width: var(--size-12);
      position: relative;
      box-shadow: var(--inner-shadow-0);
    }
    .card::before {
      content: 'TERMINAL LDS-1138';
      position: absolute;
      top: calc(var(--size-2) + var(--size-1));
      right: var(--size-3);
      font-family: 'Courier New', Courier, monospace;
      font-size: var(--font-size-0);
      color: #bbb;
      letter-spacing: var(--font-letterspacing-5);
    }
    .card::after {
      content: '';
      position: absolute;
      inset: var(--size-1);
      border: var(--border-size-1) solid rgba(0, 0, 0, 0.04);
      pointer-events: none;
    }
    .greeting {
      color: #333;
      font-size: var(--font-size-1);
      font-weight: var(--font-weight-4);
      margin-bottom: var(--size-5);
      padding-bottom: 16px;
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      font-family: 'Courier New', Courier, monospace;
    }
    .input-row {
      display: flex;
      gap: calc(var(--size-2) + var(--size-1));
      align-items: center;
      background: rgba(0, 0, 0, 0.02);
      padding: calc(var(--size-2) + var(--size-1));
      margin: 0 calc(-1 * var(--size-2) - var(--size-1));
    }
    .input-row input {
      flex: 1;
      height: calc(var(--size-7) + var(--size-1));
      padding: 0 calc(var(--size-2) + var(--size-1));
      border: none;
      border-bottom: var(--border-size-2) solid #ccc;
      font-size: var(--font-size-1);
      font-family: 'Courier New', Courier, monospace;
      background: white;
      box-sizing: border-box;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-3);
      transition: border-color var(--duration-moderate-1);
    }
    .input-row input::placeholder {
      color: #aaa;
      text-transform: uppercase;
    }
    .input-row input:focus {
      outline: none;
      border-color: #666;
    }
    .input-row button {
      height: calc(var(--size-7) + var(--size-1));
      padding: 0 var(--size-4);
      background: #e0e0e0;
      color: #333;
      border: none;
      border-bottom: var(--border-size-2) solid #bbb;
      font-size: var(--font-size-0);
      font-weight: var(--font-weight-6);
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      box-sizing: border-box;
      transition: all var(--duration-quick-2);
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    .input-row button:hover {
      background: #d5d5d5;
      border-color: #999;
    }
    .input-row button:active {
      background: #c0c0c0;
      border-color: #666;
      transform: translateY(1px);
    }
    .text-examples {
      margin-top: var(--size-6);
      padding-top: 24px;
      border-top: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
    }
    .display-text {
      font-size: var(--font-size-4);
      font-weight: var(--font-weight-3);
      color: #333;
      margin: 0 0 var(--size-3) 0;
      line-height: var(--font-lineheight-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
    }
    .body-text {
      font-size: var(--font-size-0);
      font-weight: var(--font-weight-4);
      color: #777;
      line-height: var(--font-lineheight-5);
      margin: 0 0 var(--size-3) 0;
    }
    .mono-text {
      font-family: 'Courier New', Courier, monospace;
      font-size: var(--font-size-0);
      background: white;
      padding: var(--size-1) var(--size-2);
      border-bottom: 1px solid #ddd;
      color: #444;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-3);
    }
    .mono-block {
      font-family: 'Courier New', Courier, monospace;
      font-size: var(--font-size-0);
      background: white;
      padding: var(--size-3) var(--size-4);
      border-left: var(--border-size-2) solid #ccc;
      color: #555;
      margin: 0;
      overflow-x: auto;
      line-height: var(--font-lineheight-4);
      letter-spacing: var(--font-letterspacing-2);
    }
    .scanline {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent var(--size-1),
        rgba(0, 0, 0, 0.02) var(--size-1),
        rgba(0, 0, 0, 0.02) var(--size-2)
      );
      pointer-events: none;
      opacity: 0.5;
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** The name to display in the greeting */
      name: { type: String },
      /** Counter for clicks */
      clickCount: { type: Number, state: true },
    };
  }

  constructor() {
    super();
    /** @type {string} The name to greet */
    this.name = 'THX';
    /** @type {number} Click counter */
    this.clickCount = 0;
    /** @type {string} Current input value */
    this.inputValue = '';
  }

  /**
   * Handles click events on the greeting.
   * @param {MouseEvent} _event - The click event
   * @returns {void}
   */
  handleClick(_event) {
    this.clickCount++;
  }

  /**
   * Generates a greeting message.
   * @param {string} targetName - The name to greet
   * @returns {string} The formatted greeting
   */
  getGreeting(targetName) {
    return `Hello, ${targetName}!`;
  }

  /**
   * Handles input changes.
   * @param {InputEvent} event - The input event
   * @returns {void}
   */
  handleInput(event) {
    const target = /** @type {HTMLInputElement} */ (event.target);
    this.inputValue = target.value;
  }

  /**
   * Updates the greeting name from input.
   * @returns {void}
   */
  updateName() {
    if (this.inputValue.trim()) {
      this.name = this.inputValue.trim();
      this.inputValue = '';
      this.clickCount = 0;
    }
  }

  /**
   * Renders the component.
   * @returns {TemplateResult}
   */
  render() {
    return html`
      <div class="card">
        <div class="scanline"></div>
        <div class="greeting" @click=${this.handleClick}>
          SECTOR: ${this.name} ${this.clickCount > 0 ? html` | CYCLES: ${this.clickCount}` : null}
        </div>
        <div class="input-row">
          <input
            type="text"
            placeholder="INPUT DESIGNATION..."
            .value=${this.inputValue}
            @input=${this.handleInput}
            @keydown=${/** @param {KeyboardEvent} e */ e => e.key === 'Enter' && this.updateName()}
          />
          <button @click=${this.updateName}>Execute</button>
        </div>
        <div class="text-examples">
          <p class="display-text">Monitor Display</p>
          <p class="body-text">
            Subject <span class="mono-text">${this.name}</span> logged. All data streams observed.
            Work performance indices nominal. Proceed with designated function.
          </p>
          <pre class="mono-block">
PREFIX: ${this.name}
TYPE: EB-844
STATE: NORMAL
CYCLES: ${this.clickCount}
CONSUMER INDEX: 1138</pre
          >
        </div>
      </div>
    `;
  }
}

// Define the custom element
customElements.define('my-greeting', MyGreeting);
