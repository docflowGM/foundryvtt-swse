/**
 * Progression Authority & Reconciliation: certified legal progression must not be invalidated by
 * weaker secondary reconciliation heuristics.
 *
 * Items below are stamped EXACTLY like FeatTalentPlanBuilder stamps ordinary progression grants:
 * sourceSession / selectionKey / selectionId / slotType, and NO classId / classLevel / characterLevel
 * (those come from step descriptors that ordinary picks do not carry). The certification record is
 * produced by the real buildProgressionCertification() from the level-up manifest context.
 *
 * TEST SCOPE (read this): these are UNIT / MOCK-ENVIRONMENT tests. Actors, items, manifests and
 * session objects are hand-built; ActorEngine is a stub. NO test here drives the real
 * ProgressionFinalizer.finalize() end to end (that needs live Foundry documents and the content
 * authorities), so a true chargen -> level-up -> reopen lifecycle is NOT demonstrated offline and
 * still requires Foundry runtime verification. What IS exercised for real: the reconciler, the class
 * reader, buildProgressionCertification, the evidence contract, the audit validators
 * (auditSelectionsMaterialized / auditLevelUpActorAfterFinalization) and ProgressionFinalizer
 * ._certifyProgressionSession (against a stub engine).
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
const evidence = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/progression-evidence.js');

for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

let seq = 0;
const stamp = (type, name, session, slotType, extra = {}) => ({
  id: `${type}${++seq}`, type, name, system: { acquisition: { sourceSession: session, selectionKey: `${type}s`, selectionId: name, slotType, source: slotType } },
  flags: { swse: { progression: { sourceSession: session, selectionKey: `${type}s`, selectionId: name, slotType, source: slotType, ...extra } } },
});
const cls = (name, level) => ({ id: `c${++seq}`, type: 'class', name, system: { level, classId: name.toLowerCase() }, flags: { swse: {} } });
const man = (classId, className, classLevel, characterLevel) => ({ classId, className, classLevel, characterLevel });

// A legitimately generated and leveled multiclass character: Soldier 2 / Scout 1 (character level 3).
function buildLifecycle() {
  const actor = {
    id: 'hero', name: 'Hero', type: 'character', flags: { swse: {} }, items: [cls('Soldier', 2), cls('Scout', 1)], _stats: { modifiedTime: 1 },
    system: {
      level: 3, hp: {}, class: { id: 'soldier', name: 'Soldier' },
      progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 2 }, { class: 'Scout', classId: 'scout', level: 1 }] },
    },
  };
  const certs = [];
  const certify = (session, mode, manifest, audit = { ok: true, errors: [], kind: manifest ? 'levelup-post-finalization' : 'selection-presence', checked: 2 }) => {
    const record = evidence.buildProgressionCertification({
      actor, sessionId: session, mode, manifest, audit,
      fallbackClass: manifest ? null : { classId: 'soldier', className: 'Soldier', classLevel: 1, characterLevel: 1 },
    });
    if (record) { certs.push(record); actor.flags.swse.progressionCertifications = evidence.appendCertification(actor.flags.swse.progressionCertifications, record); }
    return record;
  };
  // chargen (character level 1, Soldier 1): one general feat, one class talent
  actor.items.push(stamp('feat', 'Toughness', 'S1', 'general'), stamp('talent', 'Armor Specialization', 'S1', 'class'));
  certify('S1', 'chargen', null);
  // level 2 (Soldier 2): one class bonus feat
  actor.items.push(stamp('feat', 'Weapon Focus', 'S2', 'class'));
  certify('S2', 'levelup', man('soldier', 'Soldier', 2, 2));
  // level 3 (Scout 1, new base class): one general feat, one class talent
  actor.items.push(stamp('feat', 'Dodge', 'S3', 'general'), stamp('talent', 'Evasion', 'S3', 'class'));
  certify('S3', 'levelup', man('scout', 'Scout', 1, 3));
  return { actor, certs, certify };
}
const run = a => new ProgressionReconciler().reconcileActor(a, {});
const statuses = (r, group) => (r.slots[group] || []).map(s => `${s.id}:${s.status}`);
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };

await check('1. certification binds each granted item instance to the entitlement context from the manifest', () => {
  const { certs } = buildLifecycle();
  const s3 = certs.find(c => c.sessionId === 'S3');
  assert.equal(s3.outcome, 'certified');
  assert.equal(s3.grants.length, 2);
  const talent = s3.grants.find(g => g.itemType === 'talent');
  assert.deepEqual([talent.classId, talent.classLevel], ['scout', 1]);
  const feat = s3.grants.find(g => g.itemType === 'feat');
  assert.equal(feat.characterLevel, 3);
  assert.ok(s3.grants.every(g => g.itemId), 'item-instance identities, not names');
  const s1 = certs.find(c => c.sessionId === 'S1');
  assert.deepEqual([s1.grants.find(g => g.itemType === 'talent').classId, s1.grants.find(g => g.itemType === 'feat').characterLevel], ['soldier', 1]);
});

await check('2. REGRESSION: a legitimately generated + leveled multiclass character has no false "extra" and every grant is satisfied', () => {
  const { actor } = buildLifecycle();
  const r = run(actor);
  assert.equal(r.rollup.counts.extra, 0, 'no extra feat/talent');
  assert.equal(r.slots.classFeats.concat(r.slots.classTalents, r.slots.generalFeats).filter(s => s.status === 'overfilled').length, 0);
  assert.equal(r.slots.classTalents.find(s => s.classId === 'soldier' && s.classLevel === 1).status, 'filled');
  assert.equal(r.slots.classTalents.find(s => s.classId === 'scout' && s.classLevel === 1).status, 'filled');
  assert.equal(r.slots.classFeats.find(s => s.classId === 'soldier' && s.classLevel === 2).status, 'filled');
  assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 1).status, 'filled');
  assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 3).status, 'filled');
  assert.equal(r.slots.generalFeats.find(s => s.characterLevel === 3).filledByName, 'Dodge', 'certified grant fills exactly its character-level slot');
  assert.equal(r.evidence.counts.certified, 5);
  assert.equal(r.evidence.certifiedUnmatched.length, 0);
});

await check('2b. REGRESSION: reopening the sheet (new reconciler, memoized path) yields the identical verdict', () => {
  const { actor } = buildLifecycle();
  const first = ProgressionReconciler.safeReconcileActor(actor, { output: 'report' });
  const second = ProgressionReconciler.safeReconcileActor(actor, { output: 'report' });
  const third = new ProgressionReconciler().reconcileActor(actor, {});
  for (const r of [first, second, third]) {
    assert.equal(r.rollup.counts.extra, 0);
    assert.equal(r.slots.classTalents.filter(s => s.status === 'filled').length, 2);
  }
  assert.equal(JSON.stringify(first.rollup), JSON.stringify(second.rollup));
});

await check('3. the same character WITHOUT certifications: weaker heuristics can neither fill nor accuse (evidence gap)', () => {
  const { actor } = buildLifecycle();
  delete actor.flags.swse.progressionCertifications;
  const r = run(actor);
  assert.equal(r.rollup.counts.extra, 0, 'never "extra" from a failed match');
  assert.equal(r.rollup.playerActionable === true && r.slots.classTalents.some(s => s.status === 'overfilled'), false);
  assert.equal(r.evidence.counts.certified, 0);
  assert.equal(r.evidence.counts.stamped, 5);
});

await check('4. an audit-FAILED (or malformed) transaction record is never trusted', () => {
  const { actor, certs } = buildLifecycle();
  const bad = { ...certs.find(c => c.sessionId === 'S3'), outcome: 'audit-failed', audit: { ok: false, kind: 'levelup-post-finalization', errorCount: 1, errors: ['Missing talent: Evasion'] } };
  actor.flags.swse.progressionCertifications = evidence.appendCertification(actor.flags.swse.progressionCertifications, bad);
  const history = evidence.getVerifiedHistory(actor);
  assert.equal(history.untrusted.length, 1);
  assert.ok(!history.trusted.some(c => c.sessionId === 'S3'));
  const r = run(actor);
  assert.ok(r.engineFindings.some(f => f.code === 'progression-record-untrusted'));
  assert.equal(r.rollup.playerActionable, false, 'tooling/evidence problems never become a player-facing character error');
  const forged = { kind: 'swse-progression-certification', sessionId: 'S9', outcome: 'certified', audit: { ok: false, kind: 'levelup-post-finalization' }, grants: [] };
  actor.flags.swse.progressionCertifications.push(forged);
  assert.equal(evidence.getVerifiedHistory(actor).untrusted.length, 2, 'outcome "certified" without audit.ok === true is untrusted');
});

await check('5. a certified item later DELETED surfaces as a real missing choice plus an explanatory note', () => {
  const { actor } = buildLifecycle();
  actor.items = actor.items.filter(i => i.name !== 'Evasion');
  const r = run(actor);
  assert.ok(r.slots.classTalents.some(s => s.classId === 'scout' && s.status === 'open'));
  assert.equal(r.rollup.playerActionable, true);
  const sheet = new ProgressionReconciler().toSheetAudit(r);
  assert.ok(sheet.validation.notes.some(n => /no longer on the character/.test(n.text)));
});

await check('6. class level removed after certification: GM diagnostic, certified grant kept legal (not "extra")', () => {
  const { actor } = buildLifecycle();
  actor.items = actor.items.filter(i => i.name !== 'Scout');
  actor.system.progression.classLevels = actor.system.progression.classLevels.filter(c => c.classId !== 'scout');
  actor.system.level = 2;
  const r = run(actor);
  assert.ok(r.engineFindings.some(f => f.code === 'certified-class-level-lost'));
  assert.ok(r.engineFindings.some(f => f.code === 'certified-grant-unmatched'));
  assert.equal(r.rollup.counts.extra, 0);
  assert.equal(r.slots.classTalents.concat(r.slots.classFeats).filter(s => s.status === 'overfilled').length, 0);
  assert.equal(r.rollup.playerActionable, false);
});

await check('7. a feat added by hand after the fact is an unattributed record, not a confirmed illegal extra', () => {
  const { actor } = buildLifecycle();
  actor.items.push({ id: 'manual1', type: 'feat', name: 'GM Gift', system: {}, flags: { swse: {} } });
  const r = run(actor);
  assert.equal(r.evidence.counts.none, 1);
  assert.equal(r.rollup.playerActionable, false);
  assert.equal(r.rollup.counts.extra, 0);
});

await check('8. appendCertification is per-session idempotent and bounded', () => {
  const rec = n => ({ sessionId: `s${n}`, kind: 'swse-progression-certification', grants: [] });
  let list = [];
  for (let i = 0; i < 80; i += 1) list = evidence.appendCertification(list, rec(i));
  assert.equal(list.length, evidence.MAX_CERTIFICATIONS);
  const before = list.length;
  list = evidence.appendCertification(list, rec(79));
  assert.equal(list.length, before);
});

await check('9. builder reuses the existing audit: failing audit => audit-failed outcome', () => {
  const { actor } = buildLifecycle();
  const rec = evidence.buildProgressionCertification({ actor, sessionId: 'S3', mode: 'levelup', manifest: man('scout', 'Scout', 1, 3), audit: { ok: false, kind: 'levelup-post-finalization', errors: ['Missing talent: Evasion'] } });
  assert.equal(rec.outcome, 'audit-failed');
  assert.equal(rec.audit.ok, false);
  assert.equal(evidence.buildProgressionCertification({ actor, sessionId: 'unknown', mode: 'levelup' }), null);
});

await check('10. finalizer writes the certification only after the mutation, via ActorEngine, and never fails the commit', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-finalizer.js'), 'utf8');
  const apply = src.indexOf('const result = await this._applyMutationPlan(actor, finalMutationPlan);');
  const audit = src.indexOf('const postAudit = this._auditLevelUpFinalization(');
  const success = src.indexOf('await this._certifyProgressionSession(actor, sessionState, finalMutationPlan, certificationAudit);');
  assert.ok(apply > 0 && audit > apply && success > audit, 'certification must follow apply and post-audit');
  assert.match(src, /await this\._certifyProgressionSession\(actor, sessionState, finalMutationPlan, postAudit\);/);
  const body = src.slice(src.indexOf('static async _certifyProgressionSession'));
  assert.match(body, /persistCertification\(this\._resolveActorEngine\(\), actor, record/);
  const evidenceSrc = fs.readFileSync(path.join(ROOT, 'scripts/engine/progression/utils/progression-evidence.js'), 'utf8');
  assert.match(evidenceSrc, /engine\.updateActor\(actor/);
  assert.match(body, /catch \(error\)[\s\S]*certified: false/);
  assert.ok(!/actor\.update\(|actor\.setFlag\(/.test(body.slice(0, body.indexOf('static _auditLevelUpFinalization') > 0 ? body.length : body.length)));
});

await check('11. _certifyProgressionSession end-to-end with a stub ActorEngine', async () => {
  const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');
  const { actor } = buildLifecycle();
  delete actor.flags.swse.progressionCertifications;
  const writes = [];
  globalThis.SWSE = { ...(globalThis.SWSE || {}), ActorEngine: { applyMutationPlan: async () => ({}), updateActor: async (a, data, opts) => { writes.push({ data, opts }); } } };
  const ok = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S3', mode: 'levelup', progressionSession: {} },
    { set: { 'flags.swse.levelUpEntitlementManifest': man('scout', 'Scout', 1, 3) } }, { ok: true, errors: [] });
  assert.equal(ok.certified, true);
  assert.equal(writes.length, 1);
  const saved = writes[0].data['flags.swse.progressionCertifications'];
  assert.equal(saved[0].outcome, 'certified');
  const failed = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S3', mode: 'levelup', progressionSession: {} },
    { set: { 'flags.swse.levelUpEntitlementManifest': man('scout', 'Scout', 1, 3) } }, { ok: false, errors: ['x'] });
  assert.equal(failed.certified, false);
  assert.equal(writes[1].data['flags.swse.progressionCertifications'].at(-1).outcome, 'audit-failed');
  globalThis.SWSE.ActorEngine.updateActor = async () => { throw new Error('write failed'); };
  const swallowed = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S3', mode: 'levelup', progressionSession: {} }, {}, { ok: true });
  assert.equal(swallowed.certified, false, 'a certification write failure is contained');
});


await check('12. [unit] no audit / unlabelled audit / vacuous audit => "unverified", never certified or trusted', () => {
  const { actor } = buildLifecycle();
  for (const audit of [null, { ok: true }, { ok: true, kind: 'selection-presence', vacuous: true, checked: 0 }]) {
    const rec = evidence.buildProgressionCertification({ actor, sessionId: 'S3', mode: 'chargen', audit });
    assert.equal(rec.outcome, 'unverified');
    assert.equal(rec.audit.ok, false);
    const probe = { flags: { swse: { progressionCertifications: [rec] } }, items: actor.items };
    assert.equal(evidence.getVerifiedHistory(probe).trusted.length, 0);
  }
  const hand = { kind: 'swse-progression-certification', sessionId: 'Sx', outcome: 'certified', audit: { ok: true }, grants: [] };
  assert.equal(evidence.getVerifiedHistory({ flags: { swse: { progressionCertifications: [hand] } }, items: [] }).trusted.length, 0, 'a certified record with no labelled verification is untrusted');
});

await check('13. [unit] level-up audit with no manifest is vacuous and is NOT certified', async () => {
  const { auditLevelUpActorAfterFinalization, auditSelectionsMaterialized } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-finalization-audit.js');
  assert.equal(auditLevelUpActorAfterFinalization({ items: [], system: {} }, null, null).vacuous, true);
  const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');
  const { actor } = buildLifecycle();
  delete actor.flags.swse.progressionCertifications;
  const writes = [];
  globalThis.SWSE = { ...(globalThis.SWSE || {}), ActorEngine: { applyMutationPlan: async () => ({}), updateActor: async (a, data) => { writes.push(data); } } };
  const res = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S3', mode: 'levelup', progressionSession: {} }, {}, { ok: true, vacuous: true, errors: [] });
  assert.equal(res.certified, false);
  assert.equal(writes[0]['flags.swse.progressionCertifications'][0].outcome, 'unverified');
  const none = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S3', mode: 'levelup', progressionSession: {} }, { set: { 'flags.swse.levelUpEntitlementManifest': man('scout', 'Scout', 1, 3) } }, null);
  assert.equal(none.certified, false, 'a level-up with no post-apply audit result is unverified');
  assert.ok(auditSelectionsMaterialized);
});

await check('14. [unit, real validators] chargen/recovery are certified only by a real selection-presence audit', async () => {
  const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');
  const { actor } = buildLifecycle();
  const writes = [];
  globalThis.SWSE = { ...(globalThis.SWSE || {}), ActorEngine: { applyMutationPlan: async () => ({}), updateActor: async (a, data) => { writes.push(data['flags.swse.progressionCertifications'].at(-1)); } } };
  const session = names => ({ draftSelections: { feats: names.feats || [], talents: names.talents || [] } });
  const ok = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S1', mode: 'chargen', progressionSession: session({ feats: [{ name: 'Toughness' }], talents: [{ name: 'Armor Specialization' }] }) }, {}, null);
  assert.equal(ok.certified, true);
  assert.equal(writes.at(-1).audit.kind, 'selection-presence');
  const missing = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S1', mode: 'chargen', progressionSession: session({ feats: [{ name: 'Toughness' }, { name: 'Never Created' }] }) }, {}, null);
  assert.equal(missing.certified, false);
  assert.equal(writes.at(-1).outcome, 'audit-failed');
  const vacuous = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S1', mode: 'chargen', progressionSession: session({}) }, {}, null);
  assert.equal(vacuous.certified, false);
  assert.equal(writes.at(-1).outcome, 'unverified', 'nothing checked => unverified, not certified');
  const reconcile = await ProgressionFinalizer._certifyProgressionSession(actor, { sessionId: 'S2', mode: 'levelup', progressionSession: { reconciliation: { mode: 'reconcile' }, ...session({ feats: [{ name: 'Weapon Focus' }] }) } }, {}, null);
  assert.equal(reconcile.certified, true, 'recovery sessions use the selection-presence audit');
  assert.equal(writes.at(-1).mode, 'reconcile');
});

await check('15. [unit] identity: a different item stored under a certified item id does NOT inherit the certification', () => {
  const swap = mutate => { const { actor } = buildLifecycle(); const t = actor.items.find(i => i.name === 'Evasion'); mutate(t); return { actor, t }; };
  // replaced by a different talent, same embedded id and stamp
  let { actor, t } = swap(item => { item.name = 'Something Else Entirely'; });
  let evd = evidence.getAcquisitionEvidence(actor, t);
  assert.equal(evd.status, 'identity-mismatch');
  let r = run(actor);
  assert.ok(r.engineFindings.some(f => f.code === 'certified-item-replaced'));
  assert.equal(r.slots.classTalents.find(s => s.classId === 'scout').status, 'open', 'the replaced award is a real missing choice, not satisfied');
  assert.ok(!r.slots.classTalents.find(s => s.classId === 'scout').filledByName);
  // replaced and the stamp rewritten / dropped
  ({ actor, t } = swap(item => { item.name = 'Other'; item.flags.swse.progression = {}; item.system.acquisition = {}; }));
  assert.notEqual(evidence.getAcquisitionEvidence(actor, t).status, 'certified');
  // same name but a different transaction stamp
  ({ actor, t } = swap(item => { item.flags.swse.progression.sourceSession = 'S-OTHER'; item.system.acquisition.sourceSession = 'S-OTHER'; }));
  assert.equal(evidence.getAcquisitionEvidence(actor, t).status, 'identity-mismatch');
  // item type changed
  ({ actor, t } = swap(item => { item.type = 'feat'; }));
  assert.equal(evidence.getAcquisitionEvidence(actor, t).status, 'identity-mismatch');
  // canonical source id changed (renamed AND relinked to another compendium entry)
  ({ actor, t } = swap(item => { item.flags.core = { sourceId: 'Compendium.x.talents.A' }; }));
  const rec = evidence.getVerifiedHistory(actor).trusted.find(c => c.sessionId === 'S3');
  rec.grants.find(g => g.itemId === t.id).canonicalId = 'compendium_x_talents_a';
  assert.equal(evidence.getAcquisitionEvidence(actor, t).status, 'certified');
  t.flags.core.sourceId = 'Compendium.x.talents.B';
  assert.equal(evidence.getAcquisitionEvidence(actor, t).status, 'identity-mismatch');
});

await check('16. [unit] cosmetic rename of an item with a stable canonical id keeps its certification', () => {
  const { actor } = buildLifecycle();
  const t = actor.items.find(i => i.name === 'Evasion');
  t.flags.core = { sourceId: 'Compendium.x.talents.Evasion' };
  const record = evidence.buildProgressionCertification({ actor, sessionId: 'S3', mode: 'levelup', manifest: man('scout', 'Scout', 1, 3), audit: { ok: true, kind: 'levelup-post-finalization' } });
  actor.flags.swse.progressionCertifications = evidence.appendCertification(actor.flags.swse.progressionCertifications, record);
  assert.equal(record.grants.find(g => g.itemId === t.id).canonicalId, 'compendium_x_talents_evasion');
  t.name = 'Evasion (house renamed)';
  assert.equal(evidence.getAcquisitionEvidence(actor, t).status, 'certified');
});

await check('17. [unit] a certified grant is never credited to a DIFFERENT slot: missing target slot, other slots stay open', () => {
  // class: certified (Soldier, class level 2) talent, but Soldier has no talent slot at class level 2; Soldier L1 talent is open
  const actor = { id: 'x1', name: 'X', type: 'character', flags: { swse: {} }, _stats: { modifiedTime: 1 }, items: [cls('Soldier', 2)], system: { level: 2, hp: {}, progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 2 }] } } };
  const t = stamp('talent', 'Phantom Talent', 'SX', 'class');
  actor.items.push(t);
  const rec = evidence.buildProgressionCertification({ actor, sessionId: 'SX', mode: 'levelup', manifest: man('soldier', 'Soldier', 2, 2), audit: { ok: true, kind: 'levelup-post-finalization' } });
  actor.flags.swse.progressionCertifications = evidence.appendCertification(null, rec);
  let r = run(actor);
  const l1 = r.slots.classTalents.find(s => s.classLevel === 1);
  assert.equal(l1.status, 'open', 'the unrelated Soldier level-1 talent entitlement must stay open');
  assert.equal(r.rollup.playerActionable, true);
  assert.ok(r.engineFindings.some(f => f.code === 'certified-grant-unmatched'));
  assert.equal(r.rollup.counts.extra, 0, 'and it is still not "extra"');
  // class grant with NO class level cannot target any slot
  const noLevel = { ...rec, sessionId: 'SY', grants: rec.grants.map(g => ({ ...g, classLevel: 0 })) };
  const t2 = stamp('talent', 'Phantom Talent', 'SY', 'class');
  actor.items = actor.items.filter(i => i !== t); actor.items.push(t2);
  noLevel.grants[0].itemId = t2.id;
  actor.flags.swse.progressionCertifications = evidence.appendCertification(null, noLevel);
  r = run(actor);
  assert.equal(r.slots.classTalents.find(s => s.classLevel === 1).status, 'open');
  // general: certified feat at character level 2 (no general slot at level 2) must not fill the open level-1 slot
  const g = { id: 'x2', name: 'G', type: 'character', flags: { swse: {} }, _stats: { modifiedTime: 1 }, items: [cls('Soldier', 2)], system: { level: 2, hp: {}, progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 2 }] } } };
  const f = stamp('feat', 'Off-Level Feat', 'SZ', 'general');
  g.items.push(f);
  const grec = evidence.buildProgressionCertification({ actor: g, sessionId: 'SZ', mode: 'levelup', manifest: man('soldier', 'Soldier', 2, 2), audit: { ok: true, kind: 'levelup-post-finalization' } });
  g.flags.swse.progressionCertifications = evidence.appendCertification(null, grec);
  const gr = run(g);
  assert.equal(gr.slots.generalFeats.find(s => s.characterLevel === 1).status, 'open', 'a level-2 certified feat must not satisfy the level-1 entitlement');
  assert.ok(gr.engineFindings.some(x => x.code === 'certified-grant-unmatched'));
});

console.log('progression-evidence-reconciliation: all assertions passed');
