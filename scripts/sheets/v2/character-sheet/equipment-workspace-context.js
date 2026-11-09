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
import { readCombatReadiness, describeWeaponReadiness } from '/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js';

export const WORKSPACE_TABS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'shields', label: 'Shields' },
  { id: 'implants', label: 'Implants' },
  { id: 'gear', label: 'Gear' },
]);

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
 * @param {{groups?:object[], attackViews?:Map<string,object>, isGM?:boolean, readiness?:object}} input
 *   groups      the sheet's inventory groups (rows already carry weaponReadiness / weaponConfiguration / weaponPowerSource / modificationV2)
 *   attackViews the sheet's attack views keyed by weapon id (authoritative attack/damage/range/ammo display values)
 *   readiness   optional pre-read readCombatReadiness(actor) (tests / callers that already hold one)
 */
export function buildEquipmentWorkspace(actor, { groups = [], attackViews = new Map(), isGM = false, readiness = null } = {}) {
  let rd = readiness;
  if (!rd) { try { rd = readCombatReadiness(actor); } catch (_err) { rd = null; } }
  const state = rd?.state ?? null;
  const notices = [];

  // ---- slots: one per authoritative appendage; occupancy comes from the resolved assignments ----
  const rows = groups.flatMap((g) => asArray(g.entries));
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const assignments = asArray(state?.occupancy?.assignments);
  const byAppendage = new Map();
  for (const a of assignments) for (const id of asArray(a.appendageIds)) byAppendage.set(id, a);
  const conflictAppendages = new Set(asArray(state?.conflicts).map((c) => c.appendageId));
  const slots = asArray(state?.anatomy?.appendages).map((app) => {
    const a = byAppendage.get(app.id) ?? null;
    const row = a ? rowById.get(a.itemId) ?? null : null;
    const fs = app.functionalState ?? 'unresolved';
    const unavailable = fs === 'disabled' || fs === 'missing';
    return {
      id: app.id,
      label: humanize(app.id),
      kind: app.kind ?? null,
      functionalState: fs,
      stateLabel: fs === 'functional' ? '' : humanize(fs),
      unavailable,
      conflict: conflictAppendages.has(app.id),
      empty: !a,
      occupant: a ? {
        itemId: a.itemId,
        name: row?.name ?? 'Unknown item',
        img: row?.img ?? null,
        purpose: a.purpose ?? null,
        status: a.status ?? null,
        shared: asArray(a.appendageIds).length > 1,
        withSlotIds: asArray(a.appendageIds).filter((id) => id !== app.id),
        // display of the sheet's authoritative attack view for the held weapon (KOTOR-style per-hand readout); never computed here
        attackLabel: attackViews.get(a.itemId)?.attackTotal !== undefined ? signed(attackViews.get(a.itemId).attackTotal) : '',
        damageLabel: attackViews.get(a.itemId)?.damageFormula ?? '',
      } : null,
    };
  });

  // ---- notices (engine-sourced messages only) ----
  const anatomy = state?.anatomy ?? null;
  if (!state) notices.push({ tone: 'warn', text: 'Equipment state could not be read; placement controls are unavailable.' });
  else {
    if (anatomy.status !== 'resolved') {
      const msg = asArray(anatomy.issues).find((i) => i.severity === 'blocking') ?? asArray(anatomy.issues)[0];
      notices.push({ tone: 'warn', text: `Anatomy is ${anatomy.status}${msg ? `: ${msg.message}` : '.'}` });
    }
    if (rd?.speciesEvidence?.status && rd.speciesEvidence.status !== 'resolved') notices.push({ tone: 'warn', text: `Species evidence unavailable (${rd.speciesEvidence.reason ?? rd.speciesEvidence.status}); drawing a weapon is withheld until it resolves.` });
    if (state.transactions?.journalStatus === 'invalid') notices.push({ tone: 'conflict', text: 'The equipment transaction journal is unreadable; readiness is withheld.' });
    if (state.conflicts?.length) notices.push({ tone: 'conflict', text: 'Two items claim the same hand or appendage. Nothing was moved automatically; stow one of them.' });
  }
  if (!isGM) notices.push({ tone: 'info', text: 'Draw and stow are executed by the equipment authority on a GM client; from a player client a request is refused and nothing changes.' });

  // ---- items ----
  const items = rows.map((row) => {
    const category = categoryOfRow(row);
    const isWeapon = category === 'weapons';
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
      category,
      typeLabel: row.typeLabel,
      quantity: Number(row.quantity) || 1,
      showQuantity: (Number(row.quantity) || 1) > 1,
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
      searchText: `${row.name ?? ''} ${row.typeLabel ?? ''} ${asArray(row.tags).join(' ')}`.toLowerCase(),
    };
  });

  const counts = { all: items.length };
  for (const t of WORKSPACE_TABS) if (t.id !== 'all') counts[t.id] = items.filter((i) => i.category === t.id).length;
  const tabs = WORKSPACE_TABS.filter((t) => t.id === 'all' || counts[t.id] > 0 || ['weapons', 'armor'].includes(t.id)).map((t) => ({ ...t, count: counts[t.id] ?? 0 }));

  // ---- worn stations (armor / shield / implant). No canonical body-slot model exists beyond the armor predicate and implant flags, so these are
  // display groupings of rows the authorities already classified, not mechanical slots. ----
  const worn = {
    armor: items.filter((i) => i.category === 'armor' && i.equipped),
    shields: items.filter((i) => i.category === 'shields' && i.equipped),
    implants: items.filter((i) => i.category === 'implants' && (i.isActiveImplant || i.status.label === 'Installed')),
  };

  // figure layout is presentation only: appendage slots are split around the central stations in authoritative order
  const half = Math.ceil(slots.length / 2);
  const stations = [
    { id: 'implants', label: 'Implants', tab: 'implants', items: worn.implants },
    { id: 'armor', label: 'Armor', tab: 'armor', items: worn.armor },
    { id: 'shields', label: 'Shield', tab: 'shields', items: worn.shields },
  ].map((st) => ({ ...st, empty: st.items.length === 0, primary: st.items[0] ?? null }));

  return {
    portrait: actor?.img ?? null,
    slotsLeft: slots.slice(0, half),
    slotsRight: slots.slice(half),
    stations,
    available: !!state,
    notices,
    anatomy: anatomy ? { status: anatomy.status, kind: anatomy.anatomyKind, source: anatomy.source } : null,
    slots,
    hasSlots: slots.length > 0,
    worn,
    tabs,
    items,
    hasItems: items.length > 0,
    isGM: isGM === true,
    summary: state ? { readied: state.summary.readied.length, equipped: state.summary.equipped.length, withheld: state.summary.withheld.length } : null,
  };
}

export default { buildEquipmentWorkspace, categoryOfRow, WORKSPACE_TABS };
