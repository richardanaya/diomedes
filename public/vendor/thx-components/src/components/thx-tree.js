// @ts-check

/**
 * @fileoverview THX 1138 styled tree navigation component
 * @module thx-tree
 */

import { LitElement, html, css } from '../../vendor/lit.js';

// Forward declaration for type checking
/** @typedef {import('./thx-tree-item.js').ThxTreeItem} ThxTreeItem */

/**
 * Tree container for hierarchical data display
 * THX 1138 style: clinical hierarchical structure
 * @element thx-tree
 */
export class ThxTree extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--neutral-100, #fafafa);
      border: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      box-shadow: var(--inner-shadow-0);
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .tree-header {
      padding: calc(var(--size-2) + var(--size-1)) var(--size-3);
      border-bottom: var(--border-size-1) solid rgba(0, 0, 0, 0.08);
      font-size: var(--font-size-0);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-5);
      color: var(--neutral-600, #666);
      background: rgba(0, 0, 0, 0.02);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tree-header::before {
      content: '// ';
    }

    .tree-header::after {
      content: ' //';
    }

    .tree-controls {
      display: flex;
      gap: var(--size-2);
    }

    .tree-control {
      font-size: var(--font-size-00);
      padding: var(--size-1) var(--size-2);
      background: transparent;
      border: var(--border-size-1) solid var(--atmos-secondary, #707e91);
      color: var(--atmos-secondary, #707e91);
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      font-family: inherit;
    }

    .tree-control:hover {
      border-color: var(--atmos-primary, #a6c8e1);
      color: var(--atmos-primary, #a6c8e1);
    }

    .tree-list {
      list-style: none;
      margin: 0;
      padding: var(--size-2) 0;
    }

    ::slotted(thx-tree-item) {
      display: block;
    }

    /* CRT variant */
    :host([variant='crt']) {
      background: var(--crt-bg, #111);
      border: calc(var(--size-2) + var(--size-1)) solid var(--crt-border, #2a2a2a);
      border-radius: var(--size-1);
      box-shadow: inset 0 0 var(--size-4) rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }

    :host([variant='crt']) .tree-header {
      background: transparent;
      color: var(--atmos-secondary, #707e91);
      border-bottom-color: rgba(166, 200, 225, 0.2);
    }

    :host([variant='crt'])::before {
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

    :host([variant='crt']) .crt-label {
      position: absolute;
      top: var(--size-1);
      right: var(--size-2);
      font-size: var(--font-size-0);
      color: #666;
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-4);
      z-index: calc(var(--layer-2) + 5);
    }

    /* Compact variant */
    :host([variant='compact']) {
      border: none;
      box-shadow: none;
      background: transparent;
    }

    :host([variant='compact']) .tree-header {
      background: transparent;
      padding: var(--size-2) 0;
    }

    /* Selection mode indicator */
    :host([selection='single']) .tree-header::after {
      content: ' // SINGLE SELECT';
    }

    :host([selection='multiple']) .tree-header::after {
      content: ' // MULTI SELECT';
    }
  `;

  /**
   * @type {import('lit').PropertyDeclarations}
   */
  static properties = {
    label: { type: String },
    variant: { type: String, reflect: true },
    selection: { type: String, reflect: true },
  };

  constructor() {
    super();
    /** @type {string} Tree header label */
    this.label = '';
    /** @type {string} Variant: default, crt, compact */
    this.variant = 'default';
    /** @type {string} Selection mode: none, single, multiple */
    this.selection = 'none';
  }

  /** @returns {ThxTreeItem[]} */
  _getVisibleItems() {
    const items = Array.from(this.querySelectorAll('thx-tree-item')).filter(
      item => !(/** @type {ThxTreeItem} */ (/** @type {unknown} */ (item)).disabled)
    );
    return /** @type {ThxTreeItem[]} */ (
      items.filter(item => {
        let parent = item.parentElement?.closest('thx-tree-item');
        while (parent) {
          if (!(/** @type {ThxTreeItem} */ (/** @type {unknown} */ (parent)).expanded))
            return false;
          parent = parent.parentElement?.closest('thx-tree-item');
        }
        return true;
      })
    );
  }

  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  _handleKeydown(e) {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '];
    if (!keys.includes(e.key)) return;

    const items = this._getVisibleItems();
    if (items.length === 0) return;
    const currentIndex = Math.max(
      0,
      items.findIndex(item => item === document.activeElement || item.shadowRoot?.activeElement)
    );
    const current = items[currentIndex];
    e.preventDefault();

    if (e.key === 'Enter' || e.key === ' ') {
      current.select();
      return;
    }

    if (e.key === 'ArrowRight') {
      if (current.hasChildren && !current.expanded) current.toggle();
      else this._focusItem(items[Math.min(currentIndex + 1, items.length - 1)]);
      return;
    }

    if (e.key === 'ArrowLeft') {
      if (current.hasChildren && current.expanded) current.toggle();
      else {
        const parent = /** @type {ThxTreeItem|null} */ (
          /** @type {unknown} */ (current.parentElement?.closest('thx-tree-item'))
        );
        this._focusItem(parent || current);
      }
      return;
    }

    let nextIndex = currentIndex;
    if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = items.length - 1;
    else if (e.key === 'ArrowDown') {
      nextIndex = Math.min(currentIndex + 1, items.length - 1);
    } else nextIndex = Math.max(currentIndex - 1, 0);

    this._focusItem(items[nextIndex]);
  }

  /**
   * @param {ThxTreeItem|undefined|null} item
   * @returns {void}
   */
  _focusItem(item) {
    item?.focus();
  }

  /**
   * Expand all tree items
   * @returns {void}
   */
  expandAll() {
    const items = this.querySelectorAll('thx-tree-item');
    items.forEach(item => {
      const treeItem = /** @type {ThxTreeItem} */ (/** @type {unknown} */ (item));
      treeItem.expanded = true;
    });
  }

  /**
   * Collapse all tree items
   * @returns {void}
   */
  collapseAll() {
    const items = this.querySelectorAll('thx-tree-item');
    items.forEach(item => {
      const treeItem = /** @type {ThxTreeItem} */ (/** @type {unknown} */ (item));
      treeItem.expanded = false;
    });
  }

  /**
   * Get selected items
   * @returns {Array<ThxTreeItem>}
   */
  getSelectedItems() {
    const items = this.querySelectorAll('thx-tree-item');
    return Array.from(items)
      .map(item => /** @type {ThxTreeItem} */ (/** @type {unknown} */ (item)))
      .filter(item => item.selected);
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      ${this.variant === 'crt' ? html`<span class="crt-label">TREE-01</span>` : ''}
      ${this.label
        ? html`
            <div class="tree-header">
              <span>${this.label}</span>
              <div class="tree-controls">
                <button class="tree-control" @click="${this.expandAll}">Expand</button>
                <button class="tree-control" @click="${this.collapseAll}">Collapse</button>
              </div>
            </div>
          `
        : ''}
      <ul class="tree-list" role="tree" @keydown="${this._handleKeydown}">
        <slot></slot>
      </ul>
    `;
  }
}

customElements.define('thx-tree', ThxTree);
