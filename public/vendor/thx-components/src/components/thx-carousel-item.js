// @ts-check

/**
 * @fileoverview THX 1138 styled carousel item component.
 * @module thx-carousel-item
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * Carousel item component for use within thx-carousel.
 * Styled with THX 1138 monochrome aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxCarouselItem extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: block;
      flex: 0 0 100%;
      width: 100%;
    }

    .carousel-item {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    ::slotted(img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    ::slotted(figure) {
      margin: 0;
      width: 100%;
      height: 100%;
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Optional label for the slide */
      label: { type: String },
    };
  }

  constructor() {
    super();
    /** @type {string} */
    this.label = '';
  }

  /**
   * Render the carousel item component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div
        class="carousel-item"
        role="group"
        aria-roledescription="slide"
        aria-label=${this.label || undefined}
      >
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('thx-carousel-item', ThxCarouselItem);
