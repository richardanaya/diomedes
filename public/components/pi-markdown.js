import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/**
 * pi-markdown — Renders markdown content as styled HTML.
 *
 * Uses the `marked` library loaded from CDN for markdown→HTML conversion.
 * Handles code blocks, inline code, links, lists, tables, etc.
 */
export class PiMarkdown extends LitElement {
  static properties = {
    content: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      line-height: var(--font-lineheight-4, 1.6);
      color: var(--neutral-800, #222);
      word-break: break-word;
    }

    /* ── Headings ─────────────────── */
    .markdown h1,
    .markdown h2,
    .markdown h3,
    .markdown h4,
    .markdown h5,
    .markdown h6 {
      font-family: var(--font-mono, monospace);
      font-weight: var(--font-weight-7, 700);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2, 1px);
      margin: var(--size-4, 16px) 0 var(--size-2, 8px);
      color: var(--atmos-primary, #a6c8e1);
    }
    .markdown h1 { font-size: var(--font-size-4, 18px); }
    .markdown h2 { font-size: var(--font-size-3, 16px); }
    .markdown h3 { font-size: var(--font-size-2, 15px); }
    .markdown h4 { font-size: var(--font-size-1, 14px); }
    .markdown h5 { font-size: var(--font-size-0, 13px); }
    .markdown h6 { font-size: var(--font-size-00, 11px); }

    .markdown h1:first-child,
    .markdown h2:first-child,
    .markdown h3:first-child,
    .markdown h4:first-child {
      margin-top: 0;
    }

    /* ── Paragraphs ───────────────── */
    .markdown p {
      margin: 0 0 var(--size-2, 8px);
    }
    .markdown p:last-child {
      margin-bottom: 0;
    }

    /* ── Links ────────────────────── */
    .markdown a {
      color: var(--atmos-primary, #a6c8e1);
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* ── Lists ────────────────────── */
    .markdown ul,
    .markdown ol {
      margin: 0 0 var(--size-2, 8px);
      padding-left: var(--size-5, 20px);
    }
    .markdown li {
      margin-bottom: var(--size-1, 4px);
    }

    /* ── Code (inline) ────────────── */
    .markdown code {
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-00, 10px);
      background: rgba(0,0,0,0.06);
      padding: 1px 5px;
      white-space: break-spaces;
      word-break: break-all;
      color: var(--accent-error, #d44000);
    }

    /* ── Code (block) ─────────────── */
    .markdown pre {
      margin: var(--size-2, 8px) 0;
      padding: var(--size-3, 12px);
      background: rgba(0,0,0,0.04);
      border: var(--border-size-1, 1px) solid rgba(0,0,0,0.08);
      overflow-x: auto;
      line-height: var(--font-lineheight-3, 1.5);
    }
    .markdown pre code {
      background: none;
      padding: 0;
      color: var(--neutral-700, #444);
      white-space: pre;
      word-break: normal;
      font-size: var(--font-size-00, 11px);
    }

    /* ── Blockquotes ──────────────── */
    .markdown blockquote {
      margin: var(--size-2, 8px) 0;
      padding: var(--size-2, 8px) var(--size-4, 16px);
      border-left: var(--border-size-2, 2px) solid var(--atmos-primary, #a6c8e1);
      background: rgba(166,200,225,0.06);
      color: var(--neutral-700, #444);
    }
    .markdown blockquote p:last-child {
      margin-bottom: 0;
    }

    /* ── Tables ───────────────────── */
    .markdown table {
      width: 100%;
      border-collapse: collapse;
      margin: var(--size-2, 8px) 0;
      font-size: var(--font-size-00, 11px);
    }
    .markdown th,
    .markdown td {
      border: var(--border-size-1, 1px) solid rgba(0,0,0,0.1);
      padding: var(--size-1, 4px) var(--size-2, 8px);
      text-align: left;
    }
    .markdown th {
      background: rgba(166,200,225,0.1);
      font-family: var(--font-mono, monospace);
      font-weight: var(--font-weight-6, 600);
      text-transform: uppercase;
      letter-spacing: var(--font-letterspacing-2, 1px);
      font-size: var(--font-size-00, 9px);
    }

    /* ── Horizontal rule ──────────── */
    .markdown hr {
      border: none;
      border-top: var(--border-size-1, 1px) solid rgba(0,0,0,0.1);
      margin: var(--size-4, 16px) 0;
    }

    /* ── Images ───────────────────── */
    .markdown img {
      max-width: 100%;
      height: auto;
    }

    /* ── Strong / emphasis ────────── */
    .markdown strong {
      font-weight: var(--font-weight-7, 700);
      color: var(--neutral-900, #111);
    }
    .markdown em {
      font-style: italic;
    }

    /* ── Loading state ────────────── */
    .loading {
      color: var(--neutral-600, #666);
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-00, 10px);
    }
  `;

  constructor() {
    super();
    this.content = '';
  }

  render() {
    if (!this.content) return html``;

    const htmlContent = this._renderMarkdown(this.content);
    if (!htmlContent) {
      return html`<div class="loading">RENDERING…</div>`;
    }

    return html`<div class="markdown">${unsafeHTML(htmlContent)}</div>`;
  }

  _renderMarkdown(text) {
    // Use the global marked instance (loaded via CDN)
    if (typeof marked !== 'undefined') {
      try {
        return marked.parse(text);
      } catch (err) {
        console.warn('pi-markdown: marked.parse failed, falling back to plain text:', err);
        return this._escapeHtml(text);
      }
    }
    // Fallback if marked hasn't loaded yet
    return this._escapeHtml(text);
  }

  _escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('pi-markdown', PiMarkdown);