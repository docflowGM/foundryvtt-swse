/**
 * Vehicle sheet tab semantics and keyboard navigation (UI-10). The pure functions decide the state; vehicle-actor-sheet.js applies it.
 * Visibility stays class-driven (.active) as before; this only adds the ARIA contract and arrow-key movement.
 */
export function tabKeyAfter(keys, current, pressed) {
  const list = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (!list.length) return null;
  const i = Math.max(0, list.indexOf(current));
  switch (pressed) {
    case 'ArrowRight': case 'ArrowDown': return list[(i + 1) % list.length];
    case 'ArrowLeft': case 'ArrowUp': return list[(i - 1 + list.length) % list.length];
    case 'Home': return list[0];
    case 'End': return list[list.length - 1];
    default: return null;
  }
}

/** ARIA/tabindex state for every tab: exactly one selected tab is in the tab order (roving tabindex). */
export function tabStates(keys, selected) {
  return (Array.isArray(keys) ? keys : []).map((key) => ({ key, selected: key === selected, tabindex: key === selected ? 0 : -1 }));
}

/** DOM glue: applies roles, ids and state to the nav/panels under `root`. Safe to call on every render and tab change. */
export function applyVehicleTabSemantics(root, selected, uid) {
  const nav = root.querySelector?.('.sheet-tabs');
  if (!nav) return;
  const items = [...nav.querySelectorAll('.item')];
  const keys = items.map((el) => el.dataset?.tab).filter(Boolean);
  nav.setAttribute('role', 'tablist');
  const states = new Map(tabStates(keys, selected).map((s) => [s.key, s]));
  for (const el of items) {
    const key = el.dataset?.tab; if (!key) continue;
    const st = states.get(key);
    el.setAttribute('role', 'tab');
    el.id = `swse-vehicle-tab-${uid}-${key}`;
    el.setAttribute('aria-controls', `swse-vehicle-panel-${uid}-${key}`);
    el.setAttribute('aria-selected', String(st.selected));
    el.setAttribute('tabindex', String(st.tabindex));
  }
  for (const panel of root.querySelectorAll('.sheet-content .tab')) {
    const key = panel.dataset?.tab; if (!key) continue;
    panel.setAttribute('role', 'tabpanel');
    panel.id = `swse-vehicle-panel-${uid}-${key}`;
    panel.setAttribute('aria-labelledby', `swse-vehicle-tab-${uid}-${key}`);
  }
}
