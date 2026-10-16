import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E2A (corrected) -- DIAGNOSTIC, READ-ONLY droid compatibility projection. The droid refactor is pending, so these tests pin the CONSERVATIVE
// policy: legacy droid evidence never produces allocatable appendages. An embedded Item document id is only CANDIDATE evidence; no slot is
// available; ambiguous or incomplete records are preserved as unresolved records with structured issues, and no manipulator is inflated.
// Real installed-component resolver, real canonical part definitions and the real public exports are used.
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
const record = (p, partId) => p.unresolvedRecords.find((r) => r.partId === partId);

// 1. ONE embedded Item document, no verified slot -> candidate evidence only; nothing is allocatable
{
  const actor = deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand')] });
  const p = projectActorDroidAppendages(actor);
  assert.deepEqual(p.appendages, [], 'an Item document id does not establish an installed physical appendage');
  const r = record(p, 'hand');
  assert.equal(r.identityStatus, 'candidate-document-ids-only');
  assert.deepEqual(r.identity, { slot: null, instance: null, part: 'hand' });
  assert.deepEqual(r.candidateInstances, [{ documentId: 'itm_hand_A', functionalState: 'functional' }], 'the document id is preserved as source evidence');
  assert.deepEqual(r.capabilities, { canHold: null, canWield: null, canManipulate: true });
  const iss = p.issues.find((i) => i.code === 'droid-appendage-instance-unestablished');
  assert.equal(iss.severity, 'blocking');
  assert.deepEqual(iss.details.candidateDocumentIds, ['itm_hand_A']);
  assert.equal(iss.details.slotIdentity, null);
  const a = anatomy(actor);
  assert.deepEqual(a.appendages, []);
  assert.equal(a.status, 'partial', 'installed, enabled, manipulating hardware is a usable fact, but nothing is allocatable');
  assert.ok(!JSON.stringify(a.appendages).includes('itm_hand_A'));
  ok('one Item with no verified slot: candidate evidence kept, zero appendages, anatomy partial, slot identity null');
}

// 2. TWO embedded Item documents of the same type -> not two physical appendages
{
  const actor = deepFreeze({ system: {}, items: [item('itm_hand_B', 'hand'), item('itm_hand_A', 'hand')] });
  const p = projectActorDroidAppendages(actor);
  assert.deepEqual(p.appendages, []);
  const r = record(p, 'hand');
  assert.deepEqual(r.candidateInstances.map((c) => c.documentId), ['itm_hand_A', 'itm_hand_B'], 'both ids preserved, sorted deterministically');
  assert.ok(p.issues.some((i) => i.code === 'droid-appendage-duplicate-same-type-records' && i.severity === 'blocking'));
  const a = anatomy(actor);
  assert.equal(a.appendages.length, 0, 'functional manipulator count is not inflated');
  assert.notEqual(a.status, 'resolved');
  ok('two Item documents of one type: both preserved as candidates; no manipulators counted; blocking duplicate issue');
}

// 3. disabled / removed
{
  const disabled = deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand', { droidPart: { enabled: false } })] });
  const pd = projectActorDroidAppendages(disabled);
  assert.equal(record(pd, 'hand').candidateInstances[0].functionalState, 'disabled');
  assert.equal(anatomy(disabled).status, 'unresolved', 'disabled hardware yields no usable fact');
  const ledgerDisabled = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: false } } }, items: [item('itm_hand_A', 'hand')] });
  assert.equal(record(projectActorDroidAppendages(ledgerDisabled), 'hand').candidateInstances[0].functionalState, 'disabled', 'higher-precedence ledger evidence applies');
  assert.equal(record(projectActorDroidAppendages(ledgerDisabled), 'hand').componentState, 'disabled');
  const removed = deepFreeze({ system: { installedSystems: { hand: false } }, items: [item('itm_hand_A', 'hand')] });
  const pr = projectActorDroidAppendages(removed);
  assert.equal(pr.unresolvedRecords.length, 0);
  assert.ok(pr.issues.some((i) => i.code === 'component-not-installed'));
  ok('disabled hardware -> "disabled" candidate and no usable fact; uninstalled hardware -> no record');
}

