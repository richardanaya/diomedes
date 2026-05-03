// @ts-check

/**
 * @fileoverview THX 1138 styled carousel component for cycling through content.
 * @module thx-carousel
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} CarouselConfig
 * @property {boolean} loop - Whether to loop back to start
 * @property {boolean} autoplay - Whether to auto-advance
 * @property {number} interval - Autoplay interval in ms
 * @property {boolean} showDots - Whether to show navigation dots
 * @property {boolean} showArrows - Whether to show navigation arrows
 * @property {string} variant - Visual variant: 'default' | 'crt'
 */

/**
 * Carousel component for cycling through content items.
 * Styled with THX 1138 monochrome CRT aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxCarousel extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: block;
    }

    .carousel {
      position: relative;
      overflow: hidden;
    }

    .carousel__viewport {
      overflow: hidden;
      width: 100%;
    }

    .carousel__track {
      display: flex;
      transition: transform var(--duration-moderate-2) ease;
    }

    ::slotted(thx-carousel-item) {
      flex: 0 0 100%;
      width: 100%;
    }

    /* Navigation arrows */
    .carousel__arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: calc(var(--size-7) + var(--size-2));
      height: calc(var(--size-7) + var(--size-2));
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--neutral-100, #fafafa);
      border: var(--border-size-1) solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-1);
      color: var(--neutral-600, #666);
      transition: all var(--duration-quick-2);
      z-index: var(--layer-2);
    }

    .carousel__arrow:hover {
      background: var(--neutral-200, #e0e0e0);
      color: var(--neutral-800, #333);
    }

    .carousel__arrow:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--atmos-primary, #a6c8e1);
    }

    .carousel__arrow--prev {
      left: 0;
    }

    .carousel__arrow--next {
      right: 0;
    }

    .carousel__arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Dot navigation */
    .carousel__dots {
      display: flex;
      justify-content: center;
      gap: var(--size-2);
      margin-top: var(--size-3);
      padding: var(--size-2);
    }

    .carousel__dot {
      width: var(--size-2);
      height: var(--size-2);
      padding: 0;
      border: var(--border-size-1) solid var(--neutral-600, #666);
      background: transparent;
      cursor: pointer;
      transition: all var(--duration-quick-2);
    }

    .carousel__dot:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .carousel__dot--active {
      background: var(--neutral-600, #666);
    }

    .carousel__dot:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--atmos-primary, #a6c8e1);
    }

    /* CRT variant */
    .carousel--crt .carousel__arrow {
      background: rgba(17, 17, 17, 0.9);
      border-color: var(--atmos-secondary, #707e91);
      color: var(--atmos-primary, #a6c8e1);
    }

    .carousel--crt .carousel__arrow:hover {
      background: rgba(166, 200, 225, 0.2);
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.4);
    }

    .carousel--crt .carousel__dot {
      border-color: var(--atmos-secondary, #707e91);
    }

    .carousel--crt .carousel__dot:hover {
      background: rgba(166, 200, 225, 0.2);
    }

    .carousel--crt .carousel__dot--active {
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.6);
    }

    /* Counter */
    .carousel__counter {
      position: absolute;
      bottom: var(--size-3);
      right: var(--size-3);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      color: var(--neutral-600, #666);
      background: var(--neutral-100, #fafafa);
      padding: var(--size-1) var(--size-2);
      border: var(--border-size-1) solid rgba(0, 0, 0, 0.1);
    }

    .carousel--crt .carousel__counter {
      background: rgba(17, 17, 17, 0.9);
      border-color: var(--atmos-secondary, #707e91);
      color: var(--atmos-primary, #a6c8e1);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Whether to loop back to start */
      loop: { type: Boolean, reflect: true },
      /** Whether to auto-advance */
      autoplay: { type: Boolean, reflect: true },
      /** Autoplay interval in ms */
      interval: { type: Number },
      /** Whether to show navigation dots */
      showDots: { type: Boolean, reflect: true, attribute: 'show-dots' },
      /** Whether to show navigation arrows */
      showArrows: { type: Boolean, reflect: true, attribute: 'show-arrows' },
      /** Visual variant: 'default' | 'crt' */
      variant: { type: String, reflect: true },
      /** Current active slide index */
      activeIndex: { type: Number, state: true },
    };
  }

  constructor() {
    super();
    /** @type {boolean} */
    this.loop = false;
    /** @type {boolean} */
    this.autoplay = false;
    /** @type {number} */
    this.interval = 5000;
    /** @type {boolean} */
    this.showDots = true;
    /** @type {boolean} */
    this.showArrows = true;
    /** @type {string} */
    this.variant = 'default';
    /** @type {number} */
    this.activeIndex = 0;
    /** @type {number | null} */
    this._autoplayTimer = null;
  }

  /**
   * Get the number of slides.
   * @returns {number} Number of slides
   * @private
   */
  _getSlideCount() {
    return this.querySelectorAll('thx-carousel-item').length;
  }

  /**
   * Navigate to a specific slide.
   * @param {number} index - Slide index
   * @returns {void}
   */
  goToSlide(index) {
    const count = this._getSlideCount();
    if (count === 0) return;

    let newIndex = index;
    if (this.loop) {
      newIndex = ((index % count) + count) % count;
    } else {
      newIndex = Math.max(0, Math.min(index, count - 1));
    }

    this.activeIndex = newIndex;
    this._resetAutoplay();

    this.dispatchEvent(
      new CustomEvent('slidechange', {
        bubbles: true,
        composed: true,
        detail: { index: this.activeIndex, total: count },
      })
    );
  }

  /**
   * Navigate to next slide.
   * @returns {void}
   */
  next() {
    this.goToSlide(this.activeIndex + 1);
  }

  /**
   * Navigate to previous slide.
   * @returns {void}
   */
  prev() {
    this.goToSlide(this.activeIndex - 1);
  }

  /**
   * Start autoplay.
   * @returns {void}
   * @private
   */
  _startAutoplay() {
    if (!this.autoplay) return;
    this._stopAutoplay();
    this._autoplayTimer = window.setInterval(() => {
      this.next();
    }, this.interval);
  }

  /**
   * Stop autoplay.
   * @returns {void}
   * @private
   */
  _stopAutoplay() {
    if (this._autoplayTimer) {
      clearInterval(this._autoplayTimer);
      this._autoplayTimer = null;
    }
  }

  /**
   * Reset autoplay timer.
   * @returns {void}
   * @private
   */
  _resetAutoplay() {
    this._stopAutoplay();
    this._startAutoplay();
  }

  /**
   * @param {FocusEvent} event
   * @returns {void}
   * @private
   */
  _handleFocusOut(event) {
    const relatedTarget = /** @type {Node|null} */ (event.relatedTarget);
    if (
      !relatedTarget ||
      (!this.renderRoot.contains(relatedTarget) && !this.contains(relatedTarget))
    ) {
      this._startAutoplay();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.autoplay) {
      this._startAutoplay();
    }
  }

  disconnectedCallback() {
    this._stopAutoplay();
    super.disconnectedCallback();
  }

  /**
   * @param {import('lit').PropertyValues} changed
   * @returns {void}
   */
  updated(changed) {
    if (changed.has('autoplay') || changed.has('interval')) {
      this._resetAutoplay();
    }
  }

  /**
   * Render the carousel component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = {
      carousel: true,
      [`carousel--${this.variant}`]: true,
    };

    const classString = Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');

    const count = this._getSlideCount();
    const canGoPrev = this.loop || this.activeIndex > 0;
    const canGoNext = this.loop || this.activeIndex < count - 1;

    return html`
      <div
        class="${classString}"
        role="region"
        aria-roledescription="carousel"
        @mouseenter=${this._stopAutoplay}
        @mouseleave=${this._startAutoplay}
        @focusin=${this._stopAutoplay}
        @focusout=${this._handleFocusOut}
      >
        ${this.showArrows
          ? html`
              <button
                class="carousel__arrow carousel__arrow--prev"
                @click=${this.prev}
                ?disabled=${!canGoPrev}
                aria-label="Previous slide"
              >
                ←
              </button>
            `
          : null}

        <div class="carousel__viewport">
          <div class="carousel__track" style="transform: translateX(-${this.activeIndex * 100}%)">
            <slot></slot>
          </div>
        </div>

        ${this.showArrows
          ? html`
              <button
                class="carousel__arrow carousel__arrow--next"
                @click=${this.next}
                ?disabled=${!canGoNext}
                aria-label="Next slide"
              >
                →
              </button>
            `
          : null}
        ${this.showDots && count > 0
          ? html`
              <div class="carousel__dots" role="tablist">
                ${Array.from(
                  { length: count },
                  (_, i) => html`
                    <button
                      class="carousel__dot ${i === this.activeIndex ? 'carousel__dot--active' : ''}"
                      @click=${() => this.goToSlide(i)}
                      role="tab"
                      aria-selected=${i === this.activeIndex}
                      aria-label="Go to slide ${i + 1}"
                    ></button>
                  `
                )}
              </div>
            `
          : null}

        <div class="carousel__counter">${this.activeIndex + 1} / ${count}</div>
      </div>
    `;
  }
}

customElements.define('thx-carousel', ThxCarousel);
