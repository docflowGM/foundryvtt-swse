/**
 * [UNIT / MOCK-ENVIRONMENT: hand-built actors, stub ActorEngine, stubbed AbilityEngine verdicts; the live sheet
 * drop handler is only checked statically.]
 * Acquisition authority: interactive feat/talent drops are validated BEFORE the actor changes, a
 * proven problem refuses a player (offers a GM override), anything undeterminable is allowed and
 * recorded unattributed, GM-authorized exceptions stay outside slot accounting, and a drop that is
 * proven to satisfy a slot leaves durable certified evidence. Real class data + real reconciler.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { normalizeClass } = await import('/systems/foundryvtt-swse/scripts/data/class-normalizer.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const { AbilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js');
const acq = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/acquisition-authority.js');
const evidence = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/progression-evidence.js');

for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

let seq = 0;
const cls = (name, level) => ({ id: `c${++seq}`, type: 'class', name, system: { level, classId: name.toLowerCase() }, flags: { swse: {} } });
const certified = (type, name, slotType) => ({ id: `${type}${++seq}`, type, name, system: { acquisition: { sourceSession: 'S1', selectionKey: `${type}s`, slotType } }, flags: { swse: { progression: { sourceSession: 'S1', selectionKey: `${type}s`, slotType } } } });
function soldier1(extraItems = [], { satisfied = false } = {}) {
  const actor = {
    id: `a${++seq}`, name: 'Hero', type: 'character', flags: { swse: {} }, _stats: { modifiedTime: 1 },
    items: [cls('Soldier', 1), ...extraItems],
    system: { level: 1, hp: {}, class: { id: 'soldier', name: 'Soldier' }, progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 1 }] } },
  };
  if (satisfied) {
    actor.items.push(certified('feat', 'Toughness', 'general'), certified('talent', 'Armor Specialization', 'class'));
    const rec = evidence.buildProgressionCertification({ actor, sessionId: 'S1', mode: 'chargen', audit: { ok: true, kind: 'transaction-materialization', checked: 2 }, fallbackClass: { classId: 'soldier', className: 'Soldier', classLevel: 1, characterLevel: 1 } });
    actor.flags.swse.progressionCertifications = evidence.appendCertification(null, rec);
  }
  return actor;
}
const feat = (name = 'Dodge') => ({ id: 'drop1', type: 'feat', name, system: {}, flags: {} });
const talent = (name = 'Evasion') => ({ id: 'drop2', type: 'talent', name, system: {}, flags: {} });
const noPrereq = () => { AbilityEngine.evaluateAcquisition = () => ({ legal: true, missingPrereqs: [], unresolved: [] }); };
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const original = AbilityEngine.evaluateAcquisition;

await check('1. open general slot: allowed, stamped with the proven slot context', () => {
  noPrereq();
  const v = acq.validateAcquisition({ actor: soldier1(), item: feat() });
  assert.equal(v.decision, 'allow');
  assert.equal(v.entitlement.status, 'open-slot');
  assert.equal(v.acquisition.slotType, 'general');
  assert.equal(v.acquisition.characterLevel, 1);
  assert.match(v.acquisition.sourceSession, /^drop:/);
});

await check('2. no open entitlement (everything certified-satisfied): player refused BEFORE any change, GM gets the override path', () => {
  noPrereq();
  const actor = soldier1([], { satisfied: true });
  const player = acq.validateAcquisition({ actor, item: feat(), isGM: false });
  assert.equal(player.decision, 'block');
  assert.equal(player.acquisition, null);
  assert.match(player.reasons.join(' '), /no open feat entitlement/);
  const gm = acq.validateAcquisition({ actor, item: talent(), isGM: true });
  assert.equal(gm.decision, 'needs-gm');
});

await check('3. unmet prerequisites (proven, no unresolved terms) block a player; unresolved terms never block', () => {
  AbilityEngine.evaluateAcquisition = () => ({ legal: false, missingPrereqs: ['Base Attack Bonus +5'], unresolved: [] });
  assert.equal(acq.validateAcquisition({ actor: soldier1(), item: feat() }).decision, 'block');
  AbilityEngine.evaluateAcquisition = () => ({ legal: false, missingPrereqs: ['Something odd'], unresolved: ['unparsed term'] });
  assert.equal(acq.validateAcquisition({ actor: soldier1(), item: feat() }).decision, 'allow');
});

await check('4. undeterminable entitlement (unattributed history / engine unavailable) is allowed, never certified into a slot', () => {
  noPrereq();
  const withManual = soldier1([{ id: 'm1', type: 'feat', name: 'Manual', system: {}, flags: { swse: {} } }, certified('talent', 'Armor Specialization', 'class')]);
  const v = acq.validateAcquisition({ actor: withManual, item: feat('Another') });
  assert.equal(v.decision, 'allow');
  assert.equal(v.entitlement.status, 'unverifiable');
  assert.ok(!v.acquisition.slotType);
  const noClass = { id: 'x', name: 'Blank', type: 'character', items: [], flags: {}, system: { level: 0 } };
  assert.equal(acq.validateAcquisition({ actor: noClass, item: feat() }).decision, 'allow');
});

await check('5. an open CLASS slot is never claimed (class-list/tree eligibility is not decided here)', () => {
  noPrereq();
  const lvl2 = soldier1();
  lvl2.items[0].system.level = 2; lvl2.system.level = 2; lvl2.system.progression.classLevels[0].level = 2;
  const v = acq.validateAcquisition({ actor: lvl2, item: feat() });
  assert.equal(v.decision, 'allow');
  assert.ok(!v.acquisition.slotType);
});

await check('6. non-gated item types pass through untouched', () => {
  assert.equal(acq.validateAcquisition({ actor: soldier1(), item: { type: 'weapon', name: 'Blaster' } }).decision, 'allow');
});

await check('7. a drop proven to satisfy a slot leaves certified evidence that reconciliation honours (mode "drop")', async () => {
  noPrereq();
  const actor = soldier1();
  const v = acq.validateAcquisition({ actor, item: feat() });
  // simulate DropResolutionEngine._createItemMutation + ActorEngine.apply
  actor.items.push({ id: 'new1', type: 'feat', name: 'Dodge', system: { acquisition: { ...v.acquisition } }, flags: { swse: {} } });
  const writes = [];
  const engine = { updateActor: async (a, data) => { writes.push(data); a.flags.swse.progressionCertifications = data['flags.swse.progressionCertifications']; } };
  const res = await acq.recordAcquisitionEvidence({ actor, acquisition: v.acquisition, engine });
  assert.equal(res.certified, true);
  assert.equal(writes[0]['flags.swse.progressionCertifications'][0].mode, 'drop');
  assert.equal(writes[0]['flags.swse.progressionCertifications'][0].audit.kind, 'transaction-materialization');
  const r = new ProgressionReconciler().reconcileActor(actor, {});
  assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 1).status, 'filled');
  assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 1).evidence, 'certified');
});

await check('8. recordAcquisitionEvidence does nothing without a proven slot, and never throws', async () => {
  const a = soldier1();
  assert.equal((await acq.recordAcquisitionEvidence({ actor: a, acquisition: { sourceSession: 'drop:x' }, engine: {} })).certified, false);
  const boom = { updateActor: async () => { throw new Error('nope'); } };
  a.items.push({ id: 'n', type: 'feat', name: 'F', system: { acquisition: { sourceSession: 'drop:y', slotType: 'general', characterLevel: 1 } }, flags: {} });
  assert.equal((await acq.recordAcquisitionEvidence({ actor: a, acquisition: { sourceSession: 'drop:y', slotType: 'general' }, engine: boom })).certified, false);
});

await check('9. GM-authorized exception (countsAgainstSlot:false) stays outside slot accounting; it neither fills nor hides a missing choice', () => {
  const grant = { id: 'gm1', type: 'feat', name: 'GM Reward Feat', system: { acquisition: { source: 'gm-reward', countsAgainstSlot: false, grantedBy: 'u1', grantedByName: 'GM', reason: 'quest' } }, flags: { swse: {} } };
  const r = new ProgressionReconciler().reconcileActor(soldier1([grant]), {});
  assert.equal(r.evidence.counts.external, 1);
  assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 1).status, 'open', 'a reward does not satisfy the general feat slot');
  assert.equal(r.rollup.counts.extra, 0);
  const manual = { id: 'm2', type: 'feat', name: 'Manual', system: {}, flags: { swse: {} } };
  const r2 = new ProgressionReconciler().reconcileActor(soldier1([manual]), {});
  assert.equal(r2.slots.generalFeats.find(s => s.characterLevel === 1).status, 'unverifiable', 'an unexplained item still only makes the slot unverifiable');
});

await check('10. deleting a progression item invalidates the memoized report (no stale "satisfied")', () => {
  const actor = soldier1([], { satisfied: true });
  const first = ProgressionReconciler.safeReconcileActor(actor, { output: 'report' });
  assert.equal(first.slots.classTalents[0].status, 'filled');
  actor.items = actor.items.filter(i => i.type !== 'talent');
  const second = ProgressionReconciler.safeReconcileActor(actor, { output: 'report' });
  assert.equal(second.slots.classTalents[0].status, 'open');
});

await check('11. wiring: the live sheet drop handler gates acquisitions before resolving; class drops never silently add a level for players', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-like-sheet.js'), 'utf8');
  const gate = src.indexOf('await this._gateItemAcquisition(droppedDocument)');
  const resolve = src.indexOf('await DropResolutionEngine.resolve({\n      actor: this.actor,\n      dropData: data,\n      acquisition');
  assert.ok(gate > 0 && resolve > gate);
  const body = src.slice(src.indexOf('async _gateItemAcquisition(item)'));
  assert.match(body, /item\.type === 'class'[\s\S]*if \(!isGM\)[\s\S]*stop: true/);
  assert.match(body, /validateAcquisition\(/);
  assert.match(body, /GMGrantDialog\.prompt/);
});

AbilityEngine.evaluateAcquisition = original;
console.log('acquisition-authority: all assertions passed');
