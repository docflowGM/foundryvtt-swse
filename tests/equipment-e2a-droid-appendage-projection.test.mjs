import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E2A -- DIAGNOSTIC, READ-ONLY droid compatibility projection. The droid refactor is pending, so these tests pin the CONSERVATIVE behaviour:
// ambiguous legacy droid data must never fabricate manipulators or identities. They run the REAL installed-component resolver and the
// REAL canonical part definitions through the real public exports of the projection and the anatomy resolver.
registerFoundryPathLoader();
installFoundryShimGlobals();

const { projectDroidAppendages, projectActorDroidAppendages } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/droid-appendage-projection.js');
const { resolveEffectiveAnatomy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { resolveInstalledDroidComponents } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js');
const { getDroidPartDefinition, normalizeDroidPartId } = await import('/systems/foundryvtt-swse/scripts/data/droid-part-schema.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const codes = (r) => r.issues.map((i) => i.code);
const item = (id, partId, extra = {}) => ({ id, type: 'droid-system', name: partId, system: { droidPartId: partId, integrated: true, ...extra }, flags: {} });
const installed = (actor) => resolveInstalledDroidComponents(actor, { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition });
const anatomy = (actor, extra = {}) => resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: installed(actor), ...extra });

// 1. confirmed installed component (embedded Item = a real instance identity) -> uses the existing reconciled evidence
{
  const actor = deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand')] });
  const p = projectActorDroidAppendages(actor);
  assert.equal(p.appendages.length, 1);
  const a = p.appendages[0];
  assert.equal(a.id, 'droid-appendage:itm_hand_A');
  assert.deepEqual(a.identity, { slot: null, instance: 'itm_hand_A', part: 'hand' }, 'slot / instance / part identities are kept separate; slot is not established');
  assert.equal(a.kind, 'hand');
  assert.equal(a.functionalState, 'functional');
  assert.equal(a.source, 'droid-installed-component');
  // capability: only the structural boolean is read; holding / wielding are NOT established by the existing definitions
  assert.deepEqual(a.capabilities, { canHold: null, canWield: null, canManipulate: true });
  const r = anatomy(actor);
  assert.equal(r.status, 'partial', 'unknown holding/wielding capability prevents "resolved"');
  assert.equal(r.defaultApplied, false);
  assert.ok(codes(r).includes('capability-unknown'));
  ok('confirmed installed hand (embedded Item): one identified appendage; canManipulate from the catalog boolean, hold/wield stay unknown -> partial');
}

// 2. two embedded Items of the same type ARE independently representable (distinct Foundry document ids)
{
  const actor = deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand'), item('itm_hand_B', 'hand')] });
  const p = projectActorDroidAppendages(actor);
  assert.deepEqual(p.appendages.map((a) => a.id), ['droid-appendage:itm_hand_A', 'droid-appendage:itm_hand_B']);
  assert.equal(p.unresolvedRecords.length, 0);
  ok('two identical hands installed as two embedded Items remain two independent instances (ids come from the Items, not the part type)');
}

// 3. disabled component -> no functional manipulator
{
  const actor = deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand', { droidPart: { enabled: false } })] });
  const a = projectActorDroidAppendages(actor).appendages[0];
  assert.equal(a.functionalState, 'disabled');
  const ledgerDisabled = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: false } } }, items: [item('itm_hand_A', 'hand')] });
  assert.equal(projectActorDroidAppendages(ledgerDisabled).appendages[0].functionalState, 'disabled', 'higher-precedence ledger evidence applies to the instance');
  const removed = deepFreeze({ system: { installedSystems: { hand: false } }, items: [item('itm_hand_A', 'hand')] });
  const pr = projectActorDroidAppendages(removed);
  assert.equal(pr.appendages.length, 0);
  assert.ok(pr.issues.some((i) => i.code === 'component-not-installed'));
  ok('disabled (item or ledger) -> state "disabled"; uninstalled -> contributes nothing');
}

// 4. inactive-but-enabled passive component is NOT treated as disabled (activation != physical functionality)
{
  const actor = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: true, active: false } } }, items: [item('itm_hand_A', 'hand')] });
  const comp = installed(actor).components.find((c) => c.canonicalId === 'hand');
  assert.equal(comp.active, false, 'precondition: the resolver reports active=false');
  assert.equal(comp.enabled, true);
  assert.equal(projectActorDroidAppendages(actor).appendages[0].functionalState, 'functional');
  ok('active=false with installed+enabled stays functional');
}

