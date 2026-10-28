import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP5 (NOT CONVERGED): one shared combat-readiness interface, combat consumers migrated off legacy equipped predicates, FireStateStore no longer a
// grip writer, combined Draw & Ignite through the coordinator, unarmed strike as an explicit virtual attack source.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const F = await import('./helpers/ready-weapon-fixture.mjs');
const { SpeciesRegistry } = await F.installReadinessEnvironment();
const CR = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const ma = await import('/systems/foundryvtt-swse/scripts/combat/multi-attack.js');
const { DualWieldCombatShapeResolver: DW } = await import('/systems/foundryvtt-swse/scripts/engine/combat/dual-wield-combat-shape-resolver.js');
const FS = await import('/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js');
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const J = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js');
const { fingerprintIntent } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js');
const Unarmed = await import('/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js');
const RWC = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-weapon-context.js');
const { resolveActorSpeciesProfile } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/species-evidence-adapter.js');
const Coord = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js');
const { installCoordinatorHarness } = await import('./helpers/equipment-coordinator-harness.mjs');
const { isArmorItemEquipped } = await import('/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const root = new URL('..', import.meta.url).pathname;
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const tracked = execFileSync('git', ['ls-files', 'scripts'], { cwd: root }).toString().split('\n').filter((f) => f.endsWith('.js'));

const spent = []; let allowSpend = true;
ActionEconomyConsumption.spend = async (_a, type, meta) => { if (!allowSpend) return { allowed: false }; spent.push({ type, meta }); return { allowed: true, committed: false }; };
const h = installCoordinatorHarness(ActorEngine);
const opts = { deps: h.deps };
const PISTOL = F.PISTOL_KEY, SABER = F.SABER_KEY;
const feat = (name, extra = {}) => ({ id: `f-${name}`, type: 'feat', name, flags: extra.flags ?? {}, system: {} });
const reset = () => { spent.length = 0; h.log.itemWrites.length = 0; h.log.actorWrites.length = 0; allowSpend = true; };

// ------------------------------------------------------------------------------------------------ 1: EQUIPPED is not READIED; EQ-001 stays deferred
{
  const w = F.equippedWeapon('w1', { appendageIds: ['natural-arm-1'] });
  const a = F.actorOf([w]);
  const r = CR.getWeaponReadiness(a, 'w1');
  assert.equal(r.effectivePosture, 'EQUIPPED'); assert.equal(r.ready, false, 'EQUIPPED is held, not ready');
  assert.equal(CR.isWeaponHeld(a, w), true); assert.equal(CR.isWeaponReadied(a, w), false); assert.deepEqual(CR.getReadiedWeapons(a), []);
  reset();
  const res = await InventoryEngine.setWeaponReadied(a, 'w1', true, { ...opts, appendageIds: ['natural-arm-1'], grip: 'one-handed' });
  assert.equal(res.ok, false); assert.equal(res.status, 'DEFERRED_RULES_REVIEW');
  assert.equal(h.log.itemWrites.length, 0); assert.equal(h.log.actorWrites.length, 0); assert.equal(spent.length, 0, 'EQ-001: no write, journal entry or spend');
  assert.equal(w.system.weaponPosture, 'EQUIPPED');
  ok('1: EQUIPPED is held but not READIED; the EQUIPPED->READIED request stays DEFERRED_RULES_REVIEW (EQ-001) with no mutation or spend');
}

// ------------------------------------------------------------------------------------------------ 2: invalid declared READIED is not ready
{
  const noGrip = F.readiedWeapon('w2', { wielded: null });
  const badAppendage = F.readiedWeapon('w3', { appendageIds: ['natural-arm-9'] });
  const a = F.actorOf([noGrip, badAppendage]);
  assert.equal(noGrip.system.weaponPosture, 'READIED');
  assert.equal(CR.getWeaponReadiness(a, 'w2').ready, false, 'READIED with no chosen grip is declared, not verified');
  assert.equal(CR.getWeaponReadiness(a, 'w3').ready, false, 'READIED on a nonexistent appendage is not verified');
  assert.deepEqual(CR.getReadiedWeapons(a), []);
  reset();
  const res = await InventoryEngine.setWeaponReadied(a, 'w3', true, opts);
  assert.equal(res.ok, false); assert.equal(res.status, 'READINESS_NOT_VERIFIED'); assert.equal(res.reason, 'declared-readied-not-verified');
  assert.equal(h.log.itemWrites.length + h.log.actorWrites.length + spent.length, 0);
  ok('2: a declared READIED that the canonical resolvers do not establish is not ready, and setWeaponReadied(true) never reports it as success');
}

// ------------------------------------------------------------------------------------------------ 3: missing species evidence fails closed (no cache, no name inference, no default anatomy)
{
  const w = F.readiedWeapon('w4');
  const a = F.actorOf([w], { system: { species: 'Definitely Not A Species', size: 'Medium' } });
  assert.equal(resolveActorSpeciesProfile(a).status, 'unavailable');
  const r = CR.getWeaponReadiness(a, 'w4');
  assert.equal(r.ready, false); assert.equal(r.speciesEvidence, 'unavailable'); assert.equal(r.effectivePosture, null);
  const noSpecies = F.actorOf([F.readiedWeapon('w5')], { system: { size: 'Medium' } });
  assert.equal(CR.isWeaponReadied(noSpecies, 'w5'), false, 'no recorded species: no provisional two-arm anatomy');
  const named = F.actorOf([F.readiedWeapon('w6')], { name: 'Human', system: { size: 'Medium' } });
  assert.equal(CR.isWeaponReadied(named, 'w6'), false, 'species is never inferred from the actor name');
  const wasInit = SpeciesRegistry._initialized; SpeciesRegistry._initialized = false;
  try {
    const live = F.actorOf([F.readiedWeapon('w7')]);
    assert.equal(CR.isWeaponReadied(live, 'w7'), false, 'registry unavailable: fail closed');
  } finally { SpeciesRegistry._initialized = wasInit; }
  assert.equal(CR.isWeaponReadied(F.actorOf([F.readiedWeapon('w8')]), 'w8'), true, 'and the same weapon is ready once the evidence exists');
  const src = strip(read('scripts/engine/equipment/combat-readiness.js')) + strip(read('scripts/engine/equipment/species-evidence-adapter.js'));
  assert.ok(!/\bnew Map\(|\bcache\b|let _|memo/i.test(src), 'no module-level cache in the readiness interface or the evidence adapter');
  ok('3: missing species evidence (unknown species, none recorded, name only, registry down) fails closed; nothing is cached or inferred');
}

// ------------------------------------------------------------------------------------------------ 4: pending transactions withhold readiness
{
  const w = F.readiedWeapon('w9');
  const a = F.actorOf([w]);
  assert.equal(CR.isWeaponReadied(a, w), true);
  const entry = J.addPreparedEntry([], { requestId: 'p1', intentDigest: fingerprintIntent('i'), planDigest: fingerprintIntent('p'), items: [{ id: 'w9', before: { 'system.weaponPosture': 'STOWED' }, target: { 'system.weaponPosture': 'READIED' } }], spend: { state: 'pending', actionType: 'move' } });
  a.flags = { swse: { equipmentTxn: J.toStored(entry) } };
  assert.equal(CR.isWeaponReadied(a, w), false); assert.ok(CR.getWeaponReadiness(a, w).gates.includes('unresolved-equipment-transaction'));
  a.flags.swse.equipmentTxn = { schemaVersion: 1, entries: 'garbage' };
  assert.equal(CR.isWeaponReadied(a, w), false, 'an unreadable journal withholds readiness too');
  const done = J.transitionEntry(J.transitionEntry(entry, 'p1', 'APPLIED'), 'p1', 'FINALIZED');
  a.flags.swse.equipmentTxn = J.toStored(done);
  assert.equal(CR.isWeaponReadied(a, w), true, 'FINALIZED releases the withholding');
  ok('4: an unresolved (or unreadable) equipment transaction withholds readiness; only a closed journal releases it');
}

// ------------------------------------------------------------------------------------------------ 5/6: Full Attack selection: only ready weapons; no inferred off-hand
{
  const pistol = F.readiedWeapon('pst', { key: PISTOL }), rifle = F.weaponItem('rif', { key: 'weapon-blaster-rifle' }), held = F.equippedWeapon('hld', { key: PISTOL });
  const a = F.actorOf([held, rifle, pistol]);
  const sel = ma.getReadiedWeaponSelection(a);
  assert.equal(sel.primary?.id, 'pst'); assert.equal(sel.offhand, null); assert.equal(sel.ready.length, 1);
  assert.equal(ma.buildFullAttackSequence(a, { requestedPackage: ma.FULL_ATTACK_PACKAGES.NORMAL, primaryWeapon: pistol }).legal, true);
  assert.equal(ma.buildFullAttackSequence(a, { requestedPackage: ma.FULL_ATTACK_PACKAGES.NORMAL, primaryWeapon: rifle }).legal, false, 'a stowed weapon cannot be the Full Attack primary');
  assert.equal(ma.buildFullAttackSequence(a, { requestedPackage: ma.FULL_ATTACK_PACKAGES.NORMAL, primaryWeapon: held }).legal, false, 'an EQUIPPED (held, not ready) weapon cannot be the primary');
  assert.equal(DW.resolve(a, { primaryWeapon: held }).usingTwoWeapons, false, 'an unready explicit primary is not used');
  ok('5: Full Attack and dual-wield selection use only READIED weapons (stowed and merely-held weapons are refused)');

  const p1 = F.readiedWeapon('p1', { key: PISTOL, appendageIds: ['natural-arm-1'] }), p2 = F.readiedWeapon('p2', { key: PISTOL, appendageIds: ['natural-arm-2'] });
  const two = F.actorOf([p1, p2]); const swapped = F.actorOf([p2, p1]);
  for (const act of [two, swapped]) {
    const s = ma.getReadiedWeaponSelection(act);
    assert.equal(s.primary, null); assert.equal(s.offhand, null); assert.equal(s.selectionRequired?.reason, 'multiple-ready-weapons');
    assert.deepEqual(s.selectionRequired.itemIds.sort(), ['p1', 'p2']);
    const shape = DW.resolve(act, {});
    assert.equal(shape.usingTwoWeapons ?? false, false, 'two ready weapons without an explicit choice are not assumed to be dual-wielded');
  }
  const dmark = F.readiedWeapon('p3', { key: PISTOL, appendageIds: ['natural-arm-2'], system: { isOffhand: true } });
  const marked = F.actorOf([p1, dmark]);
  assert.equal(ma.getReadiedWeaponSelection(marked).offhand, null, 'an isOffhand marker designates nothing');
  const explicit = DW.resolve(two, { primaryWeapon: p1, offhandWeapon: p2 });
  assert.equal(explicit.mode, 'dualWield'); assert.equal(explicit.penalty.final, -10, 'explicit choice: ordinary two-weapon penalty unchanged');
  ok('6: two ready weapons require an explicit primary/off-hand; Item order and isOffhand markers designate nothing; an explicit choice keeps the published penalty');
}

// ------------------------------------------------------------------------------------------------ 7: dual-wield modifiers and double weapons unchanged
{
  const p1 = F.readiedWeapon('d1', { key: PISTOL, appendageIds: ['natural-arm-1'] }), p2 = F.readiedWeapon('d2', { key: 'weapon-heavy-blaster-pistol', appendageIds: ['natural-arm-2'] });
  const dwm = (lvl) => feat(`Dual Weapon Mastery ${['I', 'II', 'III'][lvl - 1]}`);
  const prof = ['Weapon Proficiency (Pistols)'].map((x) => feat(x));
  const pen = (lvl) => { const a = F.actorOf([p1, p2, ...prof, ...(lvl ? [dwm(lvl)] : [])]); a.system.weaponProficiencies = ['pistols']; return DW.resolve(a, { primaryWeapon: p1, offhandWeapon: p2 }).penalty.final; };
  assert.deepEqual([pen(0), pen(1), pen(2), pen(3)], [-10, -5, -2, 0], 'Dual Weapon Mastery penalties are unchanged');
  const dbl = F.readiedWeapon('dbl', { key: 'weapon-double-bladed-lightsaber', wielded: 'two-handed', appendageIds: ['natural-arm-1', 'natural-arm-2'] });
  const a = F.actorOf([dbl, feat('Weapon Proficiency (Lightsabers)')]); a.system.weaponProficiencies = ['lightsabers'];
  assert.equal(ma.isDoubleWeapon(dbl), true);
  const sel = ma.getReadiedWeaponSelection(a);
  assert.equal(sel.primary.id, 'dbl'); assert.equal(sel.isDoubleWeapon, true); assert.equal(sel.offhand.id, 'dbl', 'a double weapon is its own off-hand end (rule unchanged, not an inferred second weapon)');
  const plan = ma.buildFullAttackSequence(a, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_WEAPON, primaryWeapon: dbl });
  assert.equal(plan.legal, true); assert.equal(plan.attacks.length, 2);
  ok('7: Dual Weapon Mastery I/II/III penalties and double-weapon Full Attack are unchanged for READIED weapons');
}

// ------------------------------------------------------------------------------------------------ 8: natural and integrated weapons stay pending
{
  const nat = F.readiedWeapon('nat', { flags: { swse: { isNaturalWeapon: true } } });
  const integrated = F.readiedWeapon('int', { system: { integrated: true } });
  const a = F.actorOf([nat, integrated]);
  for (const id of ['nat', 'int']) { const r = CR.getWeaponReadiness(a, id); assert.ok(r.pending, `${id} is pending`); assert.equal(r.ready, false); }
  assert.deepEqual(CR.getReadiedWeapons(a), []);
  assert.equal(ma.getReadiedWeaponSelection(a).primary, null);
  ok('8: natural and integrated weapons are never ready while their Item identity is uncertified, whatever flags or records they carry');
}

// ------------------------------------------------------------------------------------------------ 9: unarmed strike is an explicit virtual attack source
{
  const a = F.actorOf([]);
  const virt = Unarmed.buildVirtualUnarmedWeapon(a);
  assert.equal(CR.isVirtualUnarmedAttack(a, virt), true); assert.equal(CR.isCombatSourceReady(a, virt), true, 'no posture or occupancy requirement');
  assert.notEqual(virt.system?.equipped, true, 'no fabricated equipped:true weapon');
  assert.equal(virt.id, CR.VIRTUAL_UNARMED_ID); assert.ok(!Array.from(a.items).includes(virt), 'not persisted / not an owned Item');
  assert.equal(CR.getReadiedWeapons(a).length, 0, 'the virtual strike is not a ready weapon Item either');
  assert.ok(virt.system.damage, 'damage composition input is kept'); assert.equal(virt.flags.swse.unarmed, true);
  // markers alone on an owned Item grant nothing
  const forged = F.weaponItem('forged', { flags: { swse: { virtual: true, unarmed: true } } });
  const fa = F.actorOf([forged]);
  assert.equal(CR.isVirtualUnarmedAttack(fa, forged), false); assert.equal(CR.isCombatSourceReady(fa, forged), false);
  assert.equal(CR.isVirtualUnarmedAttack(a, { id: 'x', flags: { swse: {} } }), false); assert.equal(CR.isVirtualUnarmedAttack(a, { ...virt, id: '' }), false);
  // the unarmed source authorizes no maneuver by itself and no ordinary weapon readiness
  assert.equal(CR.isWeaponReadied(a, virt), false);
  const src = strip(read('scripts/engine/combat/unarmed-attack-helper.js'));
  assert.ok(!/equipped\s*:\s*true/.test(src), 'the unarmed helper no longer fabricates equipped:true');
  ok('9: the unarmed strike is a marked virtual attack source: no posture/occupancy needed, not a weapon Item, not forgeable from an owned Item, nothing else authorized');
}

// ------------------------------------------------------------------------------------------------ 10: reactions respect posture and keep activation separate
{
  const lit = F.readiedWeapon('lit', { key: SABER }); lit.system.activated = true; lit.system.subtype = 'lightsaber';
  const unlit = F.readiedWeapon('unlit', { key: SABER, appendageIds: ['natural-arm-2'] }); unlit.system.activated = false;
  const heldLit = F.equippedWeapon('heldlit', { key: SABER, appendageIds: ['natural-arm-1'] }); heldLit.system.activated = true;
  const a = F.actorOf([lit, unlit]);
  const d = CR.getWeaponReadiness(a, 'unlit'); assert.equal(d.ready, true); assert.equal(d.activation.activated, false); assert.equal(d.activation.independentOfPosture, true);
  const b = F.actorOf([heldLit]);
  assert.equal(CR.getWeaponReadiness(b, 'heldlit').activation.activated, true); assert.equal(CR.isWeaponReadied(b, 'heldlit'), false, 'activation does not make a held weapon READIED');
  assert.deepEqual(RWC.equippedReactionWeapons(b).weapons.map((x) => x.item.id), [], 'a merely activated weapon is not a reaction weapon');
  assert.deepEqual(RWC.equippedReactionWeapons(a).weapons.map((x) => x.item.id).sort(), ['lit', 'unlit'], 'READIED weapons are candidates; activation is checked by the talent separately');
  const talent = strip(read('scripts/engine/talent/lightsaber-talent-actions.js'));
  assert.ok(/isWeaponReadied\(actor, w\)\s*&&\s*isItemActivated\(w\)/.test(talent), 'Lightsaber Defense requires BOTH readiness and activation, independently');
  ok('10: reactions use effective READIED; activation is a separate fact (activated-but-held is not ready, ready-but-unlit is not active)');
}

// ------------------------------------------------------------------------------------------------ 11/12: FireStateStore cannot independently write the grip
{
  assert.equal(FS.setWielding, undefined); assert.equal(FS.FireStateStore.setWielding, undefined);
  assert.deepEqual(FS.COORDINATOR_OWNED_FIRE_STATE_KEYS, ['wielded']);
  const w = F.readiedWeapon('fs1');
  const plan = FS.planWielding(w, 'two-handed');
  assert.equal(plan.ok, true); assert.equal(plan.patch['flags.swse.fireState.wielded'], 'two-handed'); assert.ok(Object.keys(plan.patch).every((k) => Coord.OWNED_PATHS.includes(k)), 'only coordinator-owned fields are named');
  assert.equal(w.flags.swse.fireState.wielded, 'one-handed', 'planning never writes');
  assert.equal(FS.planWielding(w, 'three-handed').ok, false);
  const patch = FS.fireStateUpdateFor({ v: 1, wielded: 'two-handed', stock: 'folded', mounted: true }, { v: 1, wielded: 'one-handed', stock: 'extended', mounted: true });
  assert.deepEqual(patch, { 'flags.swse.fireState.stock': 'extended' }, 'a whole-record style update can never carry the coordinator-owned grip');
  assert.deepEqual(FS.fireStateUpdateFor({ v: 1, wielded: 'two-handed' }, { v: 1 }), {}, 'a stale record without the grip cannot delete it');
  ok('11: FireStateStore has no grip writer: setWielding is gone and planWielding only returns the field patch for the coordinator');
  ok('12: unrelated fire-state updates are field-scoped and can never overwrite or delete the coordinator-owned grip');
}

// ------------------------------------------------------------------------------------------------ 13/14: combined Draw & Ignite
{
  const quickDrawRule = { type: 'ACTION_SPEED_MUTATION', id: 'quickDraw', label: 'Quick Draw', source: 'Quick Draw', actionId: 'drawOrHolsterWeapon', aliases: ['draw', 'drawWeapon', 'holsterWeapon', 'drawOrHolster', 'drawOrReadyWeapon', 'readyWeapon'], baseActionCost: 'move', mutatedActionCost: 'swift', requiresWorkflowValidation: true, actionEconomy: { from: 'move', to: 'swift', spend: 'swift', workflowRequired: true }, combinedEffects: [{ requiresFeat: 'Weapon Proficiency (Lightsabers)', actionId: 'drawAndIgniteLightsaber', actionCost: 'swift', advisoryOnly: true }] };
  const quick = { id: 'f1', name: 'Quick Draw', type: 'feat', system: { abilityMeta: { attackOptionRules: [quickDrawRule] } } }; const wp = { id: 'f2', name: 'Weapon Proficiency (Lightsabers)', type: 'feat', system: {} };
  const mk = (extra = []) => { const s = F.weaponItem('sab', { key: SABER }); s.system.activated = false; s.system.subtype = 'lightsaber'; s.system.weaponCategory = 'lightsaber'; return F.actorOf([s, ...extra]); };
  const base = { appendageIds: ['natural-arm-1'], grip: 'one-handed' };
  // 13: single transaction, single Swift
  reset();
  let a = mk([quick, wp]); let s = a.items.get('sab');
  let r = await InventoryEngine.drawAndActivateLightsaber(a, 'sab', { ...opts, ...base });
  assert.equal(r.ok, true, JSON.stringify(r.message ?? r.reason));
  assert.deepEqual(spent.map((x) => x.type), ['swift'], 'exactly one Swift action');
  assert.equal(h.log.itemWrites.length, 1, 'ONE Item write carries posture, grip and ignition');
  const keys = Object.keys(h.log.itemWrites[0][0]).filter((k) => k !== '_id').sort();
  assert.deepEqual(keys, ['flags.foundryvtt-swse.bladeColor', 'flags.foundryvtt-swse.emitLight', 'flags.swse.fireState.v', 'flags.swse.fireState.wielded', 'system.activated', 'system.weaponOccupancy', 'system.weaponPosture'].sort());
  assert.deepEqual(h.log.actorWrites.map((x) => x['flags.swse.equipmentTxn'].entries[0].phase), ['PREPARED', 'APPLIED', 'FINALIZED']);
  assert.equal(s.system.weaponPosture, 'READIED'); assert.equal(s.system.activated, true);
  const ready = CR.getWeaponReadiness(a, 'sab', { resolveSpecies: opts.deps.resolveSpecies });
  assert.equal(ready.ready, true); assert.equal(ready.activation.activated, true);
  // already drawn: plain activation path only
  reset();
  const again = await InventoryEngine.drawAndActivateLightsaber(a, 'sab', { ...opts, ...base });
  assert.equal(again.ok, false); assert.equal(spent.length, 0); assert.equal(h.log.itemWrites.length, 0);
  ok('13: Draw & Ignite is one coordinator transaction: one Swift (existing combined authority), one field-scoped write of posture+grip+activation, journaled to FINALIZED; activation stays distinct from posture');

  // 14: failures give no free readiness and no free ignition
  reset(); allowSpend = false;
  a = mk([quick, wp]); s = a.items.get('sab');
  r = await InventoryEngine.drawAndActivateLightsaber(a, 'sab', { ...opts, ...base });
  assert.equal(r.ok, false); assert.equal(r.status, 'FAILED_COMPENSATED');
  assert.equal(s.system.weaponPosture, 'STOWED'); assert.equal(s.system.activated, false, 'a failed spend leaves no ignition');
  assert.notEqual(s.flags?.['foundryvtt-swse']?.emitLight, true);
  assert.equal(CR.isWeaponReadied(a, s, { resolveSpecies: opts.deps.resolveSpecies }), false);
  assert.equal(spent.length, 0, 'no spend was recorded'); allowSpend = true;
  // not eligible (no Quick Draw): refused before any write or spend
  reset(); a = mk([wp]);
  r = await InventoryEngine.drawAndActivateLightsaber(a, 'sab', { ...opts, ...base });
  assert.equal(r.ok, false); assert.equal(h.log.itemWrites.length + h.log.actorWrites.length + spent.length, 0, 'no combined action, no write, no spend');
  // missing choices
  reset(); a = mk([quick, wp]);
  r = await InventoryEngine.drawAndActivateLightsaber(a, 'sab', { ...opts });
  assert.equal(r.status, 'CHOICE_REQUIRED'); assert.equal(h.log.itemWrites.length + spent.length, 0);
  // item write that does not take effect
  reset(); a = mk([quick, wp]); const realUpd = ActorEngine.updateOwnedItems; ActorEngine.updateOwnedItems = async () => { throw new Error('boom'); };
  try { r = await InventoryEngine.drawAndActivateLightsaber(a, 'sab', { ...opts, ...base }); } finally { ActorEngine.updateOwnedItems = realUpd; }
  assert.equal(r.ok, false); assert.equal(spent.length, 0); assert.equal(a.items.get('sab').system.activated, false); assert.equal(a.items.get('sab').system.weaponPosture, 'STOWED');
  // deactivate-before-stow preserved
  reset(); a = mk([quick, wp]); await InventoryEngine.drawAndActivateLightsaber(a, 'sab', { ...opts, ...base }); reset();
  const stow = await InventoryEngine.setWeaponReadied(a, 'sab', false, opts);
  assert.equal(stow.ok, false); assert.equal(stow.reason, 'deactivate-before-stowing');
  // the coordinator's combined intent carries no requester identity or free-form fields
  await assert.rejects(() => Coord.planEquipmentIntent(a, { type: 'ready-ignite', itemId: 'sab', ...base, activate: true }, opts.deps), /unsupported intent field/);
  ok('14: combined failures (spend refused, write failed, no feat, missing choices) leave no readiness, no ignition and no double spend; deactivate-before-stow is preserved');
}

// ------------------------------------------------------------------------------------------------ 15: weapon-sourced 'equipped' effects need effective READIED; armor unchanged
{
  const eff = strip(read('scripts/dialogs/entity-dialog/effect-intent-engine.js'));
  assert.ok(/application === 'equipped'\)\s*\{[\s\S]*?item\.type === 'weapon'[\s\S]*?isWeaponReadied\(item\.actor, item\)/.test(eff), "application:'equipped' on a weapon asks the shared readiness interface");
  assert.ok(/return system\.equipped === true \|\| system\.integrated === true;/.test(eff), 'armor/equipment keep the worn-state flag');
  assert.ok(/application === 'activated'\) return system\.activated === true/.test(eff), 'activation-dependent effects check activation independently');
  const crystal = strip(read('scripts/engine/crafting/phase-3-advanced-crystal-system.js'));
  assert.ok(/getReadiedWeapons\(actor\)/.test(crystal) && !/equippable\?\.equipped/.test(crystal), 'the advanced-crystal reader uses effective posture');
  const armor = { type: 'armor', system: { equipped: true } };
  assert.equal(isArmorItemEquipped(armor), true); assert.equal(isArmorItemEquipped({ type: 'armor', system: { equipped: false } }), false);
  ok("15: weapon effects with application:'equipped' require READIED, activation is checked separately, the crystal reader uses effective posture, armor/shield worn state is unchanged");
}

