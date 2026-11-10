/**
 * Combat tab "Active Attacks" view model -- PRESENTATION ONLY.
 *
 * Every number on a weapon card is the Combat Loadout Preview's own output (combat/rolls/loadout-preview.js), the SAME map the Equipment tab shows, so
 * the two tabs agree by construction. This module formats and orders; it owns no rule and recomputes nothing:
 *   To Hit / Damage min-max / formula / grip / profile   <- the preview (production attack + damage authorities)
 *   ready vs held                                        <- the preview's readiness facts (never `system.equipped`)
 *   ammunition / power / range label / visual rail       <- the per-weapon attack view the sheet already builds (createAttackViewBuilder)
 *   Unarmed Strike                                       <- the sheet's existing unarmed attack entry (rolled by roll-unarmed-attack)
 * A weapon whose preview is unresolved shows an explicit unavailable state with the preview's reason. It never falls back to an Item damage field.
 * A held weapon that is not readied is listed, marked "not drawn", and cannot be rolled from here. One two-handed weapon is one card.
 */
import { boundsOfDiceExpression } from '/systems/foundryvtt-swse/scripts/engine/combat/dice-expression-bounds.js';

const asArray = (v) => (Array.isArray(v) ? v : []);
const signed = (n) => { const v = Number(n); return Number.isFinite(v) ? (v >= 0 ? `+${v}` : `${v}`) : '—'; };
const cap = (s) => String(s ?? '').replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

function critLabelOf(critMultiplier, fallback) {
  if (Number.isFinite(Number(critMultiplier)) && Number(critMultiplier) > 1) return `Crit ×${Number(critMultiplier)}`;
  const f = String(fallback ?? '').replace(/^x/i, '×');
  return f ? `Crit ${f}` : '';
}

/** One weapon card from a preview (+ the sheet's per-weapon attack view for ammo / power / visuals). */
function weaponCard({ weaponId, name, preview, view, ready, attackLocked }) {
  const pv = preview ?? null;
  const established = !!pv && pv.calculationStatus !== 'unresolved';
  const hasRange = established && Number.isFinite(pv.minimumDamage) && Number.isFinite(pv.maximumDamage);
  const lockReason = attackLocked ? 'Attacks are locked by a combat condition' : (!ready ? 'Draw this weapon first: it is held but not readied' : (!established ? (pv?.explanation || 'Attack preview unavailable') : ''));
  return {
    key: `weapon:${weaponId}`, kind: 'weapon', weaponId, name: name || pv?.name || view?.weaponName || 'Weapon',
    ready, stateLabel: ready ? 'Readied' : 'Held · not drawn', stateTone: ready ? 'ready' : 'held',
    gripLabel: pv?.gripLabel ?? '',
    toHitLabel: established ? signed(pv.attackBonus) : '—',
    damageRangeLabel: hasRange ? `${pv.minimumDamage}–${pv.maximumDamage}` : '—',
    damageFormula: established ? (pv.damageFormula ?? '') : '',
    profileNote: pv?.profileLabel ? `${pv.profileLabel}${pv.profileIsDefault === false ? '' : (pv.otherProfileCount > 0 ? ' (default)' : '')}${pv.otherProfileCount > 0 ? ` · +${pv.otherProfileCount} mode${pv.otherProfileCount === 1 ? '' : 's'}` : ''}` : '',
    unavailable: !established,
    unavailableReason: !established ? (pv?.explanation || (pv ? 'Attack preview unresolved' : 'Attack preview unavailable')) : '',
    variable: established && pv.calculationStatus === 'variable',
    variableNote: established && pv.calculationStatus === 'variable' ? (pv.explanation || 'Variable / context required') : '',
    critLabel: established ? critLabelOf(pv.critMultiplier, view?.critMult) : '',
    branchLabel: pv?.branch ? cap(pv.branch) : '',
    typeLabel: asArray(pv?.damageTypes).length ? asArray(pv.damageTypes).map(cap).join(' / ') : (view?.damageType ? cap(view.damageType) : ''),
    rangeLabel: view?.rangeLabel ?? '',
    ammoLabel: view?.ammoLabel ?? '',
    powerLabel: view?.weaponPowerSource?.stateLabel ?? '',
    configLabel: view?.weaponConfiguration?.currentLabel ?? '',
    railStyle: view?.weaponRailStyle ?? '', visualKind: view?.visualKind ?? '',
    // the existing per-weapon operation views the sheet already builds (draw/stow, blade activation, configuration, power source); rendered with the same data-action handlers
    readiness: view?.weaponReadiness ?? null, configuration: view?.weaponConfiguration ?? null, power: view?.weaponPowerSource ?? null,
    canRoll: ready && !attackLocked && established,
    rollDisabledReason: lockReason,
    occupiedAppendages: asArray(pv?.occupiedAppendageIds).length
  };
}

