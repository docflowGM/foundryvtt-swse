// Phase 0 forensic repro harness. READ-ONLY: builds in-memory fixture actors,
// loads REAL class data from packs/classes.db through the REAL normalizer, runs
// the REAL ProgressionReconciler, and prints observed output. It asserts nothing
// and mutates nothing. Run from repo root:
//   node docs/audits/reconciliation-v2-phase0-repro/repro.mjs
import fs from 'node:fs';
import { registerFoundryPathLoader } from '../../../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../../../tests/helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };

const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { normalizeClass } = await import('/systems/foundryvtt-swse/scripts/data/class-normalizer.js');
// Production gets `_attachRemediationActions` only via this side-effect monkeypatch
// (imported by scripts/talents/squad-actions-init.js). See finding RCN-P0-09.
await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-remediation-hotfix.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');

// ---- real class data -> real ClassModel -> real registry --------------------
const rows = fs.readFileSync(new URL('../../../packs/classes.db', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
for (const row of rows) {
  const model = normalizeClass(row);
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;
console.log(`# loaded ${ClassesDB.classes.size} ClassModels from packs/classes.db; ids sample:`, [...ClassesDB.classes.keys()].slice(0, 6).join(','));

// ---- fixture helpers --------------------------------------------------------
let seq = 0;
const item = (type, name, system = {}, flags = {}) => ({ id: `i${++seq}`, _id: `i${seq}`, type, name, system, flags: { swse: flags } });
const cls = (name, level, extra = {}) => item('class', name, { level, classId: name.toLowerCase().replace(/\s+/g, '_'), ...extra });
const feat = (name, system = {}, flags = {}) => item('feat', name, system, flags);
const talent = (name, system = {}, flags = {}) => item('talent', name, system, flags);
function actor({ name = 'Fixture', level, classLevels, classes, classObj, items = [], hpMax, hpHistory, con = 10, abilityHistory, type = 'character' }) {
  return {
    id: `a${++seq}`, name, type, items,
    system: {
      level,
      class: classObj,
      classes,
      hp: { max: hpMax },
      attributes: { con: { mod: Math.floor((con - 10) / 2) } },
      progression: { classLevels, hpGainHistory: hpHistory, abilityIncreaseHistory: abilityHistory },
    },
    flags: {},
  };
}
const R = new ProgressionReconciler();
const run = a => R.reconcileActor(a, {});
const slotSummary = report => Object.fromEntries(['abilityIncreases', 'generalFeats', 'heroicTalents', 'classFeats', 'classTalents']
  .map(k => [k, (report.slots[k] || []).reduce((m, s) => { m[s.status] = (m[s.status] || 0) + 1; return m; }, {})]));
const show = (title, obj) => console.log(`\n## ${title}\n` + JSON.stringify(obj, null, 2));
const cs = r => r.classSummaries.map(c => `${c.className}:${c.level}[${c.levelSource || (c.sources || []).join('+')}${c.isPrestige ? ',prestige' : ''}${c.isNonheroic ? ',nonheroic' : ''}]`);

// ---- CASE 1: Soldier 4, V2 shape: classLevels ledger + owned class item -----
{
  const a = actor({ level: 4, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 4 }], items: [cls('Soldier', 4)] });
  const r = run(a);
  show('C1 Soldier 4 (ledger + class item)', { classSummaries: cs(r), totalLevel: r.totalLevel, totalHeroicLevel: r.totalHeroicLevel, plan: 'see C1b', slots: slotSummary(r) });
  const plan = r.layers.entitlements;
  show('C1b entitlement diagnostics', plan.classLevelSources);
}

// ---- CASE 2: Soldier 4 / Scout 3, ledger + items (double-source) ------------
{
  const a = actor({ level: 7, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 4 }, { class: 'Scout', classId: 'scout', level: 3 }], items: [cls('Soldier', 4), cls('Scout', 3)] });
  const r = run(a);
  show('C2 Soldier 4 / Scout 3 (ledger + items)', { classSummaries: cs(r), totalLevel: r.totalLevel, totalHeroicLevel: r.totalHeroicLevel, slots: slotSummary(r), planClassSources: r.layers.entitlements.classLevelSources });
}

// ---- CASE 3: Soldier 4 / Scout 3, items only (no ledger) --------------------
{
  const a = actor({ level: 7, items: [cls('Soldier', 4), cls('Scout', 3)] });
  const r = run(a);
  show('C3 Soldier 4 / Scout 3 (class items only)', { classSummaries: cs(r), classSummaryRaw: r.classSummaries, totalLevel: r.totalLevel, slots: slotSummary(r) });
}

// ---- CASE 4: chargen level-1 shape: system.class object + item, no ledger ---
{
  const a = actor({ level: 1, classObj: { id: 'soldier', name: 'Soldier' }, items: [cls('Soldier', 1)], hpMax: 42, con: 14 });
  const r = run(a);
  show('C4 chargen L1 Soldier (system.class object, no classLevels)', { classSummaries: cs(r), totalLevel: r.totalLevel, slots: slotSummary(r), hp: r.derivedStats.rows.find(x => x.id === 'hp-max') });
}