// ------------------------------------------------------------------------------------------------ 16: legacy aliases cannot grant eligibility
{
  const aliases = {
    equipped: { system: { equipped: true } }, isEquipped: { system: { isEquipped: true } }, readied: { system: { readied: true } },
    equippable: { system: { equippable: { equipped: true } } }, flag: { flags: { swse: { equipped: true } } },
    dual: { system: { dualWielded: true, isOffhand: true } }, twoHanded: { system: { wieldedTwoHanded: true } }, active: { system: { active: true, activated: true } },
  };
  const items = Object.entries(aliases).map(([k, v]) => ({ id: `al-${k}`, type: 'weapon', name: 'Alias', flags: { swse: { canonicalWeapon: { identityKey: PISTOL } }, ...(v.flags ?? {}), ...(v.flags?.swse ? { swse: { canonicalWeapon: { identityKey: PISTOL }, ...v.flags.swse } } : {}) }, system: { ...(v.system ?? {}) } }));
  const a = F.actorOf(items);
  assert.deepEqual(CR.getReadiedWeapons(a), []); assert.equal(ma.getReadiedWeaponSelection(a).primary, null);
  for (const i of items) assert.equal(CR.isWeaponHeld(a, i), false, `${i.id}`);
  ok('16: legacy equipped/readied/activation/off-hand/two-handed aliases grant neither readiness nor held status');
}

