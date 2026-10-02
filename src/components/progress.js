export const progressBar = (pct, cls = '') => `<div class="progress ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="--pct:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
export function progressRing(pct, { size = 56, stroke = 5, label = true } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return `<div class="progress-ring" style="--size:${size}px" role="img" aria-label="${Math.round(pct)} percent"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/><circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>${label ? `<span class="num">${Math.round(pct)}%</span>` : ''}</div>`;
}
