// @ts-check

/**
 * @fileoverview THX 1138 styled skeleton loading placeholder component.
 * @module thx-skeleton
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} SkeletonConfig
 * @property {string} variant - Skeleton variant: 'text' | 'circle' | 'rect' | 'crt'
 * @property {number} lines - Number of text lines (for text variant)
 * @property {boolean} animate - Whether to show pulse animation
 * @property {string} width - Custom width (CSS value)
 * @property {string} height - Custom height (CSS value)
 */

/**
 * Skeleton loading placeholder component.
 * Styled with THX 1138 monochrome CRT aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxSkeleton extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: block;
    }

    .skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--size-2);
    }

    .skeleton__item {
      background: var(--neutral-200, #e0e0e0);
      position: relative;
      overflow: hidden;
    }

    .skeleton__item::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.4) 50%,
        transparent 100%
      );
      transform: translateX(-100%);
    }

    .skeleton--animate .skeleton__item::after {
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }

    .skeleton--pulse .skeleton__item {
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Text variant */
    .skeleton__item--text {
      height: 1em;
      border-radius: 0;
    }

    .skeleton__item--text:last-child {
      width: 80%;
    }

    /* Circle variant */
    .skeleton__item--circle {
      border-radius: var(--radius-round);
    }

    /* Rect variant */
    .skeleton__item--rect {
      border-radius: 0;
    }

    /* CRT variant */
    .skeleton--crt .skeleton__item {
      background: rgba(166, 200, 225, 0.2);
    }

    .skeleton--crt .skeleton__item::after {
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(166, 200, 225, 0.3) 50%,
        transparent 100%
      );
    }

    .skeleton--crt.skeleton--pulse .skeleton__item {
      animation: crtPulse 1.5s ease-in-out infinite;
    }

    @keyframes crtPulse {
      0%,
      100% {
        opacity: 0.6;
        box-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.3);
      }
      50% {
        opacity: 1;
        box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.5);
      }
    }

    /* Scanline effect */
    .skeleton--crt .skeleton__item::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(166, 200, 225, 0.05) 2px,
        rgba(166, 200, 225, 0.05) var(--size-1)
      );
      pointer-events: none;
    }

    /* Size presets */
    .skeleton__item--sm {
      height: var(--size-3);
    }

    .skeleton__item--md {
      height: var(--size-5);
    }

    .skeleton__item--lg {
      height: var(--size-7);
    }

    .skeleton__item--xl {
      height: var(--size-8);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Skeleton variant: 'text' | 'circle' | 'rect' | 'crt' */
      variant: { type: String, reflect: true },
      /** Number of text lines (for text variant) */
      lines: { type: Number },
      /** Whether to show animation */
      animated: { type: Boolean, reflect: true },
      /** Animation effect style: 'shimmer' | 'pulse' */
      effect: { type: String },
      /** Custom width (CSS value) */
      width: { type: String },
      /** Custom height (CSS value) */
      height: { type: String },
    };
  }

  constructor() {
    super();
    /** @type {string} */
    this.variant = 'text';
    /** @type {number} */
    this.lines = 3;
    /** @type {boolean} */
    this.animated = true;
    /** @type {string} */
    this.effect = 'shimmer';
    /** @type {string} */
    this.width = '';
    /** @type {string} */
    this.height = '';
  }

  /**
   * Get item style based on variant and custom dimensions.
   * @returns {string} CSS style string
   * @private
   */
  _getItemStyle() {
    const styles = [];
    if (this.width) styles.push(`width: ${this.width}`);
    if (this.height && this.variant !== 'text') styles.push(`height: ${this.height}`);
    return styles.join('; ');
  }

  /**
   * Render text variant with multiple lines.
   * @returns {import('lit').TemplateResult[]}
   * @private
   */
  _renderTextLines() {
    return Array.from({ length: this.lines }, (_, i) => {
      const width = i === this.lines - 1 ? '80%' : '100%';
      return html`
        <div class="skeleton__item skeleton__item--text" style="width: ${width}"></div>
      `;
    });
  }

  /**
   * Render the skeleton component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = {
      skeleton: true,
      [`skeleton--${this.variant}`]: true,
      'skeleton--animate': this.animated && this.effect === 'shimmer',
      [`skeleton--${this.effect}`]: this.animated && this.effect !== 'shimmer',
    };

    const classString = Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');

    const itemStyle = this._getItemStyle();

    if (this.variant === 'text') {
      return html`
        <div class="${classString}" aria-hidden="true" aria-label="Loading">
          ${this._renderTextLines()}
        </div>
      `;
    }

    return html`
      <div class="${classString}" aria-hidden="true" aria-label="Loading">
        <div class="skeleton__item skeleton__item--${this.variant}" style="${itemStyle}"></div>
      </div>
    `;
  }
}

customElements.define('thx-skeleton', ThxSkeleton);