// ------------------------------------------------------------------------------------------------ 17: prepared evidence is not reusable after an invalidating change
{
  const w = F.readiedWeapon('inv');
  const a = F.actorOf([w]);
  assert.equal(CR.isWeaponReadied(a, w), true);
  a.system.species = 'Not Registered'; assert.equal(CR.isWeaponReadied(a, w), false, 'species change invalidates at once'); a.system.species = 'Human';
  assert.equal(CR.isWeaponReadied(a, w), true);
  w.system.weaponOccupancy = { ...w.system.weaponOccupancy, appendageIds: ['natural-arm-9'] }; assert.equal(CR.isWeaponReadied(a, w), false, 'record change invalidates at once');
  w.system.weaponOccupancy = { ...w.system.weaponOccupancy, appendageIds: ['natural-arm-1'] }; assert.equal(CR.isWeaponReadied(a, w), true);
  w.flags.swse.fireState.wielded = 'two-handed'; assert.equal(CR.isWeaponReadied(a, w), false, 'a grip that no longer matches the occupancy invalidates at once');
  w.flags.swse.fireState.wielded = 'one-handed';
  const second = F.readiedWeapon('inv2', { appendageIds: ['natural-arm-1'] }); a.items.push(second); second.actor = a;
  assert.equal(CR.isWeaponReadied(a, w), false, 'a colliding second weapon withholds readiness from both'); assert.equal(CR.isWeaponReadied(a, second), false);
  ok('17: readiness is recomputed from live evidence on every call; species, record, grip and collision changes invalidate at once');
}