// 4. inactive-but-enabled passive appendage is NOT treated as nonfunctional
{
  const actor = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: true, active: false } } }, items: [item('itm_hand_A', 'hand')] });
  const comp = installed(actor).components.find((c) => c.canonicalId === 'hand');
  assert.equal(comp.active, false, 'precondition: the resolver reports active=false');
  const p = projectActorDroidAppendages(actor);
  assert.equal(record(p, 'hand').componentState, 'functional');
  assert.equal(record(p, 'hand').candidateInstances[0].functionalState, 'functional');
  assert.equal(anatomy(actor).status, 'partial');
  ok('installed + enabled + active=false stays functional (activation is not physical functionality)');
}

// 5. duplicate same-type records in the Garage representation
{
  const actor = deepFreeze({ system: { droidSystems: { appendages: [{ id: 'hand', location: 'left-arm' }, { id: 'hand', location: 'right-arm' }] } }, items: [] });
  const p = projectActorDroidAppendages(actor);
  assert.deepEqual(p.appendages, []);
  assert.equal(p.unresolvedRecords.length, 1);
  assert.equal(p.unresolvedRecords[0].recordCount, 2);
  assert.equal(p.unresolvedRecords[0].identityStatus, 'none');
  assert.ok(p.issues.some((i) => i.code === 'droid-appendage-duplicate-same-type-records'));
  const a = anatomy(actor);
  assert.deepEqual(a.appendages, []);
  assert.equal(a.unresolvedRecords[0].capabilities.canManipulate, true, 'established facts are preserved even though identity is not');
  ok('duplicate droidSystems records: record count and established facts preserved; no instances, no manipulators');
}

// 6. slot identity is never derived from locations / array order
{
  const single = deepFreeze({ system: { droidSystems: { appendages: [{ id: 'hand' }] } }, items: [] });
  assert.ok(projectActorDroidAppendages(single).issues.some((i) => i.code === 'droid-appendage-instance-unestablished' && i.details.slotIdentity === null));
  const additional = deepFreeze({ system: { droidSystems: { appendages: [{ id: 'hand', location: 'left-arm' }, { id: 'tool', location: 'additional-3' }] } }, items: [] });
  const pa = projectActorDroidAppendages(additional);
  assert.deepEqual(pa.appendages, []);
  assert.ok(!JSON.stringify(pa).includes('additional-3') && !JSON.stringify(pa).includes('left-arm'), 'generated / array-derived locations never appear as identity');
  assert.equal(pa.unresolvedRecords.length, 2);
  for (const r of pa.unresolvedRecords) assert.deepEqual(r.identity, { slot: null, instance: null, part: r.partId });
  ok('records without a verified slot (including `additional-N` and array order) -> unresolved records, slot null, no ids invented');
}

// 7. ledger + several Items, and cross-tier mentions with a single Item
{
  const ambiguous = deepFreeze({ system: { installedSystems: { hand: { installed: true } } }, items: [item('itm_hand_A', 'hand'), item('itm_hand_B', 'hand')] });
  const p = projectActorDroidAppendages(ambiguous);
  assert.deepEqual(p.appendages, []);
  assert.ok(p.issues.some((i) => i.code === 'droid-appendage-duplicate-same-type-records'));
  const merged = deepFreeze({ system: { installedSystems: { hand: { installed: true } }, droidSystems: { appendages: [{ id: 'hand' }] } }, items: [item('itm_hand_A', 'hand')] });
  const pm = projectActorDroidAppendages(merged);
  assert.deepEqual(pm.appendages, [], 'even a well-merged single Item is only a candidate');
  assert.equal(record(pm, 'hand').candidateInstances.length, 1);
  assert.equal(record(pm, 'hand').recordCount, 3);
  ok('ledger + several Items stays ambiguous; one Item merged with ledger / droidSystems stays a single unpromoted candidate');
}

// 8. tool / probe / instrument / claw: no holding or wielding is assumed; a probe alone is not a usable manipulator fact
{
  const actor = deepFreeze({ system: {}, items: [item('i_tool', 'tool'), item('i_probe', 'probe'), item('i_inst', 'instrument'), item('i_claw', 'claw')] });
  const p = projectActorDroidAppendages(actor);
  assert.deepEqual(p.appendages, []);
  const byPart = Object.fromEntries(p.unresolvedRecords.map((r) => [r.partId, r]));
  assert.deepEqual(Object.keys(byPart).sort(), ['claw', 'instrument', 'probe', 'tool']);
  for (const r of p.unresolvedRecords) { assert.equal(r.capabilities.canWield, null); assert.equal(r.capabilities.canHold, null); }
  assert.equal(byPart.probe.capabilities.canManipulate, false);
  assert.equal(byPart.tool.capabilities.canManipulate, true);
  const probeOnly = deepFreeze({ system: {}, items: [item('i_probe', 'probe')] });
  assert.equal(anatomy(probeOnly).status, 'unresolved', 'a probe is stated not to manipulate: no usable fact');
  ok('tool / probe / instrument / claw: canHold / canWield unknown; probe stated non-manipulating; a probe-only droid is unresolved');
}

