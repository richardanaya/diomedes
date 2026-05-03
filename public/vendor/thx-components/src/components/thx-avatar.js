// @ts-check

/**
 * @fileoverview THX 1138 styled avatar component for user representation.
 * @module thx-avatar
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} AvatarConfig
 * @property {string} image - Image URL
 * @property {string} name - User name (for initials and aria-label)
 * @property {string} size - Avatar size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @property {string} variant - Visual variant: 'default' | 'crt' | 'outline'
 * @property {string} shape - Avatar shape: 'square' | 'rounded' | 'circle'
 */

/**
 * Avatar component for user representation.
 * Styled with THX 1138 monospace uppercase aesthetic.
 *
 * @extends {LitElement}
 */
export class ThxAvatar extends LitElement {
  /** @type {import('lit').CSSResult} */
  static styles = css`
    :host {
      display: inline-flex;
    }

    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-weight: var(--font-weight-6);
      text-transform: uppercase;
      background: var(--neutral-200, #e0e0e0);
      color: var(--neutral-800, #333);
      border: var(--border-size-2) solid transparent;
      transition: all var(--duration-quick-2);
    }

    .avatar__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar__initials {
      user-select: none;
    }

    /* Sizes */
    .avatar--xs {
      width: var(--size-5);
      height: var(--size-5);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
    }

    .avatar--sm {
      width: var(--size-7);
      height: var(--size-7);
      font-size: var(--font-size-0);
      letter-spacing: var(--font-letterspacing-2);
    }

    .avatar--md {
      width: calc(var(--size-7) + var(--size-2));
      height: calc(var(--size-7) + var(--size-2));
      font-size: var(--font-size-1);
      letter-spacing: var(--font-letterspacing-3);
    }

    .avatar--lg {
      width: 56px;
      height: 56px;
      font-size: 1.125rem;
      letter-spacing: var(--font-letterspacing-4);
    }

    .avatar--xl {
      width: 72px;
      height: 72px;
      font-size: var(--font-size-4);
      letter-spacing: var(--font-letterspacing-4);
    }

    /* Shapes */
    .avatar--square {
      border-radius: 0;
    }

    .avatar--rounded {
      border-radius: var(--size-1);
    }

    .avatar--circle {
      border-radius: var(--radius-round);
    }

    /* Variants */
    .avatar--crt {
      background: rgba(166, 200, 225, 0.2);
      color: var(--atmos-primary, #a6c8e1);
    }

    .avatar--crt.avatar--square::after,
    .avatar--crt.avatar--rounded::after {
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

    .avatar--outline {
      background: transparent;
      border-color: var(--neutral-600, #666);
      color: var(--neutral-600, #666);
    }

    .avatar--outline.avatar--crt {
      border-color: var(--atmos-primary, #a6c8e1);
      color: var(--atmos-primary, #a6c8e1);
    }

    /* Hover effect for interactive avatars */
    .avatar--interactive {
      cursor: pointer;
    }

    .avatar--interactive:hover {
      box-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.4);
    }

    /* Status indicator */
    .avatar__status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 25%;
      height: 25%;
      min-width: var(--size-2);
      min-height: var(--size-2);
      border: var(--border-size-2) solid var(--neutral-100, #fafafa);
      background: var(--neutral-600, #666);
    }

    .avatar--square .avatar__status {
      bottom: -2px;
      right: -2px;
    }

    .avatar--rounded .avatar__status {
      border-radius: var(--radius-1);
    }

    .avatar--circle .avatar__status {
      border-radius: var(--radius-round);
    }

    .avatar__status--online {
      background: var(--atmos-primary, #a6c8e1);
    }

    .avatar__status--away {
      background: var(--accent-warning, #d4aa00);
    }

    .avatar__status--busy {
      background: var(--accent-error, #d44000);
    }

    .avatar__status--offline {
      background: var(--neutral-600, #666);
    }
  `;

  /**
   * @returns {import('lit').PropertyDeclarations}
   */
  static get properties() {
    return {
      /** Image URL */
      image: { type: String },
      /** User name (for initials and aria-label) */
      name: { type: String },
      /** Avatar size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' */
      size: { type: String, reflect: true },
      /** Visual variant: 'default' | 'crt' | 'outline' */
      variant: { type: String, reflect: true },
      /** Avatar shape: 'square' | 'rounded' | 'circle' */
      shape: { type: String, reflect: true },
      /** Status indicator: 'online' | 'away' | 'busy' | 'offline' */
      status: { type: String },
      /** Whether avatar is interactive */
      interactive: { type: Boolean, reflect: true },
    };
  }

  constructor() {
    super();
    /** @type {string} */
    this.image = '';
    /** @type {string} */
    this.name = '';
    /** @type {string} */
    this.size = 'md';
    /** @type {string} */
    this.variant = 'default';
    /** @type {string} */
    this.shape = 'square';
    /** @type {string} */
    this.status = '';
    /** @type {boolean} */
    this.interactive = false;
  }

  /**
   * Get initials from name.
   * @returns {string} Initials (max 2 characters)
   * @private
   */
  _getInitials() {
    if (!this.name) return '?';
    return this.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Handle image load error.
   * @returns {void}
   * @private
   */
  _handleImageError() {
    this.image = '';
  }

  /**
   * Render the avatar component.
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const classes = {
      avatar: true,
      [`avatar--${this.size}`]: true,
      [`avatar--${this.variant}`]: true,
      [`avatar--${this.shape}`]: true,
      'avatar--interactive': this.interactive,
    };

    const classString = Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');

    const hasImage = this.image && this.image.trim();

    return html`
      <div class="${classString}" role="img" aria-label=${this.name || 'Avatar'}>
        ${hasImage
          ? html`
              <img
                class="avatar__image"
                src="${this.image}"
                alt=""
                @error=${this._handleImageError}
              />
            `
          : html`<span class="avatar__initials">${this._getInitials()}</span>`}
        ${this.status
          ? html`<span class="avatar__status avatar__status--${this.status}"></span>`
          : null}
      </div>
    `;
  }
}

customElements.define('thx-avatar', ThxAvatar);
