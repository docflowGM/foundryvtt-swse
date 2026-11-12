/**
 * Reconciliation V2 contract (Phases 1-4). Runs the REAL reconciler over REAL class data
 * (packs/classes.db -> normalizeClass -> ClassesDB). Fixtures are in-memory actors only.
 *
 * Locks: one class-level reader that reports conflicts instead of guessing; no fabricated
 * entitlements when class authority is unavailable; provenance-only slot satisfaction;
 * unverifiable != missing; pending rules questions never alert; engine failure fails closed
 * (GM only); HP verdicts are never rewritten; the Silent Success Contract; the report memo.
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
const { readActorClassLevels } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/class-level-reader.js');

for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

let seq = 0;
const item = (type, name, system = {}, flags = {}) => ({ id: `i${++seq}`, type, name, system, flags: { swse: flags } });
const cls = (name, level) => item('class', name, { level, classId: name.toLowerCase().replace(/\s+/g, '_') });
const row = (name, level) => ({ class: name, classId: name.toLowerCase().replace(/\s+/g, '_'), level });
function actor({ level, ledger, items = [], hpMax, hist, abilityHist, type = 'character', derived, stamp }) {
  const a = {
    id: `a${++seq}`, name: 'Fixture', type, items, flags: {},
    system: {
      level, hp: { max: hpMax }, attributes: { con: { mod: 0 } }, derived,
      progression: { classLevels: ledger, hpGainHistory: hist, abilityIncreaseHistory: abilityHist },
    },
  };
  if (stamp !== undefined) a._stats = { modifiedTime: stamp };
  return a;
}
const R = new ProgressionReconciler();
const run = a => R.reconcileActor(a, {});
const count = (report, group, status) => (report.slots[group] || []).filter(s => s.status === status).length;
const check = (name, fn) => { fn(); console.log(`PASS ${name}`); };

check('1. chargen-shape L1 (class item only): truthful provenance, no phantom ledger', () => {
  const r = run(actor({ level: 1, items: [cls('Soldier', 1)] }));
  assert.equal(r.classSummaries[0].levelSource, 'owned class item');
  assert.equal(r.totalLevel, 1);
});

check('2/3. ledger + items agreeing: one summary per class, exact levels, no double count', () => {
  const r = run(actor({ level: 7, ledger: [row('Soldier', 4), row('Scout', 3)], items: [cls('Soldier', 4), cls('Scout', 3)] }));
  assert.deepEqual(r.classSummaries.map(c => [c.classId, c.level]), [['soldier', 4], ['scout', 3]]);
  assert.equal(r.totalLevel, 7);
});

check('4. ledger and items disagree: conflict, no precedence guess, no entitlements, GM-only', () => {
  const a = actor({ level: 4, ledger: [row('Soldier', 4)], items: [cls('Soldier', 3)] });
  assert.equal(readActorClassLevels(a).status, 'conflict');
  const r = run(a);
  assert.equal(r.status, 'engine-failure');
  assert.equal(r.rollup.playerActionable, false);
  assert.equal(r.rollup.gmDiagnostic, true);
  assert.equal(r.slots.generalFeats.length, 0);
  assert.equal(r.totalLevel, 0);
});

check('4b. system.class without a level can never inflate a class (legacy shapes are not read)', () => {
  const a = actor({ level: 7, items: [cls('Soldier', 4), cls('Scout', 3)] });
  a.system.class = { id: 'soldier', name: 'Soldier' };
  a.system.classes = { soldier: { level: 7 } };
  assert.deepEqual(run(a).classSummaries.map(c => c.level), [4, 3]);
});

check('5. prestige comes from ClassModel.prestigeClass, never from a name', () => {
  const rows = readActorClassLevels(actor({ level: 8, items: [cls('Jedi', 7), cls('Jedi Master', 1)] })).rows;
  assert.equal(rows.find(r => r.classId === 'jedi_master').isPrestige, true);
  assert.equal(rows.find(r => r.classId === 'jedi').isPrestige, false);
});

check('6. Nonheroic + Soldier: heroic level is separate; pending rules never alert', () => {
  const r = run(actor({ level: 5, ledger: [row('Nonheroic', 3), row('Soldier', 2)], items: [cls('Nonheroic', 3), cls('Soldier', 2)] }));
  assert.equal(r.totalLevel, 5);
  assert.equal(r.totalHeroicLevel, 2);
  assert.equal(count(r, 'abilityIncreases', 'open'), 0);
  assert.equal(count(r, 'generalFeats', 'open'), 0);
  assert.ok(r.deferredRules.some(d => d.id === 'RECON-003'));
});

check('6b. pure Nonheroic: no fabricated heroic entitlements', () => {
  const r = run(actor({ level: 5, ledger: [row('Nonheroic', 5)], items: [cls('Nonheroic', 5)] }));
  assert.equal(r.totalHeroicLevel, 0);
  assert.equal(r.slots.generalFeats.length, 0);
  assert.equal(r.slots.heroicTalents.length, 0);
});

check('7/8. un-annotated feat and talent are treated alike: never satisfied, never missing-by-proof, never extra', () => {
  const r = run(actor({ level: 1, items: [cls('Soldier', 1), item('feat', 'Skill Focus'), item('talent', 'Some Talent')] }));
  assert.equal(count(r, 'generalFeats', 'filled'), 0);
  assert.equal(count(r, 'generalFeats', 'unverifiable') + count(r, 'classFeats', 'unverifiable'), 1);
  assert.equal(count(r, 'classTalents', 'unverifiable'), 1);
  assert.equal(count(r, 'classTalents', 'open'), 0);
  assert.equal(r.rollup.counts.extra, 0);
  assert.equal(r.rollup.playerActionable, false);
});

check('9. multiclass class feat naming "class" but no class: no phantom missing+extra pair', () => {
  const r = run(actor({
    level: 4, ledger: [row('Soldier', 2), row('Scout', 2)], items: [cls('Soldier', 2), cls('Scout', 2), item('feat', 'Weapon Focus', { source: 'class' })],
  }));
  assert.equal(r.rollup.counts.extra, 0);
  assert.ok((r.slots.classFeats || []).every(s => s.status !== 'overfilled'));
});

check('11. provenance-tagged items fill exactly their slot', () => {
  const r = run(actor({
    level: 2, items: [cls('Soldier', 2), item('feat', 'Bonus Feat', { classId: 'soldier', classLevel: 2, source: 'class-feat' })],
  }));
  const slot = r.slots.classFeats.find(s => s.classLevel === 2);
  assert.equal(slot.status, 'filled');
  assert.equal(slot.filledByName, 'Bonus Feat');
});

check('12. unresolvable class: engine finding, nothing fabricated, GM only', () => {
  const r = run(actor({ level: 3, ledger: [row('Mystery Class', 3)], items: [cls('Mystery Class', 3)] }));
  assert.equal(r.status, 'engine-failure');
  assert.equal(r.rollup.playerActionable, false);
  assert.equal(r.slots.heroicTalents.length, 0);
  assert.ok(r.engineFindings.some(f => f.code === 'class-unresolved'));
});

check('13. HP: verdict comes from the canonical accounting only; estimates (above / below / exact) are never errors', () => {
  const hist = [{ level: 2, amount: 6 }, { level: 3, amount: 6 }];
  const base = { level: 3, ledger: [row('Soldier', 3)], items: [cls('Soldier', 3)], hist };
  const rowOf = r => r.derivedStats.rows.find(x => x.id === 'hp-max');
  const high = rowOf(run(actor({ ...base, hpMax: 999 })));
  assert.equal(high.status, 'unverifiable'); assert.equal(high.needsAttention, false);
  // no ledger: a low maximum is only an unverified estimate, not a definite error
  const low = run(actor({ ...base, hpMax: 5 }));
  assert.equal(rowOf(low).status, 'unverifiable'); assert.equal(rowOf(low).needsAttention, false);
  // ledger present and fully accounted: ok, whatever the historical rolls were
  const ok = actor({ ...base, hpMax: 42 }); ok.system.progression.hpLedger = { conMod: 0, featBonus: 0, bonus: 0, level: 3 };
  assert.equal(rowOf(run(ok)).status, 'ok');
  // ledger records CON +2 across 3 levels; CON dropped to +1: stored max 45 is CORRECT (48 - 3), reconstruction would say 47
  const conDown = actor({ level: 3, ledger: [row('Soldier', 3)], items: [cls('Soldier', 3)], hpMax: 45,
    hist: [{ level: 2, amount: 8 }, { level: 3, amount: 8 }] });
  conDown.system.attributes = { con: { base: 12 } };
  conDown.system.progression.hpLedger = { conMod: 1, featBonus: 0, bonus: 0, level: 3 };
  assert.equal(rowOf(run(conDown)).status, 'ok', 'consistent after a legitimate CON decrease already applied');
  assert.equal(rowOf(run(conDown)).needsAttention, false);
  // CON decreased but the delta was never applied: a DEFINITE, accounted discrepancy with the canonical expectation
  const pending = actor({ level: 3, ledger: [row('Soldier', 3)], items: [cls('Soldier', 3)], hpMax: 48, hist });
  pending.system.attributes = { con: { base: 12 } };
  pending.system.progression.hpLedger = { conMod: 2, featBonus: 0, bonus: 0, level: 3 };
  const pr = rowOf(run(pending));
  assert.equal(pr.status, 'issue'); assert.equal(pr.expected, 45);
  // HP feat gained but not yet reflected
  const feat = actor({ level: 3, ledger: [row('Soldier', 3)], items: [cls('Soldier', 3), { type: 'feat', name: 'Toughness', system: { abilityMeta: { resourceRules: { hitPoints: [{ type: 'MAX_BONUS_PER_LEVEL', value: 1 }] } } } }], hpMax: 40, hist });
  feat.system.attributes = { con: { base: 10 } };
  feat.system.progression.hpLedger = { conMod: 0, featBonus: 0, bonus: 0, level: 3 };
  assert.equal(rowOf(run(feat)).expected, 43);
});

check('14. no ability-increase history: unverifiable, not missing', () => {
  const r = run(actor({ level: 8, ledger: [row('Soldier', 8)], items: [cls('Soldier', 8)] }));
  assert.equal(count(r, 'abilityIncreases', 'open'), 0);
  assert.equal(count(r, 'abilityIncreases', 'unverifiable'), 2);
});

check('14b. a partial durable SYSTEM record (recognised writer) IS a proven shortfall', () => {
  const r = run(actor({ level: 4, ledger: [row('Soldier', 4)], items: [cls('Soldier', 4)], abilityHist: [{ level: 4, increases: { str: 1 }, source: 'progression-finalizer' }] }));
  assert.equal(count(r, 'abilityIncreases', 'open'), 1);
});

check('14c. Q2: a record of unrecognised provenance is preserved and shown but is NOT trusted as system evidence (unverifiable, never open, never filled)', () => {
  const r = run(actor({ level: 4, ledger: [row('Soldier', 4)], items: [cls('Soldier', 4)], abilityHist: [{ level: 4, increases: { str: 1, dex: 1 } }] }));
  const slot = r.slots.abilityIncreases[0];
  assert.equal(slot.status, 'unverifiable'); assert.equal(count(r, 'abilityIncreases', 'open'), 0); assert.equal(count(r, 'abilityIncreases', 'filled'), 0);
  assert.equal(slot.selections.length, 2, 'the unrecognised record is still shown'); assert.ok(slot.selections.every(sel => /\+1$/.test(sel))); assert.match(slot.unverifiableReason, /provenance/);
  assert.equal(slot.completion.classification, 'UNVERIFIABLE');
});

check('14d. a complete record from a recognised writer fills the slot as committed-but-UNVERIFIED (a label is never post-commit verification)', () => {
  const r = run(actor({ level: 4, ledger: [row('Soldier', 4)], items: [cls('Soldier', 4)], abilityHist: [{ level: 4, increases: { str: 1, dex: 1 }, source: 'progression-finalizer' }] }));
  const slot = r.slots.abilityIncreases[0];
  assert.equal(slot.status, 'filled'); assert.equal(slot.completion.classification, 'SYSTEM_COMMITTED_UNVERIFIED'); assert.equal(slot.completion.verification, 'committed-unverified');
});

check('15. a thrown layer is an engine failure, never ok/empty, and carries no player finding', () => {
  const broken = new ProgressionReconciler();
  broken._buildActorAuditLayerHelpers = () => { throw new Error('boom'); };
  const sheet = broken.safeReconcileActor(actor({ level: 1, items: [cls('Soldier', 1)] }), { output: 'sheet' });
  assert.equal(sheet.status, 'engine-failure');
  assert.equal(sheet.validation.playerActionable, false);
  assert.equal(sheet.validation.gmDiagnostic, true);
});

check('16. choice features the audit does not understand are listed, not ignored', () => {
  const r = run(actor({ level: 2, items: [cls('Officer', 2)] }));
  assert.ok(r.coverage.unauditedChoiceTypes.share_talent_choice >= 1);
});

check('17. Silent Success Contract: a fully satisfied actor produces no player-facing validation', () => {
  const a = actor({
    level: 1, items: [cls('Soldier', 1), item('feat', 'Toughness', { source: 'general' }), item('talent', 'Armor Specialization', { classId: 'soldier', classLevel: 1, source: 'class-talent' })],
    hpMax: 30,
    derived: { bab: 1, defenses: { fortitude: { classBonus: 2 }, reflex: { classBonus: 1 }, will: { classBonus: 0 } } },
  });
  const r = run(a);
  assert.equal(r.status, 'ok');
  assert.equal(r.rollup.playerActionable, false);
  assert.equal(r.rollup.gmDiagnostic, false);
  const sheet = R.toSheetAudit(r);
  assert.equal(sheet.validation.findings.length, 0);
  assert.equal(sheet.validation.engineFindings.length, 0);
  assert.deepEqual(r.warnings, []);
});

check('18. a proven missing choice raises exactly one actionable finding with a recovery action', () => {
  const a = actor({ level: 1, items: [cls('Soldier', 1)], hpMax: 30 });
  const r = run(a);
  const sheet = R.toSheetAudit(r);
  assert.equal(r.rollup.playerActionable, true);
  assert.ok(sheet.validation.findings.some(f => f.severity === 'missing' && f.resolve.kind === 'open-step' && f.resolve.dataset.stepId && f.id.startsWith('slot:')));
});

check('19. memo: unchanged actor recomputes nothing; any stamp or progression-item change does', () => {
  let runs = 0;
  const original = ProgressionReconciler.prototype.reconcileActor;
  ProgressionReconciler.prototype.reconcileActor = function counted(...args) { runs += 1; return original.apply(this, args); };
  try {
    const a = actor({ level: 1, items: [cls('Soldier', 1)], stamp: 100 });
    ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' });
    ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' });
    ProgressionReconciler.safeReconcileActor(a, { output: 'report' });
    assert.equal(runs, 1, 'unchanged actor must not recompute (sheet and report share one memo entry)');
    a._stats.modifiedTime = 101;
    ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' });
    assert.equal(runs, 2);
    a.items.push(item('feat', 'New Feat'));
    ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' });
    assert.equal(runs, 3, 'a new progression item must invalidate');
    const noStamp = actor({ level: 1, items: [cls('Soldier', 1)] });
    ProgressionReconciler.safeReconcileActor(noStamp, { output: 'sheet' });
    ProgressionReconciler.safeReconcileActor(noStamp, { output: 'sheet' });
    assert.equal(runs, 5, 'no modification stamp => never memoized');
  } finally {
    ProgressionReconciler.prototype.reconcileActor = original;
  }
});

check('20. memo hits are isolated copies (a consumer mutating one cannot poison the next)', () => {
  const a = actor({ level: 1, items: [cls('Soldier', 1)], stamp: 5 });
  const first = ProgressionReconciler.safeReconcileActor(a, { output: 'report' });
  first.slots.generalFeats.length = 0;
  const second = ProgressionReconciler.safeReconcileActor(a, { output: 'report' });
  assert.ok(second.slots.generalFeats.length > 0);
});

check('21. templates: no audit panel in Summary/Abilities/Talents; header `!` is conditional', () => {
  const read = rel => fs.readFileSync(path.join(ROOT, 'templates/actors/character/v2-concept/partials', rel), 'utf8');
  for (const tab of ['tabs/summary-tab.hbs', 'tabs/abilities-tab.hbs', 'tabs/talents-tab.hbs']) {
    assert.ok(!/progressionAudit/.test(read(tab)), `${tab} still renders reconciliation data`);
  }
  const header = read('frame/header-block.hbs');
  assert.match(header, /\{\{#if conceptLayout\.validationIndicator\.visible\}\}[\s\S]*open-validation-report[\s\S]*\{\{\/if\}\}/);
});

check('22. retired shims and the stale-cache fallback are gone', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/reconciliation/reconciliation-remediation-hotfix.js')));
  const hotfix = fs.readFileSync(path.join(ROOT, 'scripts/patches/progression-ledger-reconciliation-hotfix.js'), 'utf8');
  assert.ok(!/_attachRemediationActions/.test(hotfix));
  const reconciler = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-reconciler.js'), 'utf8');
  assert.ok(!/findLastKnownGoodReport|_markReportStale/.test(reconciler));
});

console.log('reconciliation-v2-contract: all assertions passed');