// 9. non-appendage parts never become records
{
  const actor = deepFreeze({ system: {}, items: [item('i_cc', 'climbing-claws'), item('i_ra', 'rocket-arm'), item('i_sm', 'stabilized-mount'), item('i_mf', 'multifunction-apparatus')] });
  const p = projectActorDroidAppendages(actor);
  assert.deepEqual(p.appendages, []);
  assert.deepEqual(p.unresolvedRecords, []);
  const r = anatomy(actor);
  assert.equal(r.status, 'unresolved');
  assert.ok(codes(r).includes('no-appendage-evidence'));
  assert.equal(anatomy(deepFreeze({ system: {}, items: [] })).defaultApplied, false);
  ok('mounts, enhancements and appendage weapons are not manipulators; no evidence -> unresolved, no default arms');
}

// 10. otherwise-complete synthetic catalog with unresolved physical identity must NOT resolve
{
  const complete = { components: [{ canonicalId: 'hand', definition: { slot: 'appendage', category: 'appendage', appendageType: 'hand', source: { canHold: true, canWield: true, canManipulate: true, features: ['Wield weapons'] } }, slot: 'appendage', category: 'appendage', installed: true, enabled: true, active: false, sources: [{ kind: 'embeddedItem', itemId: 'itm_X', installed: true, enabled: true }] }] };
  const p = projectDroidAppendages(complete);
  assert.deepEqual(p.appendages, []);
  assert.deepEqual(record(p, 'hand').capabilities, { canHold: true, canWield: true, canManipulate: true }, 'stated capabilities are preserved on the record');
  const r = resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: complete });
  assert.equal(r.status, 'partial');
  assert.deepEqual(r.appendages, []);
  const proseOnly = { components: [{ ...complete.components[0], definition: { slot: 'appendage', category: 'appendage', appendageType: 'hand', source: { features: ['Wield weapons', 'Can hold delicate objects'], restrictions: ['None'] } } }] };
  assert.deepEqual(record(projectDroidAppendages(proseOnly), 'hand').capabilities, { canHold: null, canWield: null, canManipulate: null }, 'prose is never parsed');
  ok('complete capability booleans + unresolved physical identity -> partial, zero appendages; catalog prose never parsed');
}

// 11. conflicting / upstream evidence is preserved, not discarded
{
  // (a) activation-only conflict from the real resolver: ledger says active, droidSystems record says not active
  const conflict = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: true, active: true } }, droidSystems: { appendages: [{ id: 'hand', active: false }] } }, items: [] });
  assert.ok(installed(conflict).conflicts.length >= 1, 'precondition: the resolver reports an activation conflict');
  const pc = projectActorDroidAppendages(conflict);
  const c = pc.issues.find((i) => i.code === 'component-source-conflict');
  assert.ok(c, 'the upstream conflict is carried into the diagnostics');
  assert.equal(c.severity, 'info');
  assert.equal(c.details.activationOnly, true);
  assert.equal(c.details.affectsFunctionalState, false);
  assert.equal(record(pc, 'hand').componentState, 'functional', 'an activation-only conflict never disables a passive appendage');
  // (b) installed/enabled disagreement between sources: preserved; the most restrictive evidence is reported per candidate
  const disagree = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: true } } }, items: [item('itm_hand_A', 'hand', { droidPart: { enabled: false } })] });
  const pd = projectActorDroidAppendages(disagree);
  assert.ok(pd.issues.some((i) => i.code === 'source-installed-enabled-disagreement' && i.severity === 'warning'));
  assert.equal(record(pd, 'hand').componentState, 'functional');
  assert.equal(record(pd, 'hand').candidateInstances[0].functionalState, 'disabled');
  // (c) upstream resolver warnings are preserved
  const warned = deepFreeze({ system: { installedSystems: { '---': true } }, items: [item('itm_hand_A', 'hand')] });
  assert.ok(installed(warned).warnings.length >= 1, 'precondition: the resolver emits a warning');
  assert.ok(projectActorDroidAppendages(warned).issues.some((i) => i.code === 'component-resolution-warning'));
  // diagnostics survive into the anatomy result
  assert.ok(codes(anatomy(conflict)).includes('component-source-conflict'));
  ok('upstream conflicts / warnings / enabled disagreements are preserved as issues; activation-only conflicts do not change functional state');
}

