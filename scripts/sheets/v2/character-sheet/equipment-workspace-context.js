/**
 * Equipment workspace view model (Gear tab) -- PRESENTATION ADAPTER ONLY.
 *
 * Maps the existing equipment authorities into display data. It owns no rule and no state:
 *   anatomy / appendages / occupancy / grip / posture / gates   readCombatReadiness() -> readActorEquipmentState()   (engine/equipment/*)
 *   weapon readiness facts                                      describeWeaponReadiness()
 *   inventory rows, activation, armor/shield/implant flags       the rows the sheet already built (RowTransformers / concept-context)
 *   weapon operations (draw/stow, ignite, configure, power)     the per-row views the sheet already built (weaponReadiness, ...)
 *
 * It never evaluates legality, hands, grips, bonuses, capacity or action cost. Grouping into tabs and ordering are presentation only and use
 * flags that the authorities already resolved on each row (type, isEnergyShield, isImplant); nothing is inferred from names.
 * Placement eligibility is NOT computed here: it comes from the read-only coordinator plan (equipment-workspace-placement.js) on demand.
 */
import { EncumbranceEngine } from '/systems/foundryvtt-swse/scripts/engine/encumbrance/EncumbranceEngine.js';
import { readCombatReadiness, describeWeaponReadiness } from '/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js';

/** Possessions browser tabs, in display order. Droids/Vehicles are linked actors (Asset Bay association), the rest are owned Items. */
export const WORKSPACE_TABS = Object.freeze([
  { id: 'weapons', label: 'Weapons', icon: 'fa-crosshairs' },
  { id: 'armor', label: 'Armor', icon: 'fa-user-shield' },
  { id: 'shields', label: 'Shields', icon: 'fa-shield-halved' },
  { id: 'gear', label: 'Gear', icon: 'fa-toolbox' },
  { id: 'droids', label: 'Droids', icon: 'fa-robot' },
  { id: 'vehicles', label: 'Vehicles', icon: 'fa-rocket' },
  { id: 'all', label: 'All', icon: 'fa-layer-group' },
]);
const TAB_ORDER = WORKSPACE_TABS.filter((t) => t.id !== 'all').map((t) => t.id);

/** Browser tab of a resolved row category: implants are general gear in the browser (the row keeps its implant flags). */
export const tabOfCategory = (category) => (category === 'implants' ? 'gear' : category);

// ---- display artwork (presentation only; item data is never changed) ----
// Foundry's core `icons/svg/*` set is the generic placeholder most compendium items ship with (sword.svg, shield.svg, ...). It carries no
// item-specific art, so the workspace shows its themed category glyph instead. Any other image path is treated as real artwork; if it fails
// to load, equipment-workspace-ui.js swaps the tile to the same glyph. Glyphs are Font Awesome classes, which Foundry already ships.
const CATEGORY_GLYPH = Object.freeze({ droids: 'fa-robot', vehicles: 'fa-rocket', weapons: 'fa-gun', armor: 'fa-user-shield', shields: 'fa-shield-halved', implants: 'fa-microchip', gear: 'fa-toolbox' });
const isGenericArt = (src) => !src || /^\/?(?:images\/)?icons\/svg\//.test(String(src));
export function artOf(src, glyph) { return { src: isGenericArt(src) ? null : String(src), glyph }; }
const glyphOfRow = (row, category) => (row?.isLightsaber === true || row?.weaponReadiness?.isLightsaber === true ? 'fa-jedi' : CATEGORY_GLYPH[category] ?? 'fa-box');
/** Display glyph of an appendage, keyed only by the kind string the anatomy authority already resolved. */
function glyphOfAppendage(kind) {
  const k = String(kind ?? '').toLowerCase();
  if (/arm|hand/.test(k)) return 'fa-hand';
  if (/claw|grasp|grip/.test(k)) return 'fa-hand-back-fist';
  if (/tool|probe|instrument|manipulator/.test(k)) return 'fa-screwdriver-wrench';
  return 'fa-circle-nodes';
}

