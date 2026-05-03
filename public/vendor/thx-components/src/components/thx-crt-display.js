// @ts-check

/**
 * @fileoverview THX 1138 styled CRT monitor display wrapper
 * @module thx-crt-display
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * THX 1138 styled CRT monitor display wrapper
 * Provides scanlines, vignette, and monitor frame styling
 * @extends {LitElement}
 */
export class ThxCrtDisplay extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .crt-display {
      background: var(--crt-bg, #111);
      border: calc(var(--size-2) + var(--size-1)) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 0 var(--size-4) rgba(0, 0, 0, 0.5);
    }

    .crt-display::before {
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
      animation: scanlines var(--duration-pause) linear infinite;
    }

    @keyframes scanlines {
      0% {
        transform: translateY(0);
      }
      100% {
        transform: translateY(4px);
      }
    }

    .crt-display::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
      pointer-events: none;
      z-index: calc(var(--layer-2) + 1);
    }

    .crt-content {
      position: relative;
      z-index: var(--layer-1);
      padding: var(--size-4);
    }

    .crt-label {
      position: absolute;
      top: var(--size-1);
      right: var(--size-2);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      color: #666;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      z-index: calc(var(--layer-2) + 5);
    }

    /* Tektronix scope variant */
    .crt-display.scope {
      background: var(--crt-bg-dark, #0a0a0a);
      border-color: var(--crt-border, #2a2a2a);
    }

    .crt-display.scope::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(166, 200, 225, 0.2) 1px, transparent 1px),
        linear-gradient(90deg, rgba(166, 200, 225, 0.2) 1px, transparent 1px);
      background-size: var(--size-4) var(--size-4);
      pointer-events: none;
      animation: none;
    }

    .crt-display.scope .crt-content {
      padding: var(--size-5);
    }

    @media (prefers-reduced-motion: reduce) {
      .crt-display::before {
        animation: none;
      }
    }

    /* Small variant */
    .crt-display.small {
      border-width: var(--size-2);
    }

    .crt-display.small .crt-content {
      padding: calc(var(--size-2) + var(--size-1));
    }

    /* Large variant */
    .crt-display.large {
      border-width: var(--size-3);
    }

    .crt-display.large .crt-content {
      padding: var(--size-7);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      label: { type: String },
      variant: { type: String },
      size: { type: String },
    };
  }

  constructor() {
    super();
    this.label = '';
    this.variant = 'crt';
    this.size = 'medium';
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="crt-display ${this.variant} ${this.size}">
        ${this.label ? html`<span class="crt-label">${this.label}</span>` : ''}
        <div class="crt-content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('thx-crt-display', ThxCrtDisplay);
