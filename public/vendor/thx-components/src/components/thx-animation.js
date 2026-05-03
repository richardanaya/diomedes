// @ts-check

/**
 * @fileoverview THX 1138 styled animation utility component for entrance/exit effects.
 * @module thx-animation
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} AnimationConfig
 * @property {string} name - Animation name: 'fade' | 'slide' | 'scale' | 'scan' | 'flicker' | 'typewriter'
 * @property {string} direction - Animation direction: 'in' | 'out'
 * @property {number} duration - Animation duration in ms
 * @property {string} easing - CSS easing function
 * @property {boolean} trigger - Whether animation should trigger
 * @property {boolean} fillMode - Whether to keep final state
 */

/**
 * Animation utility component for entrance and exit effects.
 * Styled with THX 1138 CRT/surveillance aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxAnimation extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: block;
    }

    .animation-wrapper {
      animation-fill-mode: both;
    }

    /* Fade animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    .animation--fade-in {
      animation-name: fadeIn;
    }

    .animation--fade-out {
      animation-name: fadeOut;
    }

    /* Slide animations */
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animation--slide-left-in {
      animation-name: slideInLeft;
    }

    .animation--slide-right-in {
      animation-name: slideInRight;
    }

    .animation--slide-up-in {
      animation-name: slideInUp;
    }

    .animation--slide-down-in {
      animation-name: slideInDown;
    }

    /* Scale animations */
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes scaleOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0.9);
      }
    }

    .animation--scale-in {
      animation-name: scaleIn;
    }

    .animation--scale-out {
      animation-name: scaleOut;
    }

    /* CRT Scan animation */
    @keyframes scanIn {
      from {
        clip-path: inset(0 100% 0 0);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      to {
        clip-path: inset(0 0 0 0);
        opacity: 1;
      }
    }

    @keyframes scanOut {
      from {
        clip-path: inset(0 0 0 0);
        opacity: 1;
      }
      50% {
        opacity: 1;
      }
      to {
        clip-path: inset(0 0 0 100%);
        opacity: 0;
      }
    }

    .animation--scan-in {
      animation-name: scanIn;
    }

    .animation--scan-out {
      animation-name: scanOut;
    }

    /* Flicker animation (CRT power on effect) */
    @keyframes flickerIn {
      0% {
        opacity: 0;
      }
      5% {
        opacity: 0.3;
      }
      10% {
        opacity: 0;
      }
      15% {
        opacity: 0.5;
      }
      20% {
        opacity: 0.1;
      }
      25% {
        opacity: 0.7;
      }
      30% {
        opacity: 0.2;
      }
      35% {
        opacity: 0.9;
      }
      40% {
        opacity: 0.4;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 1;
      }
    }

    @keyframes flickerOut {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
      60% {
        opacity: 0.3;
      }
      70% {
        opacity: 0.1;
      }
      80% {
        opacity: 0.5;
      }
      90% {
        opacity: 0.1;
      }
      100% {
        opacity: 0;
      }
    }

    .animation--flicker-in {
      animation-name: flickerIn;
    }

    .animation--flicker-out {
      animation-name: flickerOut;
    }

    /* Typewriter animation */
    @keyframes typewriter {
      from {
        width: 0;
      }
      to {
        width: 100%;
      }
    }

    @keyframes blink {
      50% {
        border-color: transparent;
      }
    }

    .animation--typewriter {
      overflow: hidden;
      white-space: nowrap;
      border-right: var(--border-size-2) solid var(--atmos-primary, #a6c8e1);
      animation-name: typewriter, blink;
      animation-duration: var(--typewriter-duration, 1s), 0.75s;
      animation-timing-function: steps(40, end), step-end;
      animation-iteration-count: 1, infinite;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .animation-wrapper {
        animation: none !important;
      }
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Animation name: 'fade' | 'slide' | 'scale' | 'scan' | 'flicker' | 'typewriter' */
      name: { type: String },
      /** Animation direction: 'in' | 'out' */
      direction: { type: String },
      /** Animation duration in ms */
      duration: { type: Number },
      /** CSS easing function */
      easing: { type: String },
      /** Whether animation should trigger */
      trigger: { type: Boolean },
      /** Delay before animation starts (ms) */
      delay: { type: Number },
      /** Whether to keep final state */
      fillMode: { type: Boolean, attribute: 'fill-mode' },
      /** Slide direction (for slide animation): 'left' | 'right' | 'up' | 'down' */
      slideDirection: { type: String, attribute: 'slide-direction' },
      /** Whether animation is currently running */
      animating: { type: Boolean, state: true },
    };
  }

  constructor() {
    super();
    /** @type {string} */
    this.name = 'fade';
    /** @type {string} */
    this.direction = 'in';
    /** @type {number} */
    this.duration = 300;
    /** @type {string} */
    this.easing = 'ease-out';
    /** @type {boolean} */
    this.trigger = false;
    /** @type {number} */
    this.delay = 0;
    /** @type {boolean} */
    this.fillMode = true;
    /** @type {string} */
    this.slideDirection = 'up';
    /** @type {boolean} */
    this.animating = false;
  }

  /**
   * Get the animation class based on name and direction.
   * @returns {string} Animation class name
   * @private
   */
  _getAnimationClass() {
    if (this.name === 'slide') {
      return `animation--slide-${this.slideDirection}-${this.direction}`;
    }
    return `animation--${this.name}-${this.direction}`;
  }

  /**
   * Get animation styles.
   * @returns {string} CSS style string
   * @private
   */
  _getAnimationStyles() {
    const styles = [
      `animation-duration: ${this.duration}ms`,
      `animation-timing-function: ${this.easing}`,
    ];
    if (this.delay) {
      styles.push(`animation-delay: ${this.delay}ms`);
    }
    if (this.name === 'typewriter') {
      styles.push(`--typewriter-duration: ${this.duration}ms`);
    }
    return styles.join('; ');
  }

  /**
   * Handle animation end.
   * @returns {void}
   * @private
   */
  _handleAnimationEnd() {
    this.animating = false;
    this.dispatchEvent(new Event('animationend', { bubbles: true, composed: true }));
  }

  /**
   * Start the animation.
   * @returns {void}
   */
  start() {
    this.animating = true;
    this.requestUpdate();
  }

  /**
   * @param {import('lit').PropertyValues} changed
   * @returns {void}
   */
  updated(changed) {
    if (changed.has('trigger') && this.trigger) {
      this.start();
    }
  }

  /**
   * Render the animation component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const shouldAnimate = this.trigger || this.animating;

    const classes = {
      'animation-wrapper': true,
      [this._getAnimationClass()]: shouldAnimate,
    };

    const classString = Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');

    return html`
      <div
        class="${classString}"
        style="${shouldAnimate ? this._getAnimationStyles() : ''}"
        @animationend=${this._handleAnimationEnd}
      >
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('thx-animation', ThxAnimation);