// ------------------------------------------------------------------------------------------------ 18: static guards -- no competing readiness authority, no legacy predicates in active selection paths
{
  const migrated = [
    'scripts/combat/multi-attack.js', 'scripts/engine/combat/CombatEngine.js', 'scripts/engine/combat/features/combat-feature-handlers.js', 'scripts/engine/combat/full-attack-executor.js',
    'scripts/combat/rolls/enhanced-rolls.js', 'scripts/patches/combat-ui-behavior-hotfix.js', 'scripts/engine/combat/dual-wield-combat-shape-resolver.js', 'scripts/engine/combat/combat-stat-rules.js',
    'scripts/engine/combat/weapons-engine.js', 'scripts/engine/combat/weapon-control-effects.js', 'scripts/engine/combat/reactions/reaction-weapon-context.js', 'scripts/engine/talent/lightsaber-talent-actions.js',
    'scripts/engine/feats/core-attack-option-runtime-patches.js', 'scripts/engine/abilities/passive/passive-state.js', 'scripts/engine/abilities/passive/condition-evaluator.js',
    'scripts/actors/v2/character-actor.js', 'scripts/engine/visuals/weapon-visual-profile-resolver.js', 'scripts/items/weapon-data-resolver.js', 'scripts/items/weapon-runtime/weapon-runtime-resolver.js',
    'scripts/items/weapon-runtime/legacy-adapter.js', 'scripts/items/weapon-runtime/wielding-size.js', 'scripts/engine/combat/unarmed-attack-helper.js', 'scripts/engine/crafting/phase-3-advanced-crystal-system.js',
  ];
  for (const f of migrated) {
    const code = strip(read(f));
    assert.ok(!/\bisItemEquipped\b|\bisAlwaysReadiedWeapon\b|\bisEquippedWeaponItem\b|\bgetEquippedWeapons\b|\bgetOffhandWeapon\b|\bisTruthyEquipState\b|\bsetWielding\b/.test(code), `${f}: retired predicate/selector present`);
    assert.ok(!/\.isOffhand\b|['"]isOffhand['"]|system\??\.wieldedTwoHanded|system\??\.dualWielded/.test(code.replace(/isOffhand: false/g, '')), `${f}: isOffhand/slot/grip alias read`);
  }
  const importers = tracked.filter((f) => /weapon-branch-resolver/.test(strip(read(f))) && /\bisItemEquipped\b|\bisAlwaysReadiedWeapon\b/.test(strip(read(f))));
  assert.deepEqual(importers.sort(), ['scripts/sheets/v2/character-sheet/concept-context.js', 'scripts/sheets/v2/context/RowTransformers.js'], 'only the two sheet presentation importers (WP6) still reference the legacy predicates');
  const readers = tracked.filter((f) => /from ['"].*\/combat-readiness\.js['"]/.test(read(f)));
  assert.ok(readers.length >= 15, `many consumers share the one interface (${readers.length})`);
  const compet = tracked.filter((f) => /export (async )?function (is|get)(Weapon)?(Readied|Ready)Weapons?\b/.test(read(f)));
  assert.deepEqual(compet, ['scripts/engine/equipment/combat-readiness.js'], 'exactly one readiness authority module');
  const branch = strip(read('scripts/items/weapon-branch-resolver.js'));
  assert.ok(/@deprecated E4-C1 WP5/.test(read('scripts/items/weapon-branch-resolver.js')) && branch.includes('isItemEquipped'));
  ok('18: no migrated active path reads a legacy equipped predicate or an off-hand marker; one readiness authority module; only WP6 sheet importers keep the deprecated predicate');
}

// ------------------------------------------------------------------------------------------------ 19: sheet/derived caches see posture changes
{
  for (const f of ['scripts/engine/effects/modifiers/ModifierEngine.js', 'scripts/actors/derived/derived-calculator.js', 'scripts/actors/derived/defense-calculator.js']) {
    const code = strip(read(f)); assert.ok(/weaponPosture/.test(code) && /weaponOccupancy/.test(code) && /fireState\?\.wielded/.test(code), `${f}: cache signature includes the posture, occupancy and grip`);
  }
  assert.ok(/prepareData/.test(strip(read('scripts/engine/progression/hooks/system-init-hooks.js'))), 'actors are re-prepared after species evidence becomes available');
  ok('19: derived/modifier cache signatures include posture, occupancy and grip, and actors are re-prepared once species evidence exists');
}

// ------------------------------------------------------------------------------------------------ 20: coordinator remains the single posture writer (WP4 guard extended)
{
  const owners = tracked.filter((f) => /updateOwnedItems|updateEmbeddedDocuments|\.update\(/.test(strip(read(f))) && /['"]flags\.swse\.fireState\.wielded['"]|fireState\.wielded/.test(strip(read(f))));
  assert.deepEqual(owners.sort(), ['scripts/engine/combat/fire-state-store.js', 'scripts/engine/equipment/equipment-state-coordinator.js'].filter((f) => owners.includes(f)).sort());
  const fsSrc = strip(read('scripts/engine/combat/fire-state-store.js'));
  assert.ok(!/updateOwnedItems\([^)]*wielded/.test(fsSrc), 'FireStateStore never passes the grip to a write');
  assert.ok(Coord.IGNITE_PATHS.every((p) => !Coord.OWNED_PATHS.includes(p)), 'ignition fields are a separate, intent-scoped allowance');
  ok('20: FireStateStore never passes the coordinator-owned grip to a write; ignition fields are allowed only for the combined intent');
}

console.log(`\nE4-C1 WP5 combat readiness: ${n} checks passed.`);
