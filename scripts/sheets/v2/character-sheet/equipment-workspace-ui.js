/**
 * Equipment workspace listeners (Gear tab) -- UI STATE AND ROUTING ONLY.
 *
 * Selected tab / search / slot / item / inspector section are UI-only state: they live on the sheet instance, change the DOM in place (no actor
 * update, no sheet render) and are re-applied after every render so ordinary updates never reset the workspace.
 *
 * State-changing controls are never implemented here:
 *   - existing data-action buttons (draw/stow, ignite, activate, configure, power, equip, customize, ...) are handled by the sheet exactly as before
 *   - placement is assessed by the coordinator's read-only plan and submitted through InventoryEngine.requestWeaponPosture
 *     (equipment-workspace-placement.js); the UI renders the confirmed result only after that call returns
 *   - Reload routes to the sheet's existing reload workflow
 */
import { assessPlacement, submitPlacement, PLACEMENT_VERDICT as V } from '/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/equipment-workspace-placement.js';

const RANK = [V.AVAILABLE, V.CURRENT, V.REQUIRES_CHANGE, V.DEFERRED, V.CHOICE, V.UNKNOWN, V.INCOMPATIBLE];
const bestOf = (results) => results.map((r) => r.verdict).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0] ?? V.UNKNOWN;
const LABEL = { [V.AVAILABLE]: 'Available', [V.CURRENT]: 'Already set', [V.REQUIRES_CHANGE]: 'Requires change', [V.DEFERRED]: 'Deferred', [V.CHOICE]: 'Needs a choice', [V.UNKNOWN]: 'Not established', [V.INCOMPATIBLE]: 'Incompatible' };
const ACTION_LABEL = (a) => (a ? `${String(a.direction ?? 'draw').replace(/^./, (c) => c.toUpperCase())} costs a ${String(a.actionType)} action.` : 'No action cost.');
// Plain one-line reading of each coordinator verdict category for the card face; the engine's own wording sits under "Details".
const PLAIN = {
  [V.AVAILABLE]: (r) => ACTION_LABEL(r.action),
  [V.CURRENT]: () => 'Already set up this way.',
  [V.REQUIRES_CHANGE]: () => 'Another item is in the way.',
  [V.DEFERRED]: () => 'Not available yet: this change is waiting on a rules ruling.',
  [V.CHOICE]: () => 'Needs a choice before it can be done.',
  [V.UNKNOWN]: () => 'Can’t be confirmed right now.',
  [V.INCOMPATIBLE]: () => 'Can’t be held this way here.',
};

