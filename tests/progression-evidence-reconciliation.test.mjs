/**
 * Progression Authority & Reconciliation: certified legal progression must not be invalidated by
 * weaker secondary reconciliation heuristics.
 *
 * Items below are stamped EXACTLY like FeatTalentPlanBuilder stamps ordinary progression grants:
 * sourceSession / selectionKey / selectionId / slotType, and NO classId / classLevel / characterLevel
 * (those come from step descriptors that ordinary picks do not carry). The certification record is
 * produced by the real buildProgressionCertification() from the level-up manifest context.
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
  const certify = (session, mode, manifest, audit = { ok: true, errors: [] }) => {
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
  const bad = { ...certs.find(c => c.sessionId === 'S3'), outcome: 'audit-failed', audit: { ok: false, errorCount: 1, errors: ['Missing talent: Evasion'] } };
  actor.flags.swse.progressionCertifications = evidence.appendCertification(actor.flags.swse.progressionCertifications, bad);
  const history = evidence.getVerifiedHistory(actor);
  assert.equal(history.untrusted.length, 1);
  assert.ok(!history.trusted.some(c => c.sessionId === 'S3'));
  const r = run(actor);
  assert.ok(r.engineFindings.some(f => f.code === 'progression-record-untrusted'));
  assert.equal(r.rollup.playerActionable, false, 'tooling/evidence problems never become a player-facing character error');
  const forged = { kind: 'swse-progression-certification', sessionId: 'S9', outcome: 'certified', audit: { ok: false }, grants: [] };
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
  const rec = evidence.buildProgressionCertification({ actor, sessionId: 'S3', mode: 'levelup', manifest: man('scout', 'Scout', 1, 3), audit: { ok: false, errors: ['Missing talent: Evasion'] } });
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

console.log('progression-evidence-reconciliation: all assertions passed');
