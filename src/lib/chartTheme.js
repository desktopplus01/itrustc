/**
 * Reads the dashboard's current theme tokens so lightweight-charts can follow
 * the dark/light theme (its options are JS, not CSS).
 */
export function chartTheme() {
  const root = document.querySelector('.monetra-dashboard') || document.documentElement;
  const cs = getComputedStyle(root);
  const v = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback;
  return {
    text: v('--m-text-45', 'rgba(255,255,255,0.45)'),
    grid: v('--m-border', 'rgba(255,255,255,0.06)'),
    border: v('--m-border', 'rgba(255,255,255,0.06)'),
    crosshair: v('--m-border-strong', 'rgba(255,255,255,0.12)'),
    marker: v('--m-panel', '#111827'),
    panel: v('--m-panel', '#111827'),
  };
}
