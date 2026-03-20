/**
 * sheet-position.js — Shared utility for centering Foundry app windows
 * in the visible canvas/work area.
 *
 * The Foundry sidebar is docked to the RIGHT side of the viewport.
 * Naively centering against `window.innerWidth` biases sheets toward
 * the sidebar.  This utility subtracts sidebar width first, so the
 * result lands in the true work area.
 *
 * Used by:
 *   - SWSEV2CharacterSheet  (_onRender isFirstRender centering)
 *   - launchProgression     (center-before-minimize so restore is sane)
 */

const MARGIN = 24; // px gap from any screen edge

/**
 * Compute a centered, fully-clamped position for an app window.
 *
 * @param {number} [targetWidth=900]   Desired window width
 * @param {number} [targetHeight=950]  Desired window height
 * @returns {{ width: number, height: number, left: number, top: number }}
 */
export function computeCenteredPosition(targetWidth = 900, targetHeight = 950) {
  // Measure sidebar (right chrome) — fall back to 310 if not yet painted.
  const sidebarEl = ui?.sidebar?.element ?? document.querySelector('#sidebar');
  const sidebarW  = sidebarEl ? (sidebarEl.offsetWidth || 310) : 310;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // Horizontal space available for app windows (left of the sidebar)
  const availW = Math.max(500, viewportW - sidebarW - 16);

  // Constrain dimensions to what actually fits
  const width  = Math.min(targetWidth,  availW);
  const height = Math.min(targetHeight, Math.max(600, viewportH - 60));

  // Center within the available area, then clamp to keep fully on-screen
  const rawLeft = Math.round((availW - width)  / 2);
  const rawTop  = Math.round((viewportH - height) / 2);

  const left = Math.max(MARGIN, Math.min(rawLeft, availW  - width  - MARGIN));
  const top  = Math.max(MARGIN, Math.min(rawTop,  viewportH - height - MARGIN));

  return { width, height, left, top };
}