const asArray = (v) => (Array.isArray(v) ? v : []);
const isWeaponType = (t) => ['weapon', 'lightsaber'].includes(String(t ?? '').toLowerCase());
const signed = (n) => { const v = Number(n); return Number.isFinite(v) ? (v >= 0 ? `+${v}` : `${v}`) : ''; };
const humanize = (id) => String(id ?? '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Tab bucket of an already-resolved inventory row. Uses the row flags the authorities set; never names. */
export function categoryOfRow(row) {
  const type = String(row?.type ?? '').toLowerCase();
  if (isWeaponType(type)) return 'weapons';
  if (type === 'armor') return row?.isEnergyShield === true ? 'shields' : 'armor';
  if (row?.isImplant === true || row?.isActiveImplant === true) return 'implants';
  return 'gear';
}

const POSTURE_LABEL = Object.freeze({ STOWED: 'Stowed', EQUIPPED: 'Held', READIED: 'Drawn' });

/** Tone of a weapon state chip, derived from the readiness facts the engine returned. */
function weaponTone(r) {
  if (!r) return 'neutral';
  if (r.pending) return 'neutral';
  if (r.gates?.length || r.status === 'indeterminate') return 'warn';
  if (r.status === 'blocked' || r.status === 'contradictory') return 'conflict';
  if (r.ready) return 'ready';
  if (r.effectivePosture === 'EQUIPPED') return 'held';
  return 'stowed';
}

function weaponStatus(row, r) {
  const wr = row.weaponReadiness ?? null;
  if (wr?.alwaysReadied) return { label: wr.stateLabel, tone: 'ready', reason: null };
  if (wr?.needsSetup) return { label: 'Not set up', tone: 'warn', reason: 'This weapon has no recorded position yet; recording it as stowed costs no action.' };
  if (!r) return { label: wr?.stateLabel ?? 'Unknown', tone: 'neutral', reason: null };
  const tone = weaponTone(r);
  let label;
  if (r.effectivePosture) label = POSTURE_LABEL[r.effectivePosture] ?? humanize(r.effectivePosture);
  else if (r.gates?.length) label = 'Withheld';
  else if (r.status === 'undeclared') label = 'Not set up';
  else label = humanize(r.status);
  // the reason is the engine's own gate / status code list; codes are shown, never reinterpreted
  const reason = r.ready ? null : (r.gates?.length ? `Withheld: ${r.gates.map(humanize).join(', ')}` : (r.status && !['established', 'undeclared'].includes(r.status) ? `Posture ${humanize(r.status)}` : null));
  return { label, tone, reason };
}

function wornStatus(row) {
  const cat = categoryOfRow(row);
  if (cat === 'implants') return { label: row.isActiveImplant ? 'Active' : row.installed ? 'Installed' : 'Carried', tone: row.isActiveImplant ? 'ready' : row.installed ? 'held' : 'stowed' };
  if (cat === 'armor') return { label: row.equipped ? 'Worn' : 'Carried', tone: row.equipped ? 'held' : 'stowed' };
  if (cat === 'shields') return { label: row.equipped ? (row.activated ? 'Worn · Active' : 'Worn') : 'Carried', tone: row.equipped ? (row.activated ? 'ready' : 'held') : 'stowed' };
  return { label: row.equipped ? 'Equipped' : 'Carried', tone: row.equipped ? 'held' : 'stowed' };
}

/**
 * @param {Actor} actor
 * @param {{groups?:object[], attackViews?:Map<string,object>, isGM?:boolean, readiness?:object, unarmed?:object, assets?:object[]}} input
 *   groups      the sheet's inventory groups (rows already carry weaponReadiness / weaponConfiguration / weaponPowerSource / modificationV2)
 *   attackViews the sheet's attack views keyed by weapon id (authoritative attack/damage/range/ammo display values)
 *   assets      linked droid / vehicle records from the Asset Bay association authority (listOwnedAssets); never inferred from world actors
 *   readiness   optional pre-read readCombatReadiness(actor) (tests / callers that already hold one)
 */
export function buildEquipmentWorkspace(actor, { groups = [], attackViews = new Map(), isGM = false, readiness = null, unarmed = null, assets = [] } = {}) {
  let rd = readiness;
  if (!rd) { try { rd = readCombatReadiness(actor); } catch (_err) { rd = null; } }
  const state = rd?.state ?? null;
  const notices = [];

  // one entry per owned Item id (a row repeated across sheet groups must not be listed twice)
  const seenRows = new Set();
  const rows = groups.flatMap((g) => asArray(g.entries)).filter((r) => r?.id && !seenRows.has(r.id) && seenRows.add(r.id));

  // ---- notices (engine-sourced messages only) ----
  const anatomy = state?.anatomy ?? null;
  if (!state) notices.push({ tone: 'warn', text: 'Equipment state could not be read; placement controls are unavailable.' });
  else {
    if (anatomy.status !== 'resolved') {
      const msg = asArray(anatomy.issues).find((i) => i.severity === 'blocking') ?? asArray(anatomy.issues)[0];
      notices.push({ tone: 'warn', text: `Anatomy is ${anatomy.status}${msg ? `: ${msg.message}` : '.'}` });
    }
    if (state.droidRules?.confidence === 'CONTRADICTORY') notices.push({ tone: 'conflict', text: 'This actor carries contradictory Droid classification evidence, so no anatomy is certified and drawing a weapon is withheld.' });
    // a Droid-rules actor (NPC-type Droid Follower included) has no biological species: its anatomy is the installed-component evidence (stated above when unresolved)
    if (rd?.speciesEvidence?.status && rd.speciesEvidence.status !== 'resolved' && state.droidRules?.isDroid !== true) notices.push({ tone: 'warn', text: `Species evidence unavailable (${rd.speciesEvidence.reason ?? rd.speciesEvidence.status}); drawing a weapon is withheld until it resolves.` });
    if (state.transactions?.journalStatus === 'invalid') notices.push({ tone: 'conflict', text: 'The equipment transaction journal is unreadable; readiness is withheld.' });
    if (state.conflicts?.length) notices.push({ tone: 'conflict', text: 'Two items claim the same hand or appendage. Nothing was moved automatically; stow one of them.' });
  }
  if (!isGM) notices.push({ tone: 'info', text: 'Draw and stow are carried out by the equipment authority on a GM client. From a player client the request is refused and nothing changes.' });

  // ---- items ----
  const items = rows.map((row) => {
    const category = categoryOfRow(row);
    const isWeapon = category === 'weapons';
    // authoritative quantity (never `|| 1`: a recorded 0 must stay 0 so the list, sort and carried weight agree)
    const quantity = EncumbranceEngine.itemQuantity({ system: { quantity: row.quantity } });
    const r = isWeapon ? describeWeaponReadiness(rd, row.id, null) : null;
    const status = isWeapon ? weaponStatus(row, r) : { ...wornStatus(row), reason: null };
    const occupancy = r?.occupancy ?? null;
    const heldIn = occupancy ? asArray(occupancy.appendageIds).map(humanize) : [];
    const attack = isWeapon ? attackViews.get(row.id) ?? null : null;
    const wr = row.weaponReadiness ?? null;
    return {
      id: row.id,
      name: row.name,
      img: row.img,
      art: artOf(row.img, glyphOfRow(row, category)),
      category,
      kind: 'item', key: `item:${row.id}`, tab: tabOfCategory(category),
      // player-facing label: an energy shield is an armor-type item mechanically but is presented as a personal shield (classification unchanged)
      typeLabel: category === 'shields' ? 'Personal shield' : row.typeLabel,
      quantity,
      showQuantity: quantity !== 1,
      weight: row.weight,
      value: row.value,
      tags: asArray(row.tags),
      isWeapon,
      isLightsaber: row.isLightsaber === true,
      isNatural: row.isNaturalWeapon === true || wr?.alwaysReadied === true,
      status,
      heldIn,
      heldInLabel: heldIn.length ? heldIn.join(' + ') : '',
      gripLabel: r?.grip?.requiredHands ? `${r.grip.requiredHands}-handed` : '',
      attackReady: r?.ready === true,
      effectivePosture: r?.effectivePosture ?? null,
      activated: row.activated === true,
      activationStateLabel: row.activationStateLabel || '',
      ammoLabel: attack?.ammoLabel || '',
      attack: attack ? {
        hasProfile: attack.hasAttackProfile !== false && attack.attackTotal !== undefined,
        attackTotal: attack.attackTotal, damageFormula: attack.damageFormula, damageType: attack.damageType,
        critRange: attack.critRange, critMult: attack.critMult, rangeLabel: attack.rangeLabel,
      } : null,
      weaponReadiness: wr,
      weaponConfiguration: row.weaponConfiguration ?? null,
      weaponPowerSource: row.weaponPowerSource ?? null,
      modifications: asArray(row.modificationV2?.installed),
      hasModifications: row.modificationV2?.hasInstalled === true,
      // resolveArmorData() output already on the row (armor SSOT): displayed as-is, never recomputed
      armorStats: category === 'armor' || category === 'shields' ? (row.armorStats ?? null) : null,
      shieldRating: row.shieldRating, currentSR: row.currentSR, isEnergyShield: row.isEnergyShield === true,
      canToggleEquip: row.canToggleEquip !== false && !isWeapon,
      equipped: row.equipped === true,
      canToggleActivated: !isWeapon && row.canToggleActivated === true,
      activationLabel: row.activationLabel,
      isImplant: row.isImplant === true, isActiveImplant: row.isActiveImplant === true,
      implantStatusLabel: row.implantStatusLabel || '',
      canCustomize: row.canEdit === true && ['weapons', 'armor', 'shields', 'gear'].includes(category),
      canEdit: row.canEdit === true, canDelete: row.canDelete === true,
      alchemy: row.alchemy ?? null,
      canOpenForceAlchemy: row.canOpenForceAlchemy === true,
      statusLabel: status.label,
      searchText: `${row.name ?? ''} ${row.typeLabel ?? ''} ${asArray(row.tags).join(' ')}`.toLowerCase(),
    };
  });

  // ---- slots: one per authoritative appendage; occupancy comes from the resolved assignments ----
  const itemById = new Map(items.map((i) => [i.id, i]));
  const assignments = asArray(state?.occupancy?.assignments);
  const byAppendage = new Map();
  for (const a of assignments) for (const id of asArray(a.appendageIds)) byAppendage.set(id, a);
  const conflictAppendages = new Set(asArray(state?.conflicts).map((c) => c.appendageId));
  const slots = asArray(state?.anatomy?.appendages).map((app) => {
    const a = byAppendage.get(app.id) ?? null;
    const it = a ? itemById.get(a.itemId) ?? null : null;
    const fs = app.functionalState ?? 'unresolved';
    const unavailable = fs === 'disabled' || fs === 'missing';
    const withSlotIds = a ? asArray(a.appendageIds).filter((id) => id !== app.id) : [];
    // Visual anchor for an item held across several appendages: the first appendage in the assignment's own (authority) order shows the
    // item; the others show "occupied by". A display convention only; grip and occupancy are never recomputed.
    const anchorId = a ? asArray(a.appendageIds)[0] ?? app.id : null;
    return {
      id: app.id,
      label: humanize(app.id),
      kind: app.kind ?? null,
      glyph: glyphOfAppendage(app.kind),
      functionalState: fs,
      stateLabel: fs === 'functional' ? '' : humanize(fs),
      unavailable,
      conflict: conflictAppendages.has(app.id),
      empty: !a,
      occupant: a ? {
        itemId: a.itemId,
        name: it?.name ?? 'Unknown item',
        art: it?.art ?? artOf(null, 'fa-box'),
        purpose: a.purpose ?? null,
        purposeLabel: a.purpose ? humanize(a.purpose) : '',
        status: a.status ?? null,
        // the item's own readiness label/tone (Drawn, Held, ...) as already derived above from describeWeaponReadiness
        stateLabel: it?.status?.label ?? '',
        tone: it?.status?.tone ?? 'neutral',
        activated: it?.activated === true || it?.weaponReadiness?.activated === true,
        shared: withSlotIds.length > 0,
        withSlotIds,
        withSlotLabels: withSlotIds.map(humanize).join(' + '),
        isAnchor: anchorId === app.id,
        anchorLabel: anchorId ? humanize(anchorId) : '',
        // display of the sheet's authoritative attack view for the held weapon (KOTOR-style per-hand readout); never computed here
        attackLabel: attackViews.get(a.itemId)?.attackTotal !== undefined ? signed(attackViews.get(a.itemId).attackTotal) : '',
        damageLabel: attackViews.get(a.itemId)?.damageFormula ?? '',
      } : null,
    };
  });

  // ---- linked droids / vehicles: the Asset Bay association records, shown as actor references (never converted to Items, never carried weight) ----
  const seenAssets = new Set();
  const linked = asArray(assets).map((a) => {
    const kind = a?.bayMode === 'shipyard' ? 'vehicle' : 'droid';
    const tab = kind === 'vehicle' ? 'vehicles' : 'droids';
    const id = a?.actorId ?? a?.id ?? '';
    const linkedOk = a?.isLinked === true;
    let canOpen = linkedOk && a?.canOpenSheet === true;
    if (canOpen) { try { const doc = globalThis.game?.actors?.get?.(id); if (doc && typeof doc.testUserPermission === 'function' && globalThis.game?.user) canOpen = doc.testUserPermission(globalThis.game.user, 'LIMITED') === true; } catch (_e) { canOpen = false; } }
    return {
      kind, key: `${kind}:${a?.uuid || id}`, id, tab, category: tab, isAsset: true,
      name: a?.name || 'Unlinked Asset',
      art: artOf(a?.img, CATEGORY_GLYPH[tab]),
      typeLabel: a?.kindLabel || (kind === 'vehicle' ? 'Ship / Vehicle' : 'Droid'),
      detail: a?.detail || '', summary: a?.status || '',
      // 'Linked' is the Asset Bay association; ownership is a separate, canonical fact: an association without recorded ownership says so
      status: !linkedOk ? { label: 'Link unresolved', tone: 'warn' } : (['OWNER', 'CO_OWNER'].includes(a?.ownershipStatus) || !a?.ownershipStatus ? { label: 'Linked', tone: 'held' } : { label: 'Linked · ownership not established', tone: 'warn' }),
      statusLabel: !linkedOk ? 'Link unresolved' : (['OWNER', 'CO_OWNER'].includes(a?.ownershipStatus) || !a?.ownershipStatus ? 'Linked' : 'Linked · ownership not established'),
      ownershipLabel: a?.ownershipLabel ?? '',
      quantity: null, weight: null, canOpen,
      searchText: `${a?.name ?? ''} ${a?.kindLabel ?? ''} ${a?.detail ?? ''}`.toLowerCase(),
    };
  }).filter((a) => a.id && !seenAssets.has(a.key) && seenAssets.add(a.key));

  // ---- one presentation list, no second collection: default order = tab order, then name ----
  const entries = [...items, ...linked]
    .sort((a, b) => (TAB_ORDER.indexOf(a.tab) - TAB_ORDER.indexOf(b.tab)) || String(a.name).localeCompare(String(b.name)))
    .map((e, i) => ({ ...e, order: i, sortName: String(e.name ?? '').toLowerCase() }));

  const counts = { all: entries.length };
  for (const t of TAB_ORDER) counts[t] = entries.filter((e) => e.tab === t).length;
  const tabs = WORKSPACE_TABS.map((t) => ({ ...t, count: counts[t.id] ?? 0 }));

  // ---- worn stations (armor / shield / implant). No canonical body-slot model exists beyond the armor predicate and implant flags, so these are
  // display groupings of rows the authorities already classified, not mechanical slots. ----
  const worn = {
    armor: items.filter((i) => i.category === 'armor' && i.equipped),
    shields: items.filter((i) => i.category === 'shields' && i.equipped),
    implants: items.filter((i) => i.category === 'implants' && (i.isActiveImplant || i.status.label === 'Installed')),
  };

  const stations = [
    { id: 'armor', label: 'Armor', tab: 'armor', items: worn.armor },
    { id: 'shields', label: 'Shield', tab: 'shields', items: worn.shields },
    { id: 'implants', label: 'Implants', tab: 'gear', glyphTab: 'implants', items: worn.implants },
  ].map((st) => ({ ...st, glyph: CATEGORY_GLYPH[st.glyphTab ?? st.tab], empty: st.items.length === 0, primary: st.items[0] ?? null, extra: Math.max(0, st.items.length - 1) }));

  return {
    // armor and personal shield are independent display positions (both may be filled at once); rows already classified by the armor SSOT
    protection: {
      armor: { item: worn.armor[0] ?? null, extra: Math.max(0, worn.armor.length - 1) },
      shield: { item: worn.shields[0] ?? null, extra: Math.max(0, worn.shields.length - 1) },
    },
    heldCount: slots.filter((s) => s.occupant?.isAnchor).length,
    // the sheet's always-available unarmed attack (virtual loadout entry built by concept-context); rolled by the existing roll-unarmed-attack action
    unarmed: unarmed ? { name: unarmed.name || 'Unarmed Strike', attackLabel: signed(unarmed.attackTotal), damageLabel: unarmed.damageFormula || '' } : null,
    manyAppendages: slots.length > 2,
    appendageCount: slots.length,
    stations,
    available: !!state,
    notices,
    anatomy: anatomy ? { status: anatomy.status, statusLabel: humanize(anatomy.status), resolved: anatomy.status === 'resolved', kind: anatomy.anatomyKind, kindLabel: humanize(anatomy.anatomyKind), source: anatomy.source } : null,
    slots,
    hasSlots: slots.length > 0,
    worn,
    tabs,
    items,
    entries,
    hasItems: items.length > 0,
    hasEntries: entries.length > 0,
    isGM: isGM === true,
    summary: state ? { readied: state.summary.readied.length, equipped: state.summary.equipped.length, withheld: state.summary.withheld.length } : null,
  };
}

export default { buildEquipmentWorkspace, categoryOfRow, artOf, WORKSPACE_TABS };
