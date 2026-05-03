// @ts-check

/**
 * @fileoverview THX 1138 styled tree item component
 * @module thx-tree-item
 */

import { LitElement, html, css } from '../../vendor/lit.js';

// Forward declaration for type checking
/** @typedef {import('./thx-tree.js').ThxTree} ThxTree */

/**
 * Individual tree item with expand/collapse and selection
 * THX 1138 style: hierarchical with phosphor selection states
 * @element thx-tree-item
 */
export class ThxTreeItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .tree-item {
      display: flex;
      align-items: center;
      gap: var(--size-2);
      padding: var(--size-2) var(--size-3);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2);
      color: var(--neutral-800, #333);
      cursor: pointer;
      transition: all var(--duration-quick-2);
      user-select: none;
      position: relative;
    }

    .tree-item:hover {
      background: rgba(166, 200, 225, 0.05);
    }

    .tree-item.selected {
      background: var(--atmos-primary, #a6c8e1);
      color: var(--neutral-800, #333);
    }

    /* Left selection bar instead of an arrow (avoids duplicating toggle/type icons) */
    .tree-item.selected::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--atmos-secondary, #707e91);
    }

    /* Expand toggle */
    .toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--size-3);
      height: var(--size-3);
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
      transition: transform var(--duration-moderate-1);
      flex-shrink: 0;
    }

    .toggle.expanded {
      transform: rotate(90deg);
      color: var(--atmos-primary, #a6c8e1);
    }

    .toggle-placeholder {
      width: var(--size-3);
      flex-shrink: 0;
    }

    /* Item label */
    .label {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--size-2);
    }

    /* Children container */
    .children {
      display: none;
      list-style: none;
      margin: 0;
      padding: 0;
      padding-left: var(--size-5);
    }

    .children.expanded {
      display: block;
    }

    /* Level indentation for nested items (selection bar is an overlay, so padding is identical) */
    :host([level='1']) .tree-item {
      padding-left: var(--size-7);
    }
    :host([level='2']) .tree-item {
      padding-left: var(--size-8);
    }
    :host([level='3']) .tree-item {
      padding-left: var(--size-9);
    }
    :host([level='4']) .tree-item {
      padding-left: var(--size-10);
    }

    /* Disabled state */
    .tree-item.disabled,
    :host([disabled]) .tree-item {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* CRT variant */
    :host([variant='crt']) .tree-item {
      color: var(--atmos-secondary, #707e91);
    }

    :host([variant='crt']) .tree-item:hover {
      color: var(--atmos-tertiary, #deffff);
      background: rgba(166, 200, 225, 0.15);
    }

    :host([variant='crt']) .tree-item.selected {
      background: rgba(166, 200, 225, 0.25);
      color: var(--atmos-tertiary, #deffff);
      text-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.8);
    }

    :host([variant='crt']) .toggle.expanded {
      color: var(--atmos-tertiary, #deffff);
      text-shadow: 0 0 var(--size-2) rgba(166, 200, 225, 0.8);
    }

    /* Type indicators */
    .type-icon {
      font-size: var(--font-size-0);
      color: var(--neutral-600, #666);
    }

    /* Status indicator */
    .status {
      width: var(--size-1);
      height: var(--size-1);
      background: var(--neutral-600, #666);
      margin-left: auto;
      flex-shrink: 0;
    }

    .status.active {
      background: var(--atmos-primary, #a6c8e1);
      box-shadow: 0 0 var(--size-1) rgba(166, 200, 225, 0.8);
    }

    .status.warning {
      background: var(--accent-warning, #d4aa00);
      box-shadow: 0 0 var(--size-1) rgba(212, 170, 0, 0.8);
    }

    .status.error {
      background: var(--accent-error, #d44000);
      box-shadow: 0 0 var(--size-1) rgba(212, 64, 0, 0.8);
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    value: { type: String },
    expanded: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    hasChildren: { type: Boolean, reflect: true, attribute: 'has-children' },
    level: { type: Number, reflect: true },
    variant: { type: String, reflect: true },
    type: { type: String },
    status: { type: String },
  };

  constructor() {
    super();
    /** @type {string} Item value/identifier */
    this.value = '';
    /** @type {boolean} Whether item is expanded */
    this.expanded = false;
    /** @type {boolean} Whether item is selected */
    this.selected = false;
    /** @type {boolean} Whether item is disabled */
    this.disabled = false;
    /** @type {boolean} Whether item has children */
    this.hasChildren = false;
    /** @type {number} Nesting level */
    this.level = 0;
    /** @type {string} Variant inherited from parent */
    this.variant = 'default';
    /** @type {string} Item type: file, folder, sector, unit */
    this.type = 'item';
    /** @type {string} Status: normal, active, warning, error */
    this.status = 'normal';
  }

  focus() {
    this.updateComplete.then(() => {
      const item = /** @type {HTMLElement|null} */ (
        this.renderRoot.querySelector('[role="treeitem"]')
      );
      item?.focus();
    });
  }

  /**
   * Lifecycle callback when element is added to DOM
   * Detects children and sets up proper nesting
   * @returns {void}
   */
  connectedCallback() {
    super.connectedCallback();
    // Delay to ensure children are in DOM
    setTimeout(() => this._setupChildren(), 0);
  }

  /**
   * Called after first render
   * Re-check children to ensure hasChildren is set
   * @returns {void}
   */
  firstUpdated() {
    this._setupChildren();
  }

  /**
   * Setup children with proper attributes and slots
   * @returns {void}
   * @private
   */
  _setupChildren() {
    // Check for children in light DOM
    const children = this.querySelectorAll(':scope > thx-tree-item');
    const hasChildrenNow = children.length > 0;

    if (hasChildrenNow !== this.hasChildren) {
      this.hasChildren = hasChildrenNow;
    }

    if (children.length > 0) {
      children.forEach(child => {
        // Set slot for children rendering
        if (!child.hasAttribute('slot')) {
          child.setAttribute('slot', 'children');
        }
        // Set level on children
        const childLevel = (this.level || 0) + 1;
        child.setAttribute('level', String(childLevel));
        // Inherit variant
        if (this.variant && this.variant !== 'default') {
          child.setAttribute('variant', this.variant);
        }
      });
    }

    // Inherit variant from parent tree if not set
    if (!this.variant || this.variant === 'default') {
      const parentTree = /** @type {HTMLElement & {variant?: string}}|null */ (
        this.closest('thx-tree')
      );
      if (parentTree?.variant) {
        this.variant = parentTree.variant;
      }
    }
  }

  /**
   * Handle slot change to detect children dynamically
   * @param {Event} e
   * @returns {void}
   * @private
   */
  _onSlotChange(e) {
    const slot = /** @type {HTMLSlotElement} */ (e.target);
    const assignedElements = slot.assignedElements();
    const hasChildrenNow = assignedElements.length > 0;

    if (hasChildrenNow !== this.hasChildren) {
      this.hasChildren = hasChildrenNow;
      this.requestUpdate();
    }
  }

  /**
   * Toggle expanded state
   * @returns {void}
   */
  toggle() {
    const hasChildren = this._hasChildren();
    if (hasChildren) {
      this.expanded = !this.expanded;
      this.requestUpdate();
      this.dispatchEvent(new Event('toggle', { bubbles: true, composed: true }));
    }
  }

  /**
   * Select this item
   * @returns {void}
   */
  select() {
    if (this.disabled) return;

    const treeEl = this.closest('thx-tree');
    const tree = /** @type {ThxTree|null} */ (/** @type {unknown} */ (treeEl));
    if (tree?.selection === 'single') {
      // Deselect others in single select mode
      const siblings = tree.querySelectorAll('thx-tree-item');
      siblings.forEach(sibling => {
        const thxSibling = /** @type {ThxTreeItem} */ (/** @type {unknown} */ (sibling));
        if (thxSibling !== this) thxSibling.selected = false;
      });
    }

    this.selected = !this.selected;

    this.dispatchEvent(
      new CustomEvent('select', {
        bubbles: true,
        composed: true,
        detail: {
          value: this.value,
          selected: this.selected,
          item: this,
        },
      })
    );
  }

  /**
   * Handle toggle click
   * @param {MouseEvent} e
   * @returns {void}
   * @private
   */
  _handleToggle(e) {
    e.stopPropagation();
    this.toggle();
  }

  /**
   * Handle item click
   * @param {MouseEvent} e
   * @returns {void}
   * @private
   */
  _handleClick(e) {
    if (this.disabled) return;
    this.select();
  }

  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  _handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      this.select();
    }
  }

  /**
   * Get toggle icon. Always returns the same glyph — the CSS
   * rotates it 90deg when expanded, so we must NOT also swap the
   * character (otherwise the glyph rotates "back" on expand).
   * @returns {string}
   * @private
   */
  _getToggleIcon() {
    return '▸';
  }

  /**
   * Get type icon. For folders we return a neutral glyph and do NOT
   * encode open/closed state here — the dedicated toggle chevron on
   * the left is the single source of truth for expansion state.
   * @returns {string}
   * @private
   */
  _getTypeIcon() {
    const icons = {
      folder: '▦',
      file: '▪',
      sector: '▣',
      unit: '●',
      system: '◈',
      default: '▪',
    };
    /** @type {keyof typeof icons} */
    const typeKey = /** @type {keyof typeof icons} */ (this.type in icons ? this.type : 'default');
    return icons[typeKey];
  }

  /**
   * Get status class
   * @returns {string}
   * @private
   */
  _getStatusClass() {
    return `status ${this.status}`;
  }

  /**
   * Check if has children by querying DOM directly
   * @returns {boolean}
   * @private
   */
  _hasChildren() {
    // Check both property and live DOM
    const slotChildren = this.querySelectorAll(':scope > thx-tree-item');
    return slotChildren.length > 0;
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    const itemClasses = {
      'tree-item': true,
      selected: this.selected,
      disabled: this.disabled,
    };

    const itemClassString = Object.entries(itemClasses)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');

    const hasChildren = this._hasChildren();

    return html`
      <div
        class="${itemClassString}"
        role="treeitem"
        aria-expanded=${hasChildren ? String(this.expanded) : undefined}
        aria-selected="${this.selected}"
        tabindex="${this.disabled ? '-1' : '0'}"
        @click="${this._handleClick}"
        @keydown="${this._handleKeydown}"
      >
        ${hasChildren
          ? html`
              <span
                class="toggle ${this.expanded ? 'expanded' : ''}"
                @click="${this._handleToggle}"
              >
                ${this._getToggleIcon()}
              </span>
            `
          : html`<span class="toggle-placeholder"></span>`}

        <span class="label">
          ${this._getTypeIcon()}
          <slot></slot>
        </span>

        ${this.status !== 'normal' ? html`<span class="${this._getStatusClass()}"></span>` : ''}
      </div>

      ${hasChildren
        ? html`
            <ul class="children ${this.expanded ? 'expanded' : ''}" role="group">
              <slot name="children" @slotchange="${this._onSlotChange}"></slot>
            </ul>
          `
        : ''}
    `;
  }
}

customElements.define('thx-tree-item', ThxTreeItem);