// 12. the droid adapter is replaceable; `resolved` is reserved for allocation-grade identity
{
  const mk = (identity, caps = { canHold: true, canWield: true, canManipulate: true }) => ({ id: 'future-1', kind: 'arm', source: 'future-adapter', identity, capabilities: caps, functionalState: 'functional', functionalStateSource: 'future' });
  const adapterFor = (appendage) => () => ({ appendages: [appendage], unresolvedRecords: [], issues: [] });
  const run = (appendage, overrides) => resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: { components: [] }, deps: { projectInstalledComponents: adapterFor(appendage) }, ...(overrides ? { functionalOverrides: overrides } : {}) });
  assert.equal(run(mk({ slot: 's1', instance: 'i1', part: 'p1' })).status, 'resolved');
  assert.equal(run(mk({ slot: null, instance: 'i1', part: 'p1' })).status, 'partial', 'unknown slot identity is never "resolved"');
  assert.equal(run(mk({ slot: 's1', instance: null, part: 'p1' })).status, 'partial', 'unproven installation instance is never "resolved"');
  assert.equal(run(mk({ slot: 's1', instance: 'i1', part: 'p1' }, { canHold: true, canWield: null, canManipulate: true })).status, 'partial');
  // overrides restrict identified (adapter-supplied) appendages only
  const restricted = run(mk({ slot: 's1', instance: 'i1', part: 'p1' }), { 'future-1': 'missing', ghost: 'disabled' });
  assert.equal(restricted.appendages[0].functionalState, 'missing');
  assert.ok(codes(restricted).includes('override-unknown-appendage'));
  const legacy = anatomy(deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand')] }), { functionalOverrides: { 'droid-appendage:itm_hand_A': 'missing' } });
  assert.ok(codes(legacy).includes('override-unknown-appendage'), 'legacy candidates are not appendages, so an override has nothing to attach to');
  assert.equal(resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: { components: [] }, deps: { projectInstalledComponents: () => ({ appendages: [], unresolvedRecords: [], issues: [] }) } }).status, 'unresolved', 'a valid adapter reporting nothing is unresolved, not an error');
  ok('replacement adapter can supply allocation-grade appendages; slot/instance gaps, unknown capabilities keep the status partial');
}

// 13. determinism and no mutation of a frozen actor (conflict scenario included)
{
  const actor = deepFreeze({ system: { installedSystems: { hand: { installed: true, enabled: true, active: true } }, droidSystems: { appendages: [{ id: 'hand', active: false }] } }, items: [item('itm_hand_A', 'hand'), item('i_tool', 'tool')] });
  const before = JSON.stringify(actor);
  const r1 = anatomy(actor);
  const r2 = anatomy(actor);
  assert.deepEqual(r1, r2);
  assert.equal(JSON.stringify(r1), JSON.stringify(r2));
  assert.equal(JSON.stringify(actor), before);
  assert.ok(Object.isFrozen(r1) && Object.isFrozen(r1.unresolvedRecords));
  ok('projection is deterministic, outputs are frozen, a frozen actor is untouched');
}

// 14. diagnostic observation (audit finding DR-010, NOT repaired): the Garage default display names are not canonical hand parts
{
  assert.notEqual(normalizeDroidPartId('Droid Arm / Hand'), 'hand');
  assert.equal(getDroidPartDefinition(normalizeDroidPartId('Droid Arm / Hand')), null);
  assert.equal(getDroidPartDefinition(normalizeDroidPartId('2 Droid Arms')), null);
  const p = projectActorDroidAppendages(deepFreeze({ system: { installedSystems: { 'Droid Arm / Hand': { installed: true } } }, items: [] }));
  assert.deepEqual(p.appendages, []);
  assert.equal(p.unresolvedRecords.length, 0, 'an unrecognised display name is not guessed to be a hand');
  ok('observation DR-010: default display names ("Droid Arm / Hand", "2 Droid Arms") are not canonical hand parts and are not guessed');
}

console.log(`equipment-e2a-droid-appendage-projection: ${n} checks passed`);
