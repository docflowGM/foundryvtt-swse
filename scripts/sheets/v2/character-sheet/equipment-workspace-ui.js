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
const ACTION_LABEL = (a) => (a ? `${String(a.direction ?? 'draw')} costs a ${String(a.actionType)} action` : 'no action cost');

function freshState() {
  return { tab: 'all', search: '', slotId: null, itemId: null, itab: 'details', showIncompatible: false, listScroll: 0, searchFocus: false, selStart: null, selEnd: null, verdicts: {}, busy: false, token: 0, message: null };
}

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

export function activateEquipmentWorkspace(sheet, root, { signal } = {}) {
  const ws = root?.querySelector?.('[data-eqw]');
  if (!ws || !sheet?.actor) return;
  const actor = sheet.actor;
  const st = (sheet._eqwState ??= freshState());
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
    $$('[data-eqw-slot]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.eqwSlot === st.slotId ? 'true' : 'false'));
    $$('[data-eqw-station]').forEach((b) => b.setAttribute('aria-pressed', !st.slotId && b.dataset.eqwStation === st.tab && st.tab !== 'all' ? 'true' : 'false'));

    const filtering = !!st.slotId;
    const q = st.search.trim().toLowerCase();
    let visible = 0; let incompatible = 0;
    $$('[data-eqw-row]').forEach((row) => {
      const id = row.dataset.eqwRow;
      const v = st.verdicts[id] ?? null;
      const isIncompat = filtering && v && v.best === V.INCOMPATIBLE;
      if (isIncompat) incompatible += 1;
      const inTab = st.tab === 'all' || row.dataset.eqwCat === st.tab;
      const inSearch = !q || (row.dataset.eqwText ?? '').includes(q);
      const show = inTab && inSearch && (!isIncompat || st.showIncompatible);
      row.hidden = !show;
      if (show) visible += 1;
      const badge = $('[data-eqw-verdict]', row);
      if (badge) {
        const showBadge = filtering && v;
        badge.hidden = !showBadge;
        badge.textContent = showBadge ? LABEL[v.best] : '';
        badge.className = `swse-eqw__verdict${showBadge ? ` is-${v.best}` : ''}`;
      }
      $('[data-eqw-select]', row)?.setAttribute('aria-pressed', id === st.itemId ? 'true' : 'false');
      row.classList.toggle('is-selected', id === st.itemId);
    });
    const empty = $('[data-eqw-empty]');
    if (empty) empty.hidden = visible > 0;

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
      host.append(el('p', 'swse-eqw__hint', 'Choose where to draw this weapon:'));
      const row = el('div', 'swse-eqw__actions');
      $$('[data-eqw-slot]').filter((b) => b.getAttribute('aria-disabled') !== 'true').forEach((b) => {
        const btn = el('button', 'swse-concept-btn', b.dataset.eqwSlotLabel); btn.type = 'button'; btn.dataset.eqwPlaceSlot = b.dataset.eqwSlot; row.append(btn);
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
    host.append(el('h4', 'swse-eqw__sub', `Into ${slotLabel(st.slotId)}`));
    for (const r of res.results) {
      const box = el('div', `swse-eqw__verdict-box is-${r.verdict}`);
      box.append(el('strong', '', `${r.grip === 'two-handed' ? 'Two-handed' : 'One-handed'}: ${r.label}`));
      if (r.verdict === V.AVAILABLE) {
        box.append(el('small', '', ACTION_LABEL(r.action)));
        const go = el('button', 'swse-concept-btn swse-concept-btn--primary', `Draw ${r.grip === 'two-handed' ? 'two-handed' : 'one-handed'}`);
        go.type = 'button'; go.dataset.eqwPlace = `${itemId}|${st.slotId}|${r.grip}`; go.disabled = st.busy; box.append(go);
      }
      for (const reason of r.reasons.slice(0, 3)) box.append(el('small', 'swse-eqw__reason', reason.message));
      if (r.decisionId) box.append(el('small', 'swse-eqw__reason', `Rules decision ${r.decisionId} is pending; nothing is changed.`));
      if (r.verdict === V.REQUIRES_CHANGE) {
        box.append(el('small', '', 'Stow the conflicting item first (nothing is moved automatically):'));
        for (const id of r.blockingItemIds.filter((x) => x !== itemId)) {
          const b = el('button', 'swse-concept-btn', `Stow ${rowName(id)}`); b.type = 'button'; b.dataset.eqwStow = id; b.disabled = st.busy; box.append(b);
        }
      }
      host.append(box);
    }
    host.append(el('small', 'swse-eqw__hint', 'A grip that needs more hands than this slot offers is chosen with Draw in the actions above, which asks for the hands.'));
    apply();
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
    if ((b = t.closest('[data-eqw-tab]'))) { st.tab = b.dataset.eqwTab; apply(); return; }
    if ((b = t.closest('[data-eqw-itab]'))) { st.itab = b.dataset.eqwItab; apply(); return; }
    if ((b = t.closest('[data-eqw-clear]'))) { st.slotId = null; st.itemId = null; st.verdicts = {}; st.token++; st.message = null; apply(); return; }
    if ((b = t.closest('[data-eqw-station]'))) { st.slotId = null; st.verdicts = {}; st.token++; st.tab = b.dataset.eqwStation; st.itemId = null; apply(); return; }
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

  ws.addEventListener('input', (event) => {
    if (event.target === searchEl) { st.search = searchEl.value; st.selStart = searchEl.selectionStart; st.selEnd = searchEl.selectionEnd; apply(); }
    else if (event.target?.matches?.('[data-eqw-show-incompatible]')) { st.showIncompatible = event.target.checked; apply(); }
  }, { signal });
  ws.addEventListener('change', (event) => { if (event.target?.matches?.('[data-eqw-show-incompatible]')) { st.showIncompatible = event.target.checked; apply(); } }, { signal });
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