// ---- CASE 5: multiclass with ledger single-class object inflating level -----
{
  const a = actor({ level: 7, classObj: { id: 'soldier', name: 'Soldier' }, items: [cls('Soldier', 4), cls('Scout', 3)] });
  const r = run(a);
  show('C5 Soldier 4 / Scout 3 where system.class={Soldier} has no level (reconciler ledger copies actor.system.level)', { classSummaries: cs(r), totalLevel: r.totalLevel, plan: r.layers.entitlements.classLevelSources });
}

// ---- CASE 6: HP: exact history, current HP above the supported maximum ------
{
  const hist = [{ level: 2, amount: 6 }, { level: 3, amount: 6 }];
  const a = actor({ level: 3, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 3 }], items: [cls('Soldier', 3)], hpHistory: hist, hpMax: 999, con: 10 });
  const calc = R._buildActorAuditLayerHelpers;
  const r = run(a);
  show('C6 HP exact record set, current HP 999', { hpRow: r.derivedStats.rows.find(x => x.id === 'hp-max'), hpAudit: r.derivedStats.hpAudit });
}

// ---- CASE 7: multiclass class-feat item with source=class but no class id ---
{
  const a = actor({ level: 7, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 4 }, { class: 'Scout', classId: 'scout', level: 3 }],
    items: [cls('Soldier', 4), cls('Scout', 3), feat('Weapon Focus (Rifles)', { source: 'class' })] });
  const r = run(a);
  show('C7 multiclass; legit feat with source=class but no class id', { classFeatSlots: r.slots.classFeats.map(s => `${s.id}:${s.status}${s.filledByName ? ':' + s.filledByName : ''}`) });
}

// ---- CASE 8: feat vs talent with NO acquisition metadata (asymmetry) --------
{
  const a = actor({ level: 3, classLevels: [{ class: 'Scoundrel', classId: 'scoundrel', level: 3 }], items: [cls('Scoundrel', 3), feat('Skill Focus (Perception)'), talent('Dastardly Strike')] });
  const r = run(a);
  show('C8 un-annotated feat & talent', { featUnknown: r.ownership.featPools.unknown.map(x => x.name), talentUnknown: r.ownership.talentPools.unknown.map(x => x.name), generalFeats: r.slots.generalFeats.map(s => `${s.id}:${s.status}${s.filledByName ? ':' + s.filledByName : ''}`), classTalents: r.slots.classTalents.map(s => `${s.id}:${s.status}${s.filledByName ? ':' + s.filledByName : ''}`), warnings: r.warnings });
}

// ---- CASE 9: Nonheroic 3 / Soldier 2 ----------------------------------------
{
  const a = actor({ level: 5, classLevels: [{ class: 'Nonheroic', classId: 'nonheroic', level: 3 }, { class: 'Soldier', classId: 'soldier', level: 2 }], items: [cls('Nonheroic', 3), cls('Soldier', 2)] });
  const r = run(a);
  show('C9 Nonheroic 3 / Soldier 2', { classSummaries: cs(r), report: { totalLevel: r.totalLevel, totalHeroicLevel: r.totalHeroicLevel }, planHeroic: r.layers.entitlements.classLevelSources, slotCounts: slotSummary(r), abilityIncreaseSlots: r.slots.abilityIncreases.map(s => `${s.id}:count${s.count}:${s.status}`) });
}

// ---- CASE 10: class model unresolved (unknown class) ------------------------
{
  const a = actor({ level: 3, classLevels: [{ class: 'Mystery Class', classId: 'mystery_class', level: 3 }], items: [cls('Mystery Class', 3)] });
  const r = run(a);
  show('C10 unresolvable class', { classSummaries: cs(r), classSlots: r.slots.classChoices.length, status: r.status, warnings: r.warnings, derivedStatus: r.derivedStats.status });
}

// ---- CASE 11: engine failure -> fallback report ------------------------------
{
  const a = actor({ level: 3, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 3 }], items: [cls('Soldier', 3)] });
  const broken = new ProgressionReconciler();
  broken._buildActorAuditLayerHelpers = () => { throw new Error('simulated registry failure'); };
  const r = broken.safeReconcileActor(a, {});
  const sheet = broken.safeReconcileActor(a, { output: 'sheet' });
  show('C11 engine failure', { status: r.status, warnings: r.warnings, sheetStatus: sheet.status, sheetHasOpen: sheet.hasOpenProgression, sheetDiag: sheet.diagnostics });
}

// ---- CASE 12: ability increases with no history (hand-built / imported) ------
{
  const a = actor({ level: 8, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 8 }], items: [cls('Soldier', 8)] });
  const r = run(a);
  show('C12 Soldier 8, no abilityIncreaseHistory', { abilityIncreaseSlots: r.slots.abilityIncreases.map(s => `${s.id}:${s.status}`), warnings: r.warnings.slice(0, 3) });
}