// 5. duplicate same-type records in the Garage representation: no independent identities, no inflated count
{
  const actor = deepFreeze({ system: { droidSystems: { appendages: [{ id: 'hand', location: 'left-arm' }, { id: 'hand', location: 'right-arm' }] } }, items: [] });
  const p = projectActorDroidAppendages(actor);
  assert.equal(p.appendages.length, 0, 'two records are not promoted to two (or one) manipulators');
  assert.equal(p.unresolvedRecords.length, 1);
  assert.equal(p.unresolvedRecords[0].recordCount, 2);
  assert.deepEqual(p.unresolvedRecords[0].identity, { slot: null, instance: null, part: 'hand' });
  assert.ok(p.issues.some((i) => i.code === 'droid-appendage-duplicate-same-type-records' && i.severity === 'blocking'));
  const r = anatomy(actor);
  assert.equal(r.status, 'unresolved');
  assert.deepEqual(r.appendages, []);
  assert.equal(r.unresolvedRecords[0].capabilities.canManipulate, true, 'established facts are preserved even though identity is not');
  ok('duplicate same-type droidSystems records: no fabricated instances; record count and established facts preserved; anatomy unresolved');
}

// 6. missing / unstable slot identity (array position, `additional-N`) is never used as identity
{
  const single = deepFreeze({ system: { droidSystems: { appendages: [{ id: 'hand' }] } }, items: [] });
  const ps = projectActorDroidAppendages(single);
  assert.equal(ps.appendages.length, 0);
  assert.ok(ps.issues.some((i) => i.code === 'droid-appendage-instance-unestablished' && i.details.slotIdentity === null));
  const additional = deepFreeze({ system: { droidSystems: { appendages: [{ id: 'hand', location: 'left-arm' }, { id: 'tool', location: 'additional-3' }] } }, items: [] });
  const pa = projectActorDroidAppendages(additional);
  assert.equal(pa.appendages.length, 0);
  assert.ok(!JSON.stringify(pa).includes('additional-3'), 'a generated location string never becomes identity');
  assert.ok(!JSON.stringify(pa.appendages).includes('left-arm'));
  assert.equal(pa.unresolvedRecords.length, 2);
  const r = anatomy(single);
  assert.equal(r.status, 'unresolved');
  assert.equal(r.source, 'droid-installed-component');
  ok('records without instance identity (including `additional-N` / array order) -> structured unresolved result, no ids invented');
}

// 7. a ledger record plus several embedded Items is ambiguous (cannot be matched) -> none counted
{
  const actor = deepFreeze({ system: { installedSystems: { hand: { installed: true } } }, items: [item('itm_hand_A', 'hand'), item('itm_hand_B', 'hand')] });
  const p = projectActorDroidAppendages(actor);
  assert.equal(p.appendages.length, 0);
  assert.ok(p.issues.some((i) => i.code === 'droid-appendage-duplicate-same-type-records'));
  // by design the same part mentioned by ledger + one item + droidSystems is ONE component, so it is accepted as one instance
  const merged = deepFreeze({ system: { installedSystems: { hand: { installed: true } }, droidSystems: { appendages: [{ id: 'hand' }] } }, items: [item('itm_hand_A', 'hand')] });
  assert.equal(projectActorDroidAppendages(merged).appendages.length, 1);
  ok('ledger + several Items is ambiguous; cross-tier mentions of one part with a single Item stay one instance');
}

// 8. tool / probe / instrument / claw: no weapon-wielding or holding permission is assumed
{
  const actor = deepFreeze({ system: {}, items: [item('i_tool', 'tool'), item('i_probe', 'probe'), item('i_inst', 'instrument'), item('i_claw', 'claw')] });
  const p = projectActorDroidAppendages(actor);
  const byKind = Object.fromEntries(p.appendages.map((a) => [a.kind, a]));
  assert.deepEqual(Object.keys(byKind).sort(), ['claw', 'instrument', 'probe', 'tool']);
  for (const a of p.appendages) {
    assert.equal(a.capabilities.canWield, null, `${a.kind}: wielding is not established`);
    assert.equal(a.capabilities.canHold, null, `${a.kind}: holding is not established`);
  }
  assert.equal(byKind.probe.capabilities.canManipulate, false, 'the structural catalog boolean is honoured');
  assert.equal(byKind.tool.capabilities.canManipulate, true);
  ok('tool / probe / instrument / claw: canManipulate from the catalog boolean only; canHold / canWield remain unknown');
}

// 9. non-appendage parts never become manipulators (mounts, enhancements, appendage weapons)
{
  const actor = deepFreeze({ system: {}, items: [item('i_cc', 'climbing-claws'), item('i_ra', 'rocket-arm'), item('i_sm', 'stabilized-mount'), item('i_mf', 'multifunction-apparatus')] });
  const p = projectActorDroidAppendages(actor);
  assert.equal(p.appendages.length, 0);
  assert.equal(p.unresolvedRecords.length, 0);
  const r = anatomy(actor);
  assert.equal(r.status, 'unresolved');
  assert.ok(codes(r).includes('no-appendage-evidence'));
  ok('mounts, enhancements and appendage weapons are not manipulators; a droid with only those has no appendage evidence (no default arms)');
}

