export const progressBar = (pct, style = '') => `<div class="bar"${style ? ` style="${style}"` : ''}><div style="width:${pct}%"></div></div>`;
