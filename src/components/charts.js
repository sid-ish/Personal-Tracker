import { esc } from '../utils/escape-html.js';
/** Small dependency-free SVG bar chart. data: [{label, value}]. */
export function barChart(data, { height = 150, unit = '', max, decimals = 1, alt = false, label = 'Bar chart' } = {}) {
  if (!data.length) return '';
  const W = 480, H = height, pad = { l: 28, r: 6, t: 8, b: 20 }, top = max ?? Math.max(1, ...data.map(d => d.value)); const niceTop = max ?? (Math.ceil(top * 1.15 * 2) / 2 || 1);
  const bw = (W - pad.l - pad.r) / data.length, ch = H - pad.t - pad.b;
  const grid = [0, .5, 1].map(f => { const y = pad.t + ch * (1 - f); return `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/><text x="${pad.l - 5}" y="${y + 3}" text-anchor="end">${+(niceTop * f).toFixed(decimals)}</text>`; }).join('');
  const bars = data.map((d, i) => { const h = Math.max(d.value > 0 ? 2 : 0, d.value / niceTop * ch), x = pad.l + i * bw + bw * .16, y = pad.t + ch - h; return `<rect class="bar ${alt ? 'alt' : ''}" x="${x}" y="${y}" width="${bw * .68}" height="${h}" rx="3"><title>${esc(d.label)}: ${+d.value.toFixed(decimals)}${unit}</title></rect>`; }).join('');
  const every = Math.ceil(data.length / 8); const labels = data.map((d, i) => i % every === 0 ? `<text x="${pad.l + i * bw + bw / 2}" y="${H - 5}" text-anchor="middle">${esc(d.label)}</text>` : '').join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${grid}${bars}${labels}</svg>`;
}
/** Horizontal labelled bars for categories (subjects). data: [{label, value, note}], value is 0-100. */
export function hBars(data, { suffix = '%', tone = '' } = {}) {
  return `<div class="hbars">${data.map(d => `<div class="hbar"><div class="row between"><span class="t-small truncate">${esc(d.label)}</span><span class="t-small tnum muted">${d.value}${suffix}${d.note ? ' · ' + esc(d.note) : ''}</span></div><div class="progress ${tone}"><i style="--pct:${Math.min(100, d.value)}%"></i></div></div>`).join('')}</div>`;
}
