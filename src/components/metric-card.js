import { esc } from '../utils/escape-html.js';
export const metricCard = (n, l, sub = '', tone = '') => `<div class="card metric tight"><div class="l">${esc(l)}</div><div class="n ${tone}">${n}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
