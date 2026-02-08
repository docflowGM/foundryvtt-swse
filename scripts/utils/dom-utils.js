// scripts/utils/dom-utils.js

/**
 * Small DOM helpers for AppV2 (no jQuery).
 * Keep these tiny and dependency-free.
 */

export function qs(root, selector) {
  return root?.querySelector?.(selector) ?? null;
}

export function qsa(root, selector) {
  return Array.from(root?.querySelectorAll?.(selector) ?? []);
}

export function setVisible(el, visible, { display = '' } = {}) {
  if (!el) return;
  el.style.display = visible ? display : 'none';
}

export function isVisible(el) {
  if (!(el instanceof HTMLElement)) return false;
  const style = globalThis.getComputedStyle?.(el);
  if (!style) return el.offsetParent !== null;
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

export function text(el, value) {
  if (!el) return;
  el.textContent = value ?? '';
}