// 10. a droid with no recorded appendage evidence is not given biological arms
{
  const r = anatomy(deepFreeze({ system: {}, items: [] }));
  assert.equal(r.status, 'unresolved');
  assert.deepEqual(r.appendages, []);
  assert.equal(r.defaultApplied, false);
  ok('no installed-component evidence -> unresolved, defaultApplied=false');
}

// 11. functional overrides apply to identified droid appendages only and only restrict
{
  const actor = deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand')] });
  const r = anatomy(actor, { functionalOverrides: { 'droid-appendage:itm_hand_A': 'missing', 'droid-appendage:ghost': 'disabled' } });
  assert.equal(r.appendages[0].functionalState, 'missing');
  assert.equal(r.appendages[0].functionalStateSource, 'override');
  assert.ok(codes(r).includes('override-unknown-appendage'));
  const disabled = deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand', { droidPart: { enabled: false } })] });
  const r2 = anatomy(disabled, { functionalOverrides: { 'droid-appendage:itm_hand_A': 'functional' } });
  assert.equal(r2.appendages[0].functionalState, 'disabled');
  ok('overrides on droid appendages restrict only; they cannot revive disabled hardware');
}

// 12. injected structural catalog may state explicit capabilities (future structured data flows through; prose is never parsed)
{
  const components = { components: [{ canonicalId: 'hand', definition: { slot: 'appendage', category: 'appendage', appendageType: 'hand', source: { canHold: true, canWield: true, canManipulate: true, features: ['Wield weapons'] } }, slot: 'appendage', category: 'appendage', installed: true, enabled: true, active: false, sources: [{ kind: 'embeddedItem', itemId: 'itm_X', installed: true, enabled: true }] }] };
  const p = projectDroidAppendages(components);
  assert.deepEqual(p.appendages[0].capabilities, { canHold: true, canWield: true, canManipulate: true });
  const proseOnly = { components: [{ ...components.components[0], definition: { slot: 'appendage', category: 'appendage', appendageType: 'hand', source: { features: ['Wield weapons', 'Can hold delicate objects'], restrictions: ['None'] } } }] };
  assert.deepEqual(projectDroidAppendages(proseOnly).appendages[0].capabilities, { canHold: null, canWield: null, canManipulate: null });
  const r = resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: components });
  assert.equal(r.status, 'resolved');
  ok('explicit boolean capabilities flow through when a catalog states them; catalog prose is never parsed');
}

// 13. the droid adapter is replaceable (droid refactor pending) -- the universal resolver is not tied to the legacy shape
{
  let seen = null;
  const adapter = (ic, deps) => { seen = { ic, deps }; return { appendages: [{ id: 'future-1', kind: 'arm', source: 'future-adapter', identity: { slot: 's1', instance: 'i1', part: 'p1' }, capabilities: { canHold: true, canWield: true, canManipulate: true }, functionalState: 'functional', functionalStateSource: 'future' }], unresolvedRecords: [], issues: [] }; };
  const r = resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: { components: [] }, deps: { projectInstalledComponents: adapter } });
  assert.ok(seen);
  assert.equal(r.status, 'resolved');
  assert.equal(r.appendages[0].id, 'future-1');
  ok('a replacement droid adapter can be injected without changing the universal resolver');
}

// 14. determinism and no mutation of a frozen actor
{
  const actor = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: true } } }, items: [item('itm_hand_A', 'hand'), item('i_tool', 'tool')] });
  const before = JSON.stringify(actor);
  const r1 = anatomy(actor);
  const r2 = anatomy(actor);
  assert.deepEqual(r1, r2);
  assert.equal(JSON.stringify(r1), JSON.stringify(r2));
  assert.equal(JSON.stringify(actor), before);
  ok('droid projection is deterministic and leaves a frozen actor untouched');
}

// 15. diagnostic observation (audit finding DR-010, NOT repaired): the Garage's default appendage display names do not normalise to the canonical `hand` part
{
  assert.notEqual(normalizeDroidPartId('Droid Arm / Hand'), 'hand');
  assert.equal(getDroidPartDefinition(normalizeDroidPartId('Droid Arm / Hand')), null);
  assert.equal(getDroidPartDefinition(normalizeDroidPartId('2 Droid Arms')), null);
  const actor = deepFreeze({ system: { installedSystems: { 'Droid Arm / Hand': { installed: true } } }, items: [] });
  const p = projectActorDroidAppendages(actor);
  assert.equal(p.appendages.length, 0);
  assert.equal(p.unresolvedRecords.length, 0, 'an unrecognised display name is not guessed to be a hand');
  ok('observation DR-010: default display names ("Droid Arm / Hand", "2 Droid Arms") are not canonical hand parts and are not guessed');
}

console.log(`equipment-e2a-droid-appendage-projection: ${n} checks passed`);
