/**
 * Shared browse -> select -> inspect -> close controller (Droid Systems components, Vehicle installed systems and weapon systems).
 *
 * UI STATE ONLY. Search text, category, status filter, sort, selected entry and inspector tab live on the sheet instance (`sheet._biState[id]`),
 * change the DOM in place (no actor update, no sheet render) and are re-applied after every render so ordinary updates never reset a browser.
 * Nothing here computes a rule or writes a document: every operation inside the inspector is an existing `data-action` button that the sheet's
 * own delegated handlers execute. The markup contract is templates/actors/shared/partials/browse-inspect.hbs.
 *
 * Behaviour contract (same as the equipment workspace inspector):
 *   - nothing selected: the inspector is `hidden` (display:none, zero layout space) and the browser uses the full width
 *   - selecting an entry opens it (`has-selection` -> two columns); selecting another updates it without closing
 *   - the X clears only the selection; category, search, filters, sort and scroll are kept
 *   - a selection whose entry no longer exists after a render is dropped (the inspector collapses)
 *   - Escape closes and returns focus to the opener; a keyboard activation focuses the inspector heading; tab rails use roving tabindex
 */

const num = (v) => { if (v === undefined || v === null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

function freshState() {
  return { search: '', category: 'all', status: '', sort: 'default', dir: 'asc', key: null, itab: 'details', focusKey: null, listScroll: 0, searchFocus: false, selStart: null, selEnd: null };
}

/** Presentation sort over data attributes; missing values never outrank present ones. "default" is the adapter's own order. */
export function sortBrowserEntries(entries, field, dir) {
  const sign = dir === 'desc' ? -1 : 1;
  const byOrder = (a, b) => (num(a.dataset.biOrder) ?? 0) - (num(b.dataset.biOrder) ?? 0);
  const byName = (a, b) => String(a.dataset.biName ?? '').localeCompare(String(b.dataset.biName ?? ''));
  const cmp = {
    default: (a, b) => byOrder(a, b) * sign,
    name: (a, b) => (byName(a, b) * sign) || byOrder(a, b),
    category: (a, b) => (String(a.dataset.biCat ?? '').localeCompare(String(b.dataset.biCat ?? '')) * sign) || byName(a, b),
    status: (a, b) => (String(a.dataset.biStatusLabel ?? '').localeCompare(String(b.dataset.biStatusLabel ?? '')) * sign) || byName(a, b),
  }[field] ?? byOrder;
  return [...entries].sort(cmp);
}

function wire(sheet, host, signal) {
  const id = host.dataset.bi;
  const store = (sheet._biState ??= {});
  const st = (store[id] ??= freshState());
  st.sortSig = null; // a fresh render restores the adapter's order: re-apply the viewer's sort
  const q = (sel, scope = host) => scope.querySelector(sel);
  const qa = (sel, scope = host) => Array.from(scope.querySelectorAll(sel));
  const listEl = q('[data-bi-list]');
  const searchEl = q('[data-bi-search]');
  const inspector = q('[data-bi-inspector]');

  function apply() {
    host.classList.toggle('has-selection', !!st.key);
    if (inspector) inspector.hidden = !st.key;
    const entries = qa('[data-bi-entry]');
    const inCat = (e) => st.category === 'all' || e.dataset.biCat === st.category;
    const catEntries = entries.filter(inCat);
    qa('[data-bi-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.biTab === st.category ? 'true' : 'false'));
    qa('[role="tablist"]').forEach((list) => Array.from(list.querySelectorAll('[role="tab"]')).forEach((tb) => { tb.tabIndex = tb.getAttribute('aria-selected') === 'true' ? 0 : -1; }));

    const statusEl = q('[data-bi-status]');
    if (statusEl) {
      const present = new Set(catEntries.map((e) => e.dataset.biStatus));
      Array.from(statusEl.options).forEach((o) => { if (o.value) o.hidden = !present.has(o.value); });
      if (st.status && !present.has(st.status)) st.status = '';
      statusEl.value = st.status;
    }
    const sortEl = q('[data-bi-sort]'); if (sortEl) sortEl.value = st.sort;
    const dirEl = q('[data-bi-dir]');
    if (dirEl) { dirEl.setAttribute('aria-pressed', st.dir === 'desc' ? 'true' : 'false'); dirEl.setAttribute('aria-label', st.dir === 'desc' ? 'Sort descending' : 'Sort ascending'); const ic = dirEl.querySelector('i'); if (ic) ic.className = `fa-solid ${st.dir === 'desc' ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-short-wide'}`; }

    const sig = `${st.sort}|${st.dir}`;
    if (listEl && sig !== st.sortSig) { st.sortSig = sig; listEl.append(...sortBrowserEntries(entries, st.sort, st.dir)); }

    const term = st.search.trim().toLowerCase();
    let visible = 0;
    entries.forEach((row) => {
      const show = inCat(row) && (!term || (row.dataset.biText ?? '').toLowerCase().includes(term)) && (!st.status || row.dataset.biStatus === st.status);
      row.hidden = !show; if (show) visible += 1;
      const key = row.dataset.biKey; const sel = key === st.key;
      row.classList.toggle('is-selected', sel);
      row.querySelector('[data-bi-select]')?.setAttribute('aria-pressed', sel ? 'true' : 'false');
    });
    const empty = q('[data-bi-empty]');
    if (empty && entries.length > 0) { empty.hidden = visible > 0; empty.textContent = 'Nothing matches this category, search and filter.'; }
    const count = q('[data-bi-count]'); if (count) count.textContent = `${visible} of ${catEntries.length}`;
    const reset = q('[data-bi-reset]'); if (reset) reset.disabled = !st.search && !st.status && st.sort === 'default' && st.dir === 'asc';

    qa('[data-bi-detail]').forEach((d) => {
      const on = d.dataset.biDetail === st.key; d.hidden = !on; if (!on) return;
      qa('[data-bi-itab]', d).forEach((b) => b.setAttribute('aria-selected', b.dataset.biItab === st.itab ? 'true' : 'false'));
      qa('[data-bi-pane]', d).forEach((p) => { p.hidden = p.dataset.biPane !== st.itab; });
    });
    if (searchEl && searchEl.value !== st.search) searchEl.value = st.search;
  }

  function select(key, { keyboard = false } = {}) {
    st.key = key; st.itab = 'details'; apply();
    if (keyboard) q(`[data-bi-detail="${CSS.escape(key)}"] [data-bi-heading]`)?.focus();
  }
  function close() {
    const inside = !!inspector?.contains(document.activeElement);
    st.key = null; apply();
    if (listEl) listEl.scrollTop = st.listScroll;
    if (inside) { const back = st.focusKey ? q(st.focusKey) : null; (back && !back.closest('[hidden]') ? back : q('[data-bi-select]:not([hidden])') ?? host).focus?.({ preventScroll: true }); }
  }

  host.addEventListener('click', (event) => {
    const t = event.target instanceof Element ? event.target : null; if (!t) return;
    let b;
    if ((b = t.closest('[data-bi-tab]'))) { st.category = b.dataset.biTab; apply(); return; }
    if ((b = t.closest('[data-bi-itab]'))) { st.itab = b.dataset.biItab; apply(); return; }
    if ((b = t.closest('[data-bi-close]'))) { close(); return; }
    if ((b = t.closest('[data-bi-dir]'))) { st.dir = st.dir === 'desc' ? 'asc' : 'desc'; apply(); return; }
    if ((b = t.closest('[data-bi-reset]'))) { st.search = ''; st.status = ''; st.sort = 'default'; st.dir = 'asc'; apply(); return; }
    if ((b = t.closest('[data-bi-select]'))) { st.focusKey = `[data-bi-select="${CSS.escape(b.dataset.biSelect)}"]`; select(b.dataset.biSelect, { keyboard: event.detail === 0 }); }
  }, { signal });
  host.addEventListener('input', (event) => { if (event.target === searchEl) { st.search = searchEl.value; st.selStart = searchEl.selectionStart; st.selEnd = searchEl.selectionEnd; apply(); } }, { signal });
  host.addEventListener('change', (event) => {
    const t = event.target;
    if (t?.matches?.('[data-bi-status]')) { st.status = t.value; apply(); } else if (t?.matches?.('[data-bi-sort]')) { st.sort = t.value; apply(); }
  }, { signal });
  host.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && st.key) { event.stopPropagation(); close(); return; }
    const tab = event.target instanceof Element ? event.target.closest('[role="tab"]') : null;
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = Array.from(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')).filter((x) => !x.hidden);
    const i = tabs.indexOf(tab);
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    event.preventDefault(); next?.focus(); next?.click();
  }, { signal });
  searchEl?.addEventListener('focus', () => { st.searchFocus = true; }, { signal });
  searchEl?.addEventListener('blur', () => { st.searchFocus = false; }, { signal });
  listEl?.addEventListener('scroll', () => { st.listScroll = listEl.scrollTop; }, { signal, passive: true });

  // invalid-selection cleanup: the selection survives a render only while its entry is still in the adapter's view model
  if (st.key && !q(`[data-bi-entry][data-bi-key="${CSS.escape(st.key)}"]`)) { st.key = null; st.focusKey = null; }
  apply();
  if (listEl) listEl.scrollTop = st.listScroll;
  if (searchEl && st.searchFocus) { searchEl.focus({ preventScroll: true }); try { searchEl.setSelectionRange(st.selStart ?? searchEl.value.length, st.selEnd ?? searchEl.value.length); } catch (_e) { /* not selectable */ } }
}

export function activateBrowseInspect(sheet, root, { signal } = {}) {
  if (!sheet || !root?.querySelectorAll) return;
  for (const host of root.querySelectorAll('[data-bi]')) wire(sheet, host, signal);
}

export default { activateBrowseInspect, sortBrowserEntries };
