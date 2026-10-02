const asset = f => new URL(`../../assets/backgrounds/${f}`, import.meta.url).href;

/** Built-in image backgrounds: version-controlled files in src/assets/backgrounds/ (they cannot be deleted from the UI). */
export const BUILTIN = [
  { id: 'obsidian', name: 'Obsidian', file: 'obsidian.svg', tone: 'dark' },
  { id: 'midnight-grid', name: 'Midnight Grid', file: 'midnight-grid.svg', tone: 'dark' },
  { id: 'aurora', name: 'Aurora', file: 'aurora.svg', tone: 'dark' },
  { id: 'deep-space', name: 'Deep Space', file: 'deep-space.svg', tone: 'dark' },
  { id: 'graphite', name: 'Graphite', file: 'graphite.svg', tone: 'dark' },
  { id: 'blueprint', name: 'Blueprint', file: 'blueprint.svg', tone: 'dark' },
  { id: 'minimal-dark', name: 'Minimal Dark', file: 'minimal-dark.svg', tone: 'dark' },
  { id: 'minimal-light', name: 'Minimal Light', file: 'minimal-light.svg', tone: 'light' },
].map(b => ({ ...b, url: asset(b.file) }));

export const SOLIDS = [
  { id: 'black', name: 'Black', color: '#000000' },
  { id: 'graphite', name: 'Graphite', color: '#1c1f25' },
  { id: 'navy', name: 'Navy', color: '#0a1830' },
];
export const GRADIENTS = [
  { id: 'aurora', name: 'Aurora', css: 'linear-gradient(135deg,#0b1f2a 0%,#12404a 40%,#2a3f7a 100%)' },
  { id: 'midnight', name: 'Midnight', css: 'linear-gradient(160deg,#05070f 0%,#0b1230 55%,#18204a 100%)' },
  { id: 'violet', name: 'Violet', css: 'linear-gradient(145deg,#120a2a 0%,#2a1457 55%,#4a1f6e 100%)' },
];
export const builtinById = id => BUILTIN.find(b => b.id === id);