const TABS = ['weapons', 'armor', 'shields', 'gear', 'droids', 'vehicles', 'all'];
const TAB_KEY = 'swse.eqw.tab';
/** Last category the viewer chose (per-viewer convenience only; absent/blocked storage just means the default "All"). */
function loadTab() { try { const t = globalThis.localStorage?.getItem(TAB_KEY); return TABS.includes(t) ? t : 'all'; } catch (_e) { return 'all'; } }
function saveTab(t) { try { globalThis.localStorage?.setItem(TAB_KEY, t); } catch (_e) { /* storage unavailable */ } }
/** Armor/shield/implant stations point at a browser tab (implants are general gear). */
const stationTab = (s) => (s === 'implants' ? 'gear' : s);
const EMPTY_TAB = { weapons: 'No weapons owned.', armor: 'No armor owned.', shields: 'No personal shields owned.', gear: 'No gear owned.', droids: 'No droids are linked to this character.', vehicles: 'No vehicles or starships are linked to this character.', all: 'No possessions logged.' };
const num = (v) => { if (v === undefined || v === null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

function freshState() {
  return { tab: loadTab(), status: '', sort: 'default', dir: 'asc', sortSig: null, statusSig: null, search: '', slotId: null, itemId: null, itab: 'details', showIncompatible: false, listScroll: 0, searchFocus: false, selStart: null, selEnd: null, verdicts: {}, busy: false, token: 0, message: null };
}

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const icon = (name) => { const i = el('i', `fa-solid ${name}`); i.setAttribute('aria-hidden', 'true'); return i; };
const btn = (cls, label, glyph) => { const b = el('button', cls); b.type = 'button'; if (glyph) b.append(icon(glyph), ' '); b.append(label); return b; };
const GRIP_LABEL = (g) => (g === 'two-handed' ? 'Two-handed' : 'One-handed');

/** Artwork that fails to load falls back to the tile's themed glyph (display only; item data is untouched). */
function markBrokenArt(img) { img?.closest?.('.swse-eqw__art, .swse-eqw__holo')?.classList.add('is-glyph'); }

/** Presentation sort over the entries' data attributes. Missing values sort last in either direction; "default" is the view model's own order. */
function sortEntries(entries, field, dir) {
  const sign = dir === 'desc' ? -1 : 1;
  const catIdx = (e) => { const i = TABS.indexOf(e.dataset.eqwCat); return i < 0 ? TABS.length : i; };
  const byName = (a, b) => String(a.dataset.eqwName ?? '').localeCompare(String(b.dataset.eqwName ?? ''));
  const byOrder = (a, b) => (num(a.dataset.eqwOrder) ?? 0) - (num(b.dataset.eqwOrder) ?? 0);
  const numeric = (key) => (a, b) => {
    const x = num(a.dataset[key]); const y = num(b.dataset[key]);
    if (x === null && y === null) return byOrder(a, b);
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * sign || byOrder(a, b);
  };
  const cmp = {
    default: (a, b) => byOrder(a, b) * sign,
    name: (a, b) => (byName(a, b) * sign) || byOrder(a, b),
    category: (a, b) => ((catIdx(a) - catIdx(b)) * sign) || byName(a, b),
    status: (a, b) => (String(a.dataset.eqwStatus ?? '').localeCompare(String(b.dataset.eqwStatus ?? '')) * sign) || byName(a, b),
    weight: numeric('eqwWeight'),
    quantity: numeric('eqwQty'),
  }[field] ?? byOrder;
  return [...entries].sort(cmp);
}

export function activateEquipmentWorkspace(sheet, root, { signal } = {}) {
  const ws = root?.querySelector?.('[data-eqw]');
  if (!ws || !sheet?.actor) return;
  const actor = sheet.actor;
  const st = (sheet._eqwState ??= freshState());
  st.sortSig = null; st.statusSig = null; // a fresh render restores the view model's order and status options: re-apply the viewer's sort
  st.verdicts = {}; // eligibility is authoritative state-derived: always recomputed after a render, never reused across one
  const $ = (sel, scope = ws) => scope.querySelector(sel);
  const $$ = (sel, scope = ws) => Array.from(scope.querySelectorAll(sel));
  const listEl = $('[data-eqw-list]');
  const searchEl = $('[data-eqw-search]');
  const rowName = (id) => $(`[data-eqw-row="${CSS.escape(id)}"] strong`)?.childNodes?.[0]?.textContent?.trim() ?? id;
  const catOf = (id) => $(`[data-eqw-row="${CSS.escape(id)}"]`)?.dataset.eqwCat ?? null;
  const slotLabel = (id) => $(`[data-eqw-slot="${CSS.escape(id)}"]`)?.dataset.eqwSlotLabel ?? id;

  // ------------------------------------------------------------------ view application (DOM only)
  function apply() {
    ws.classList.toggle('is-busy', st.busy);
    ws.setAttribute('aria-busy', st.busy ? 'true' : 'false');
    $$('[data-eqw-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.eqwTab === st.tab ? 'true' : 'false'));
    // keep the selected category visible in the (horizontally scrollable) tab rail
    const rail = $('.swse-eqw__tabs'); const cur = $('[data-eqw-tab][aria-selected="true"]');
    if (rail && cur) { const l = cur.offsetLeft; const r = l + cur.offsetWidth; if (l < rail.scrollLeft) rail.scrollLeft = Math.max(0, l - 8); else if (r > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = r - rail.clientWidth + 8; }
    $$('[data-eqw-slot]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.eqwSlot === st.slotId ? 'true' : 'false'));
    $$('[data-eqw-station]').forEach((b) => b.setAttribute('aria-pressed', !st.slotId && stationTab(b.dataset.eqwStation) === st.tab && st.tab !== 'all' ? 'true' : 'false'));

    const filtering = !!st.slotId;
    const q = st.search.trim().toLowerCase();
    const entries = $$('[data-eqw-entry]');
    const inTab = (e) => st.tab === 'all' || e.dataset.eqwCat === st.tab;
    const tabEntries = entries.filter(inTab);

    // status filter options = the statuses the authorities reported for this tab's entries (nothing is inferred or enumerated here)
    const statuses = [...new Set(tabEntries.map((e) => e.dataset.eqwStatus).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (st.status && !statuses.includes(st.status)) st.status = '';
    const statusEl = $('[data-eqw-status]');
    const sig = statuses.join('|');
    if (statusEl && sig !== st.statusSig) {
      st.statusSig = sig; statusEl.replaceChildren();
      const all = el('option', '', 'All statuses'); all.value = ''; statusEl.append(all);
      for (const x of statuses) { const o = el('option', '', x); o.value = x; statusEl.append(o); }
    }
    if (statusEl) statusEl.value = st.status;
    const sortEl = $('[data-eqw-sort]'); if (sortEl) sortEl.value = st.sort;
    const dirEl = $('[data-eqw-dir]');
    if (dirEl) { dirEl.setAttribute('aria-pressed', st.dir === 'desc' ? 'true' : 'false'); dirEl.setAttribute('aria-label', st.dir === 'desc' ? 'Sort descending' : 'Sort ascending'); const ic = dirEl.querySelector('i'); if (ic) ic.className = `fa-solid ${st.dir === 'desc' ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-short-wide'}`; }

    // order (DOM reorder only; entries are never duplicated or removed)
    const orderSig = `${st.sort}|${st.dir}`;
    if (listEl && orderSig !== st.sortSig) { st.sortSig = orderSig; listEl.append(...sortEntries(entries, st.sort, st.dir)); }

    let visible = 0; let incompatible = 0;
    entries.forEach((row) => {
      const id = row.dataset.eqwRow ?? null; // items only; linked droid/vehicle entries have no placement verdict
      const v = id ? st.verdicts[id] ?? null : null;
      const isIncompat = filtering && v && v.best === V.INCOMPATIBLE;
      if (isIncompat) incompatible += 1;
      const inSearch = !q || (row.dataset.eqwText ?? '').includes(q);
      const inStatus = !st.status || row.dataset.eqwStatus === st.status;
      const show = inTab(row) && inSearch && inStatus && (!isIncompat || st.showIncompatible);
      row.hidden = !show;
      if (show) visible += 1;
      if (!id) return;
      const badge = $('[data-eqw-verdict]', row);
      if (badge) {
        const showBadge = filtering && v;
        badge.hidden = !showBadge;
        badge.textContent = showBadge ? LABEL[v.best] : '';
        badge.title = showBadge ? `${LABEL[v.best]} for ${slotLabel(st.slotId)}` : '';
        badge.className = `swse-eqw__verdict${showBadge ? ` is-${v.best}` : ''}`;
      }
      $('[data-eqw-select]', row)?.setAttribute('aria-pressed', id === st.itemId ? 'true' : 'false');
      row.classList.toggle('is-selected', id === st.itemId);
    });
    const empty = $('[data-eqw-empty]');
    if (empty) { empty.hidden = visible > 0; empty.textContent = tabEntries.length ? 'Nothing matches this category, search and filter.' : (EMPTY_TAB[st.tab] ?? EMPTY_TAB.all); }
    const count = $('[data-eqw-count]');
    if (count) count.textContent = `${visible} of ${tabEntries.length} possession${tabEntries.length === 1 ? '' : 's'}`;
    const reset = $('[data-eqw-reset]');
    if (reset) reset.disabled = !st.search && !st.status && st.sort === 'default' && st.dir === 'asc';

    const ctx = $('[data-eqw-context]');
    const clear = $('[data-eqw-clear]');
    if (ctx) { ctx.hidden = !filtering; ctx.textContent = filtering ? `Placing into ${slotLabel(st.slotId)}` : ''; }
    if (clear) clear.hidden = !filtering && !st.itemId;
    const tog = $('[data-eqw-incompat-toggle]');
    if (tog) { tog.hidden = !filtering || incompatible === 0; const c = $('[data-eqw-incompat-count]', tog); if (c) c.textContent = String(incompatible); const cb = $('input', tog); if (cb) cb.checked = st.showIncompatible; }

    // inspector
    $('[data-eqw-detail-empty]').hidden = !!st.itemId;
    $$('[data-eqw-detail]').forEach((d) => {
      const on = d.dataset.eqwDetail === st.itemId;
      d.hidden = !on;
      if (!on) return;
      $$('[data-eqw-itab]', d).forEach((b) => b.setAttribute('aria-selected', b.dataset.eqwItab === st.itab ? 'true' : 'false'));
      $$('[data-eqw-pane]', d).forEach((p) => { p.hidden = p.dataset.eqwPane !== st.itab; });
    });
    if (searchEl && searchEl.value !== st.search) searchEl.value = st.search;
  }

  // ------------------------------------------------------------------ placement panel (renders only coordinator-plan results)
  async function renderPlacement(itemId) {
    const host = $(`[data-eqw-placement="${CSS.escape(itemId)}"]`);
    if (!host) return;
    host.replaceChildren();
    if (st.message?.itemId === itemId) host.append(el('p', `swse-eqw__result is-${st.message.tone}`, st.message.text));
    if (!st.slotId) {
      host.append(el('h4', 'swse-eqw__sub', 'Placement'));
      host.append(el('p', 'swse-eqw__hint', 'Choose a hand or appendage to check this weapon against:'));
      const row = el('div', 'swse-eqw__vblock');
      $$('[data-eqw-slot]').filter((b) => b.getAttribute('aria-disabled') !== 'true').forEach((b) => {
        const chip = btn('swse-eqw__chipbtn', b.dataset.eqwSlotLabel, 'fa-hand'); chip.dataset.eqwPlaceSlot = b.dataset.eqwSlot; row.append(chip);
      });
      host.append(row.childElementCount ? row : el('p', 'swse-eqw__empty', 'No usable hands or appendages are established.'));
      return;
    }
    const token = ++st.token;
    host.append(el('p', 'swse-eqw__hint', `Checking ${slotLabel(st.slotId)}…`));
    const res = await assessPlacement(actor, itemId, [st.slotId]);
    if (token !== st.token || !host.isConnected) return;
    st.verdicts[itemId] = { best: bestOf(res.results), results: res.results };
    host.replaceChildren();
    if (st.message?.itemId === itemId) host.append(el('p', `swse-eqw__result is-${st.message.tone}`, st.message.text));
    host.append(el('h4', 'swse-eqw__sub', `Placement · ${slotLabel(st.slotId)}`));
    for (const r of res.results) host.append(verdictCard(itemId, r));
    host.append(el('p', 'swse-eqw__hint', 'To use more than one hand, choose Draw above.'));
    apply();
  }

  /**
   * One compact card per coordinator result: grip + verdict label up front, a one-line summary, the authorised control (if any),
   * and every engine reason available on demand. Labels, reasons and decision ids are the coordinator's own; nothing is reinterpreted.
   */
  function verdictCard(itemId, r) {
    const card = el('div', `swse-eqw__vcard is-${r.verdict}`);
    const head = el('div', 'swse-eqw__vhead');
    head.append(el('strong', '', GRIP_LABEL(r.grip)), el('span', '', LABEL[r.verdict] ?? r.label));
    card.append(head);
    const reasons = r.reasons.map((x) => x.message).filter(Boolean);
    const summary = PLAIN[r.verdict]?.(r) ?? '';
    if (summary) card.append(el('p', 'swse-eqw__vsum', summary));
    if (r.verdict === V.AVAILABLE) {
      const go = btn('swse-concept-btn swse-concept-btn--primary', `Draw ${GRIP_LABEL(r.grip).toLowerCase()}`, 'fa-hand');
      go.dataset.eqwPlace = `${itemId}|${st.slotId}|${r.grip}`; go.disabled = st.busy; card.append(go);
    }
    if (r.verdict === V.REQUIRES_CHANGE) {
      const block = el('div', 'swse-eqw__vblock');
      block.append(el('span', 'swse-eqw__hint', 'Stow first (nothing moves automatically):'));
      for (const id of r.blockingItemIds.filter((x) => x !== itemId)) {
        const b = btn('swse-eqw__chipbtn', `Stow ${rowName(id)}`, 'fa-box-archive'); b.dataset.eqwStow = id; b.disabled = st.busy; block.append(b);
      }
      card.append(block);
    }
    // the coordinator's own label, reasons and rules-decision id, collapsed by default
    const detail = [...(r.label && r.label !== LABEL[r.verdict] ? [`Result: ${r.label}`] : []), ...reasons, ...(r.decisionId ? [`Rules decision ${r.decisionId} is pending; nothing is changed.`] : [])];
    if (detail.length) {
      const d = el('details');
      d.append(el('summary', '', 'Details'));
      for (const m of detail) d.append(el('p', '', m));
      card.append(d);
    }
    return card;
  }

  // ------------------------------------------------------------------ slot-first eligibility (coordinator plan per weapon)
  async function runEligibility() {
    const slotId = st.slotId; const token = ++st.token;
    st.verdicts = {};
    apply();
    const weapons = $$('[data-eqw-row][data-eqw-cat="weapons"]').map((r) => r.dataset.eqwRow);
    for (const id of weapons) {
      const res = await assessPlacement(actor, id, [slotId]);
      if (token !== st.token || slotId !== st.slotId || !ws.isConnected) return;
      st.verdicts[id] = { best: bestOf(res.results), results: res.results };
    }
    apply();
    if (st.itemId && catOf(st.itemId) === 'weapons') renderPlacement(st.itemId);
  }

  // ------------------------------------------------------------------ actions
  async function afterAuthoritative(ok, itemId, result, okText) {
    st.busy = false;
    if (ok) { st.message = null; await sheet.requestSurfaceRender?.({ reason: 'equipment-workspace-placement' }); return; }
    st.message = { itemId, tone: 'warn', text: result?.message || `Nothing was changed (${String(result?.reason ?? result?.status ?? 'refused').replace(/[-_]/g, ' ').toLowerCase()}).` };
    apply(); if (itemId) renderPlacement(itemId);
  }

  function selectItem(id, { fromSlot = false } = {}) {
    st.itemId = id; st.message = null;
    const cat = catOf(id);
    st.itab = cat === 'weapons' && (st.slotId || fromSlot) ? 'operations' : st.itab === 'operations' && cat !== 'weapons' ? 'details' : st.itab;
    apply();
    if (cat === 'weapons') renderPlacement(id);
  }

  ws.addEventListener('click', async (event) => {
    const t = event.target instanceof Element ? event.target : null; if (!t) return;
    let b;
    if ((b = t.closest('[data-eqw-tab]'))) {
      // choosing a category by hand leaves slot-driven filtering (selection context only; equipment state is untouched)
      st.tab = b.dataset.eqwTab; saveTab(st.tab);
      if (st.slotId) { st.slotId = null; st.verdicts = {}; st.token++; st.message = null; }
      apply(); return;
    }
    if ((b = t.closest('[data-eqw-open-asset]'))) {
      const doc = globalThis.game?.actors?.get?.(b.dataset.eqwOpenAsset);
      if (!doc?.sheet?.render) { globalThis.ui?.notifications?.warn?.('That actor has no openable sheet.'); return; }
      try { doc.sheet.render(true); } catch (err) { globalThis.ui?.notifications?.warn?.(`${doc.name} could not be opened (${err?.message ?? 'permission'}).`); }
      return;
    }
    if ((b = t.closest('[data-eqw-dir]'))) { st.dir = st.dir === 'desc' ? 'asc' : 'desc'; apply(); return; }
    if ((b = t.closest('[data-eqw-reset]'))) { st.search = ''; st.status = ''; st.sort = 'default'; st.dir = 'asc'; apply(); return; }
    if ((b = t.closest('[data-eqw-itab]'))) { st.itab = b.dataset.eqwItab; apply(); return; }
    if ((b = t.closest('[data-eqw-close]'))) { st.itemId = null; st.message = null; apply(); return; }
    if ((b = t.closest('[data-eqw-clear]'))) { st.slotId = null; st.itemId = null; st.verdicts = {}; st.token++; st.message = null; apply(); return; }
    if ((b = t.closest('[data-eqw-station]'))) { st.slotId = null; st.verdicts = {}; st.token++; st.tab = stationTab(b.dataset.eqwStation); st.itemId = null; apply(); return; }
    if ((b = t.closest('[data-eqw-slot]'))) {
      if (b.getAttribute('aria-disabled') === 'true') return;
      st.slotId = b.dataset.eqwSlot; st.tab = 'weapons'; st.itab = 'operations';
      const held = b.dataset.eqwSlotItem;
      if (held) { selectItem(held, { fromSlot: true }); } else { st.itemId = null; apply(); }
      runEligibility(); return;
    }
    if ((b = t.closest('[data-eqw-select]'))) { selectItem(b.dataset.eqwSelect); return; }
    if ((b = t.closest('[data-eqw-place-slot]'))) { st.slotId = b.dataset.eqwPlaceSlot; apply(); if (st.itemId) renderPlacement(st.itemId); runEligibility(); return; }
    if ((b = t.closest('[data-eqw-place]'))) {
      if (st.busy) return;
      const [itemId, slotId, grip] = b.dataset.eqwPlace.split('|');
      st.busy = true; apply();
      let result; try { result = await submitPlacement(actor, itemId, [slotId], grip); } catch (err) { result = { ok: false, message: String(err?.message ?? err) }; }
      await afterAuthoritative(result?.ok === true, itemId, result); return;
    }
    if ((b = t.closest('[data-eqw-stow]'))) {
      if (st.busy) return;
      st.busy = true; apply();
      const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
      let result; try { result = await InventoryEngine.setWeaponReadied(actor, b.dataset.eqwStow, false); } catch (err) { result = { ok: false, message: String(err?.message ?? err) }; }
      await afterAuthoritative(result?.ok === true, st.itemId, result); return;
    }
    if ((b = t.closest('[data-eqw-action="reload"]'))) {
      if (st.busy) return;
      const id = b.dataset.itemId; st.busy = true; apply();
      let result; try { result = await sheet._executeReloadCombatWorkflow?.({ action: { id: 'reload', weaponId: id }, weaponId: id }); } catch (err) { console.warn('[SWSE] workspace reload failed', err); }
      st.busy = false; apply();
      if (result && result.skipped !== true) await sheet.requestSurfaceRender?.({ reason: 'equipment-workspace-reload' });
    }
  }, { signal });

  ws.addEventListener('error', (event) => { if (event.target instanceof HTMLImageElement && event.target.matches('[data-eqw-img]')) markBrokenArt(event.target); }, { capture: true, signal });
  // images that already failed before these listeners attached
  $$('img[data-eqw-img]').forEach((img) => { if (img.complete && img.naturalWidth === 0) markBrokenArt(img); });

  ws.addEventListener('input', (event) => {
    if (event.target === searchEl) { st.search = searchEl.value; st.selStart = searchEl.selectionStart; st.selEnd = searchEl.selectionEnd; apply(); }
    else if (event.target?.matches?.('[data-eqw-show-incompatible]')) { st.showIncompatible = event.target.checked; apply(); }
  }, { signal });
  ws.addEventListener('change', (event) => {
    const t = event.target;
    if (t?.matches?.('[data-eqw-show-incompatible]')) { st.showIncompatible = t.checked; apply(); }
    else if (t?.matches?.('[data-eqw-status]')) { st.status = t.value; apply(); }
    else if (t?.matches?.('[data-eqw-sort]')) { st.sort = t.value; apply(); }
  }, { signal });
  ws.addEventListener('keydown', (event) => { if (event.key === 'Escape' && (st.slotId || st.itemId)) { event.stopPropagation(); st.slotId = null; st.itemId = null; st.verdicts = {}; st.token++; apply(); } }, { signal });
  searchEl?.addEventListener('focus', () => { st.searchFocus = true; }, { signal });
  searchEl?.addEventListener('blur', () => { st.searchFocus = false; }, { signal });
  searchEl?.addEventListener('keyup', () => { st.selStart = searchEl.selectionStart; st.selEnd = searchEl.selectionEnd; }, { signal });
  listEl?.addEventListener('scroll', () => { st.listScroll = listEl.scrollTop; }, { signal, passive: true });

  // ------------------------------------------------------------------ restore after render
  // a selection whose item or slot no longer exists (removed by another consumer) is dropped
  if (st.itemId && !$(`[data-eqw-row="${CSS.escape(st.itemId)}"]`)) st.itemId = null;
  if (st.slotId && !$(`[data-eqw-slot="${CSS.escape(st.slotId)}"]`)) st.slotId = null;
  apply();
  if (listEl) listEl.scrollTop = st.listScroll;
  if (searchEl && st.searchFocus) { searchEl.focus({ preventScroll: true }); try { searchEl.setSelectionRange(st.selStart ?? searchEl.value.length, st.selEnd ?? searchEl.value.length); } catch (_e) { /* not selectable */ } }
  if (st.itemId && catOf(st.itemId) === 'weapons') renderPlacement(st.itemId);
  if (st.slotId) runEligibility();
}

export default { activateEquipmentWorkspace };
