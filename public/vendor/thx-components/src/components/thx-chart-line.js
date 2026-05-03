// @ts-check

/**
 * @fileoverview THX 1138 styled line chart component — Canvas-based oscilloscope
 * @module thx-chart-line
 */

import { LitElement, html, css } from '../../vendor/lit.js';

/**
 * @typedef {Object} LineSeries
 * @property {string} name
 * @property {string} color
 * @property {number[]} data
 * @property {string} [dasharray]
 * @property {boolean} [outlined=false]
 */

/**
 * @typedef {Object} LineChartData
 * @property {string[]} labels
 * @property {LineSeries[]} series
 * @property {number} [min=0]
 * @property {number} [max=100]
 */

/**
 * THX 1138 styled canvas line chart component
 * @extends {LitElement}
 */
export class ThxChartLine extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-mono, 'Courier New', Courier, monospace);
    }

    .chart-container {
      position: relative;
      width: 100%;
    }

    canvas {
      width: 100%;
      height: auto;
      display: block;
      image-rendering: pixelated;
    }
  `;

  static properties = {
    data: { type: Object },
    width: { type: Number },
    height: { type: Number },
  };

  constructor() {
    super();
    /** @type {LineChartData} */
    this.data = /** @type {LineChartData} */ ({
      labels: [],
      series: [],
      min: 0,
      max: 100,
    });
    this.width = 440;
    this.height = 180;

    /** @type {HTMLCanvasElement|null} */
    this._canvas = null;
    /** @type {CanvasRenderingContext2D|null} */
    this._ctx = null;
    /** @type {ResizeObserver|null} */
    this._resizeObs = null;
    /** @type {number} */
    this._dpr = 1;
  }

  // Plot-area geometry (logical px at width=440)
  static PLOT_LEFT = 50;
  static PLOT_RIGHT = 310;
  static PLOT_TOP = 20;
  static PLOT_BOTTOM = 160;
  static LEGEND_X = 320;
  static LEGEND_Y = 25;

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  _scaleY(value, min, max) {
    const chartHeight = ThxChartLine.PLOT_BOTTOM - ThxChartLine.PLOT_TOP;
    const percent = (value - min) / (max - min);
    return ThxChartLine.PLOT_TOP + chartHeight - percent * chartHeight;
  }

  /**
   * @param {number} index
   * @param {number} total
   * @returns {number}
   */
  _scaleX(index, total) {
    const left = ThxChartLine.PLOT_LEFT;
    const right = ThxChartLine.PLOT_RIGHT;
    if (total <= 1) return left;
    return left + (index / (total - 1)) * (right - left);
  }

  connectedCallback() {
    super.connectedCallback();
    this._resizeObs = new ResizeObserver(() => this._redraw());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObs?.disconnect();
  }

  firstUpdated() {
    this._canvas = /** @type {HTMLCanvasElement} */ (this.renderRoot.querySelector('canvas'));
    if (!this._canvas) return;
    this._ctx = this._canvas.getContext('2d');
    this._resizeObs?.observe(this._canvas.parentElement || this);
    this._redraw();
  }

  /**
   * @param {import('lit').PropertyValues} changed
   */
  updated(changed) {
    if (changed.has('data')) this._redraw();
  }

  /**
   * Resize + redraw the canvas to match DPR and parent width.
   * @returns {void}
   */
  _redraw() {
    if (!this._canvas || !this._ctx) return;
    const parent = this._canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = (cssW * this.height) / this.width;
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);

    this._canvas.style.width = `${cssW}px`;
    this._canvas.style.height = `${cssH}px`;
    this._canvas.width = Math.round(cssW * this._dpr);
    this._canvas.height = Math.round(cssH * this._dpr);

    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.save();
    this._ctx.scale(this._dpr * (cssW / this.width), this._dpr * (cssH / this.height));
    this._draw();
    this._ctx.restore();
  }

  /**
   * Draw the entire chart at logical resolution (440×180).
   * @returns {void}
   */
  _draw() {
    const ctx = /** @type {CanvasRenderingContext2D} */ (this._ctx);
    const data = this.data;
    const min = data.min ?? 0;
    const max = data.max ?? 100;
    const labels = data.labels || [];
    const series = data.series || [];

    this._drawGrid(ctx);
    this._drawAxes(ctx, min, max, labels);
    series.forEach(s => this._drawSeries(ctx, s, min, max));
    this._drawLegend(ctx, series);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @returns {void}
   */
  _drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(166, 200, 225, 0.15)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    [30, 60, 90, 120, 150].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(ThxChartLine.PLOT_LEFT, y);
      ctx.lineTo(ThxChartLine.PLOT_RIGHT, y);
      ctx.stroke();
    });

    // Vertical grid lines (skip first and last)
    const labels = this.data.labels || [];
    if (labels.length > 2) {
      labels.forEach((_, i) => {
        if (i === 0 || i === labels.length - 1) return;
        const x = this._scaleX(i, labels.length);
        ctx.beginPath();
        ctx.moveTo(x, ThxChartLine.PLOT_TOP);
        ctx.lineTo(x, ThxChartLine.PLOT_BOTTOM);
        ctx.stroke();
      });
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} min
   * @param {number} max
   * @param {string[]} labels
   * @returns {void}
   */
  _drawAxes(ctx, min, max, labels) {
    ctx.strokeStyle = '#707e91';
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(ThxChartLine.PLOT_LEFT, ThxChartLine.PLOT_TOP);
    ctx.lineTo(ThxChartLine.PLOT_LEFT, ThxChartLine.PLOT_BOTTOM);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(ThxChartLine.PLOT_LEFT, ThxChartLine.PLOT_BOTTOM);
    ctx.lineTo(ThxChartLine.PLOT_RIGHT, ThxChartLine.PLOT_BOTTOM);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#707e91';
    ctx.font = "9px 'Courier New', monospace";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const steps = [
      { y: 25, val: max },
      { y: 50, val: Math.round(max * 0.8) },
      { y: 75, val: Math.round(max * 0.6) },
      { y: 100, val: Math.round(max * 0.4) },
      { y: 125, val: Math.round(max * 0.2) },
      { y: 165, val: min },
    ];
    steps.forEach(({ y, val }) => {
      ctx.fillText(String(val), 40, y);
    });

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    labels.forEach((label, i) => {
      const x = this._scaleX(i, labels.length);
      ctx.fillText(label, x, ThxChartLine.PLOT_BOTTOM + 8);
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {LineSeries} s
   * @param {number} min
   * @param {number} max
   * @returns {void}
   */
  _drawSeries(ctx, s, min, max) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;

    if (s.dasharray && s.dasharray !== 'none') {
      const parts = s.dasharray.split(/[,\s]+/).map(Number);
      ctx.setLineDash(parts);
    } else {
      ctx.setLineDash([]);
    }

    // Shadow/glow
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 4;

    // Draw polyline
    ctx.beginPath();
    s.data.forEach((val, i) => {
      const x = this._scaleX(i, s.data.length);
      const y = this._scaleY(val, min, max);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);

    // Data points
    s.data.forEach((val, i) => {
      const x = this._scaleX(i, s.data.length);
      const y = this._scaleY(val, min, max);

      if (s.outlined) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {LineSeries[]} series
   * @returns {void}
   */
  _drawLegend(ctx, series) {
    if (series.length === 0) return;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    series.forEach((s, i) => {
      const y = ThxChartLine.LEGEND_Y + i * 14;

      // Legend line sample
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      if (s.dasharray && s.dasharray !== 'none') {
        const parts = s.dasharray.split(/[,\s]+/).map(Number);
        ctx.setLineDash(parts);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(ThxChartLine.LEGEND_X, y);
      ctx.lineTo(ThxChartLine.LEGEND_X + 16, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label text
      ctx.fillStyle = '#707e91';
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillText(s.name, ThxChartLine.LEGEND_X + 20, y + 1);
    });
  }

  /**
   * @returns {import('lit').TemplateResult}
   */
  render() {
    return html`
      <div class="chart-container">
        <canvas></canvas>
      </div>
    `;
  }
}

customElements.define('thx-chart-line', ThxChartLine);