/** The Unarmed Strike card: the sheet's own unarmed entry; the range is shown only when its formula is a plain dice expression. */
function unarmedCard(unarmed, { attackLocked }) {
  const formula = String(unarmed.damageFormula ?? unarmed.damage ?? '').trim();
  const bounds = boundsOfDiceExpression(formula);
  return {
    key: 'unarmed', kind: 'unarmed', weaponId: '', name: unarmed.name || 'Unarmed Strike',
    ready: true, stateLabel: 'Always available', stateTone: 'ready', gripLabel: '',
    toHitLabel: signed(unarmed.attackTotal ?? unarmed.attackBonus), damageRangeLabel: bounds ? `${Math.max(1, bounds.min)}–${bounds.max}` : '—',
    damageFormula: formula, profileNote: '', unavailable: false, unavailableReason: '', variable: false, variableNote: '',
    critLabel: critLabelOf(null, unarmed.critMult), branchLabel: 'Melee', typeLabel: unarmed.damageType ? cap(unarmed.damageType) : '',
    rangeLabel: '', ammoLabel: '', powerLabel: '', configLabel: unarmed.martialArtsStep ? `Martial Arts ${unarmed.martialArtsStep}` : '',
    railStyle: unarmed.weaponRailStyle ?? '', visualKind: 'unarmed', canRoll: !attackLocked, rollDisabledReason: attackLocked ? 'Attacks are locked by a combat condition' : '',
    occupiedAppendages: 0
  };
}

/**
 * @param {{readyViews?:object[], heldViews?:Map<string,object>, unarmed?:object|null, previews?:Map<string,object>|null, attackLocked?:boolean, attackLockLabel?:string}} input
 *   readyViews  the sheet's attack views of READIED weapons (derived attack list through the attack view builder)
 *   heldViews   attack views for held-but-not-ready weapons, keyed by weapon id (built by the caller from the same builder)
 *   previews    buildLoadoutPreviews(actor): the single preview map shared with the Equipment tab
 */
export function buildCombatLoadout({ readyViews = [], heldViews = new Map(), unarmed = null, previews = null, attackLocked = false, attackLockLabel = '' } = {}) {
  const map = previews instanceof Map ? previews : new Map();
  const cards = [];
  const seen = new Set();
  // 1. currently readied weapons (one card per weapon: a two-handed weapon is not duplicated per hand)
  for (const v of asArray(readyViews)) {
    const id = v?.weaponId; if (!id || seen.has(id)) continue; seen.add(id);
    const pv = map.get(id) ?? null;
    cards.push(weaponCard({ weaponId: id, name: v.weaponName || v.name, preview: pv, view: v, ready: pv ? pv.ready === true : true, attackLocked }));
  }
  // 2. other held attack sources, clearly marked as not drawn (readiness comes from the preview / readiness authority, never from `equipped`)
  for (const [id, pv] of map) {
    if (seen.has(id)) continue;
    seen.add(id);
    cards.push(weaponCard({ weaponId: id, name: pv.name, preview: pv, view: heldViews.get(id) ?? null, ready: pv.ready === true, attackLocked }));
  }
  // readied cards first, then held; stable within each
  cards.sort((a, b) => (a.ready === b.ready ? 0 : a.ready ? -1 : 1));
  // 3. Unarmed Strike
  if (unarmed) cards.push(unarmedCard(unarmed, { attackLocked }));
  return { cards, hasCards: cards.length > 0, count: cards.length, attackLocked, attackLockLabel, previewed: map.size > 0 };
}

export default { buildCombatLoadout };
