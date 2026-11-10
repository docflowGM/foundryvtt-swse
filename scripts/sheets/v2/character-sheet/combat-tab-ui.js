/**
 * Combat tab listeners -- UI STATE ONLY.
 *
 * The Combat Action Library's category / search / availability filter / sort / direction / row selection and the open state of the collapsible sections
 * live on the sheet instance, change the DOM in place (no actor update, no sheet render, nothing spent, nothing executed) and are re-applied after every
 * render so an ordinary update does not reset the tab. Executing an action is never done here: the rows' buttons are the existing data-action handlers
 * (swse-v2-use-action, roll-attack, ...). This file never reads or writes an actor.
 */
export const LIBRARY_TABS = Object.freeze(['standard', 'move', 'swift', 'full-round', 'reaction', 'free', 'all']);
const AVAIL_RANK = { available: 0, unavailable: 1, reference: 2 };

export function defaultCombatTabState() {
  return { tab: 'standard', query: '', avail: 'all', sort: 'name', dir: 'asc', expanded: new Set(), open: { status: false, library: false, advanced: false } };
}

/** descriptor = { lane, avail, search } */
export function matchesAction(d, state) {
  if (state.tab !== 'all' && d.lane !== state.tab) return false;
  if (state.avail !== 'all' && d.avail !== state.avail) return false;
  const terms = String(state.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((t) => String(d.search ?? '').includes(t));
}

const costNum = (c) => { const n = parseFloat(String(c ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : Infinity; };
/** descriptor = { name, source, cost, avail }. Stable, and a descending sort is the exact reverse comparator (never a re-sort of the reversed list). */
export function compareActions(a, b, { sort = 'name', dir = 'asc' } = {}) {
  const byName = String(a.name).localeCompare(String(b.name));
  let c;
  if (sort === 'source') c = String(a.source).localeCompare(String(b.source)) || byName;
  else if (sort === 'cost') c = (costNum(a.cost) - costNum(b.cost) || 0) || byName;
  else if (sort === 'availability') c = ((AVAIL_RANK[a.avail] ?? 9) - (AVAIL_RANK[b.avail] ?? 9)) || byName;
  else c = byName;
  return dir === 'desc' ? -c : c;
}

function describe(li) {
  return { el: li, lane: li.dataset.lane, avail: li.dataset.avail, name: li.dataset.name ?? '', source: li.dataset.source ?? '', cost: li.dataset.cost ?? '', search: li.dataset.search ?? '', id: li.dataset.calId ?? '' };
}

function applyLibrary(root, state) {
  const list = root.querySelector('[data-cal-list]');
  if (!list) return;
  const rows = [...list.querySelectorAll('[data-cal-item]')].map(describe);
  rows.sort((a, b) => compareActions(a, b, state));
  let shown = 0;
  for (const r of rows) {
    const match = matchesAction(r, state);
    r.el.hidden = !match; if (match) shown += 1;
    list.appendChild(r.el); // re-order in place (the same nodes: nothing is created or duplicated)
    const open = state.expanded.has(r.id);
    const detail = r.el.querySelector('[data-cal-detail]'); const head = r.el.querySelector('[data-cal-select]');
    if (detail) detail.hidden = !open; if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  for (const t of root.querySelectorAll('[data-cal-tab]')) { const on = t.dataset.calTab === state.tab; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); }
  const search = root.querySelector('[data-cal-search]'); if (search && search.value !== state.query) search.value = state.query;
  const av = root.querySelector('[data-cal-avail]'); if (av) av.value = state.avail;
  const so = root.querySelector('[data-cal-sort]'); if (so) so.value = state.sort;
  const dir = root.querySelector('[data-cal-dir]'); if (dir) { dir.dataset.dir = state.dir; dir.textContent = state.dir === 'asc' ? 'A→Z' : 'Z→A'; }
  const count = root.querySelector('[data-cal-count]'); if (count) count.textContent = `${shown} of ${rows.length}`;
  const empty = root.querySelector('[data-cal-empty]'); if (empty) empty.hidden = shown > 0;
}

export function activateCombatTab(sheet, html, { signal } = {}) {
  const root = (html instanceof HTMLElement ? html : html?.[0])?.querySelector?.('[data-combat-tab-root]');
  if (!root) return;
  const state = (sheet._combatTabUi ??= defaultCombatTabState());
  const lib = root.querySelector('[data-cal-root]');
  const opts = { signal };

  // collapsible sections: remember open / closed across renders (UI-only)
  for (const d of root.querySelectorAll('details[data-cmb-details]')) {
    const key = d.dataset.cmbDetails;
    d.open = state.open[key] === true;
    d.addEventListener('toggle', () => { state.open[key] = d.open; }, opts);
  }
  if (!lib) return;
  applyLibrary(lib, state);
  lib.addEventListener('click', (ev) => {
    const tab = ev.target.closest?.('[data-cal-tab]');
    if (tab) { state.tab = LIBRARY_TABS.includes(tab.dataset.calTab) ? tab.dataset.calTab : 'standard'; return applyLibrary(lib, state); }
    const sel = ev.target.closest?.('[data-cal-select]');
    if (sel) { const id = sel.closest('[data-cal-item]')?.dataset.calId; if (id) { state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id); applyLibrary(lib, state); } return; }
    if (ev.target.closest?.('[data-cal-dir]')) { state.dir = state.dir === 'asc' ? 'desc' : 'asc'; return applyLibrary(lib, state); }
    if (ev.target.closest?.('[data-cal-reset]')) { Object.assign(state, defaultCombatTabState(), { open: state.open }); return applyLibrary(lib, state); }
  }, opts);
  lib.addEventListener('input', (ev) => { if (ev.target.matches?.('[data-cal-search]')) { state.query = ev.target.value; applyLibrary(lib, state); } }, opts);
  lib.addEventListener('change', (ev) => {
    if (ev.target.matches?.('[data-cal-avail]')) { state.avail = ev.target.value; applyLibrary(lib, state); }
    if (ev.target.matches?.('[data-cal-sort]')) { state.sort = ev.target.value; applyLibrary(lib, state); }
  }, opts);
}

export default { activateCombatTab, defaultCombatTabState, matchesAction, compareActions, LIBRARY_TABS };