// ---- CASE 13: droid ability-increase count vs manifest ------------------------
{
  const a = actor({ level: 4, type: 'droid', classLevels: [{ class: 'Soldier', classId: 'soldier', level: 4 }], items: [cls('Soldier', 4)] });
  const r = run(a);
  show('C13 droid L4 ability increase count (reconciler)', { slots: r.slots.abilityIncreases.map(s => `${s.id}:count${s.count}`) });
}

// ---- CASE 5b: raw reconciler class summaries when system.class has no level --
{
  const a = actor({ level: 7, classObj: { id: 'soldier', name: 'Soldier' }, items: [cls('Soldier', 4), cls('Scout', 3)] });
  show('C5b reconciler._buildClassSummaries (pre-calculator) for C5', R._buildClassSummaries(a).map(s => `${s.className}:${s.level}[${s.sources.join('+')}]`));
}

// ---- CASE 6b: calculator's own HP verdict BEFORE the report builder rewrites it
{
  const { ProgressionEntitlementCalculator } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-entitlement-calculator.js');
  const hist = [{ level: 2, amount: 6 }, { level: 3, amount: 6 }];
  const a = actor({ level: 3, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 3 }], items: [cls('Soldier', 3)], hpHistory: hist, hpMax: 999, con: 10 });
  const plan = new ProgressionEntitlementCalculator({ helpers: R._buildActorAuditLayerHelpers() }).calculate(a);
  const hpRow = plan.derivedStats.rows.find(x => x.id === 'hp-max');
  show('C6b calculator verdict (pre-builder)', { calculatorStatus: hpRow.status, issue: hpRow.issue, upper: plan.derivedStats.hpAudit.upper });
}

// ---- CASE 10b: was a "missing class progression entry" diagnostic emitted? ---
{
  const a = actor({ level: 3, classLevels: [{ class: 'Mystery Class', classId: 'mystery_class', level: 3 }], items: [cls('Mystery Class', 3)] });
  const seen = [];
  const origWarn = console.warn; console.warn = (...x) => { seen.push(String(x[0])); };
  const r = run(a);
  console.warn = origWarn;
  show('C10b diagnostics for unresolved class', { heroicTalentSlotsFabricated: r.slots.heroicTalents.length, classChoiceSlots: r.slots.classChoices.length, layerWarnMentioningMissingProgression: seen.filter(s => /Missing class progression/.test(s)).length, reportWarnings: r.warnings });
}

// ---- CASE 14: class-table talent slots vs. character-level cadence ----------
{
  const a = actor({ level: 4, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 3 }, { class: 'Scout', classId: 'scout', level: 1 }], items: [cls('Soldier', 3), cls('Scout', 1)] });
  const r = run(a);
  const TalentCadenceEngine = (await import('/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-cadence-engine.js')).default;
  const cadence = [1, 2, 3, 4].filter(l => TalentCadenceEngine.grantsHeroicTalent(l)).length;
  show('C14 Soldier 3 / Scout 1: reconciler class-talent slots vs TalentCadenceEngine count (NO RULING MADE; see RCN-DR-01)', { classTalentSlots: r.slots.classTalents.length, heroicTalentSlotsReported: r.slots.heroicTalents.length, cadenceEngineCountAtHeroicLevel4: cadence });
}

// ---- CASE 15: pure Nonheroic 5 ------------------------------------------------
{
  const a = actor({ level: 5, classLevels: [{ class: 'Nonheroic', classId: 'nonheroic', level: 5 }], items: [cls('Nonheroic', 5)] });
  const r = run(a);
  show('C15 pure Nonheroic 5 (heroic-level-driven slots; NO RULING MADE)', { reportTotalHeroic: r.totalHeroicLevel, planTotalHeroic: R && (new (await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-entitlement-calculator.js')).ProgressionEntitlementCalculator({ helpers: R._buildActorAuditLayerHelpers() })).calculate(a).totalHeroicLevel, generalFeatSlots: r.slots.generalFeats.map(s => s.id), heroicTalentSlots: r.slots.heroicTalents.map(s => s.id) });
}

// ---- Timing: how expensive is one audit? -------------------------------------
{
  const items = [cls('Soldier', 8), cls('Scout', 6), cls('Jedi', 6), ...Array.from({ length: 60 }, (_, i) => feat(`Feat ${i}`)), ...Array.from({ length: 30 }, (_, i) => talent(`Talent ${i}`))];
  const a = actor({ level: 20, classLevels: [{ class: 'Soldier', classId: 'soldier', level: 8 }, { class: 'Scout', classId: 'scout', level: 6 }, { class: 'Jedi', classId: 'jedi', level: 6 }], items });
  const N = 200;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) R.safeReconcileActor(a, { output: 'sheet' });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  show('TIMING safeReconcileActor(output:sheet), level-20 triple-class, 90 feat/talent items (Node, no Foundry)', { meanMsPerCall: +ms.toFixed(2), calls: N });
}
