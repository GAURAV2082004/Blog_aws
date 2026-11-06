export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export const initials = (name = '?') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

// Stable avatar hue per author so the same person always gets the same colour.
export const hue = (seed = '') => [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
