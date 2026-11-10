#!/usr/bin/env node
/**
 * Weapon three-gate audit -- Gate A/B per-field consumer ledger.
 *
 *   node tools/audit-weapon-v2-3gate-field-consumers.mjs            write data/audits/weapon-v2-3gate-field-consumers.json
 *   node tools/audit-weapon-v2-3gate-field-consumers.mjs --check    committed ledger is current
 *
 * Joins the Phase 5B field census (2,309 paths) with the 5B consumption map (path -> rule family + role), the 5D-H family census and the
 * 5D-I-D residual manifest, then RECONCILES the family statuses against current code: a family the 5D-H table calls DEFERRED is
 * re-dispositioned only where a named production consumer (probe string present in the cited file) exists. Audit artifact only; nothing
 * at runtime reads it. evidenceStatus is EXECUTED only when a test file that references the probe exists; set SWSE_PASSED_TESTS to a
 * file listing passing test names (the rolling-suite log) to upgrade STATIC_ONLY -> EXECUTED.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-v2-3gate-field-consumers.json';
const read = (r) => fs.readFileSync(path.join(ROOT, r), 'utf8');
const json = (r) => JSON.parse(read(r));
const W = 'scripts/items/weapon-runtime/';

// ---- reconciliation of 5D-H family statuses with current code (each entry verified by probe + test at generation) -----------------------
const FAMILY_RECON = {
  '3b.defensive': { disposition: 'DIRECT_CONSUMER', file: 'scripts/engine/combat/reactions/reaction-weapon-context.js', probe: 'reactionModifiers', entrypoint: 'LightsaberTalentActions Block/Deflect/Redirect Shot', test: 'tests/weapon-phase-5d-i-c-c-reaction-defense.test.mjs', note: 'Phase 5D-I-C-C: the reaction executor reads the held canonical weapon declaration; the 5D-H DEFERRED entry predates it' },
  '3b.operation.proficiency-routes': { disposition: 'CONSUMED_VIA_DUPLICATE', file: `${W}proficiency-resolver.js`, probe: 'speciesOverrides', entrypoint: 'resolveCanonicalAttackProficiency (rollAttack)', test: 'tests/weapon-runtime-proficiency.test.mjs', note: 'alternateProficiency / wookiee* operation keys echo selectors.speciesOverrides (verified against the registry: Massassi lanvarok, Bowcaster, Ryyk Blade; Arg\'garok is unmapped::)' },
  '4h.auth.ruleSelectors.riders': { disposition: 'CONSUMED_VIA_DUPLICATE', file: `${W}ability-relations.js`, probe: 'RELATION_POLICY', entrypoint: 'ability relation corpus (planner copy is the 4H mirror)', test: 'tests/weapon-phase-5d-i-d-e-talent-relations.test.mjs', note: 'execution reads the relation corpus, not the 4H planner copy' },
  '3b.wielding': { disposition: 'PARTIAL_CONSUMER', file: `${W}wielding-size.js`, probe: 'designedTwoHandedOf', entrypoint: 'attack-shape.js -> getDamageAbilityContribution / readiness', test: 'tests/weapon-phase-5d-i-d-b2-wielding-size.test.mjs', consumed: ['may-count-as-size', 'designed-for-two-handed-use'], residual: ['counts-as-light-weapon', 'cannot-be-wielded-two-handed', 'feat-or-talent-eligibility', 'handsRequired', 'attackRollModifier', 'AoO equipment bonus', 'requires-two-hands (consumer string present, behavior unverified)'], note: 'Phase 5D-I-B/B2 built the wielding state; 5D-H still lists the family DEFERRED' },
  '3b.qualityParameters': { disposition: 'PARTIAL_CONSUMER', file: `${W}canonical-range.js`, probe: 'qualityEffects', entrypoint: 'resolveCanonicalRange (rollAttack)', test: 'tests/weapon-phase-5d-d-range-resource-consumption.test.mjs', consumed: ['inaccurate (range quality effects)'], residual: ['accurate (numeric effect unverified)', 'arc (numeric effect unverified)'], note: 'keys present in all 203 identities; only the range quality has a demonstrated numeric consumer' },
  '3b.profile.wielding': { disposition: 'CONSUMED_VIA_DUPLICATE', file: `${W}wielding-size.js`, probe: 'resolveEffectiveWieldingSize', entrypoint: 'resolveCanonicalAttackStage -> resolveWielding (rollAttack)', test: 'tests/weapon-3gate-ledger.test.mjs', note: 'attackProfiles[].wielding "two-handed" (Massassi lanvarok melee, size Large) restates a fact the size authority already enforces: a Medium wielder cannot wield it one-handed (requires-two-hands). Open edge, not decided here: WPN-B-001 (Large wielder).' },
  '3b.durability': { disposition: 'BLOCKED_BY_SUBSYSTEM', blockingDecision: 'no weapon-object damage / crafting subsystem (objectDurability, constructionRules have no production consumer; grep-verified); object DR must not reuse creature DR', note: 'owner decision: object damage subsystem' },
};
// operation-key dispositions (41 historical gaps), derived from the 5D-I-D manifest disposition + a current-code consumer search
const KEY_DISPOSITION = {
  DUPLICATE: 'CONSUMED_VIA_DUPLICATE', NON_EXECUTABLE: 'DISPLAY_ONLY', DATA_COMPLETENESS: 'SOURCE_UNRESOLVED', BLOCKED: 'BLOCKED_BY_SUBSYSTEM',
};
// Evidence-based final classification of the historical 41 operation keys that still have no production consumer. Source: the 5D-I-D manifest row
// (what Foundry knows / what must be supplied) re-read in this audit; nothing here implements a mechanic. GM_ADJUDICATED = the rule needs a fact only
// the GM / table can supply (positions, perception, narrative); BLOCKED_BY_SUBSYSTEM = needs state the system does not model; SOURCE_UNRESOLVED = the
// printed text leaves the mechanic open; ORPHANED = source-complete and automatable but no consumer exists (a genuine, small gameplay gap).
const GM = 'GM_ADJUDICATED', BLK = 'BLOCKED_BY_SUBSYSTEM';
const KEY_FINAL = {
  remoteDetonationSafetyRule: [GM, 'needs a measured 100 m distance to the transmitter (GM / map)'],
  lineOfSightOriginHeightSquares: [GM, 'needs whether the target is visible / covered (GM)'],
  alwaysDetermineNorth: [GM, 'needs the fictional direction (GM)'], builtInDigitalCompass: [GM, 'GM supplies direction'],
  audibility: [GM, 'only the target hears the attack; GM adjudicates everyone else'], silentInUse: [GM, 'who would hear otherwise is the GM\'s call'],
  shotVisibility: [GM, 'what observers perceive (GM)'], firingDoesNotRevealShooterPosition: [GM, 'whether anyone detects the shooter (GM)'],
  sensorDetection: [GM, 'a scan of this weapon is made explicitly; Use Computer DC 25 is the scanner\'s check'],
  createsSmokeHazard: [GM, 'who is in the smoke (GM)'], gasConcealmentDuration: [GM, 'who is inside / across the cloud boundary (GM)'],
  providesConcealment: [GM, 'which targets are concealed is a GM ruling; the attack dialog already takes None / 20% / 50% concealment'],
  encumbranceException: [GM, 'carried weight is a GM / inventory total; also bound by the open weight-scope ruling EQ-W-001'],
  ascensionMode: [GM, 'a GM-adjudicated traversal (destination, anchor); the swift mode switch is a plain mode change'],
  allyAttackBonus: [BLK, 'needs designation state (which target is designated, which allies know the frequency); no such state exists'],
  allyEligibleWeapons: [BLK, 'qualifies allyAttackBonus; blocked with it'],
  repeatAttackEachRoundToMaintainDesignation: [BLK, 'needs per-round designation state; no such state exists'],
  grievousWound: ['SOURCE_UNRESOLVED', 'the printed text ("on the following round") leaves the timing open (5D-I-D: SOURCE_CLARIFICATION_NEEDED)'],
  preferredMode: ['DISPLAY_ONLY', 'descriptive preference; the autofire modifier it mentions is already in modeProfiles (manifest: DUPLICATE_OR_NON_EXECUTABLE)'],
  darkSideEmpowerment: ['ORPHANED', 'GENUINE GAP: the Sith Sword rule is source-complete (swift, 1 Force Point, Dark Side Score +1, bonus = Dark Side Score on the next attack) and no consumer exists'],
};
const PROF_ECHO = new Set(['alternateProficiency', 'wookieeAdvancedMeleeProficiencyCounts', 'wookieeTreatsAsProficientWithWeaponProficiencyRifles']);

const grepFiles = (word, dir, exts) => {
  try { return execFileSync('grep', ['-rlw', word, dir, ...exts.flatMap((e) => ['--include', e])], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean).sort(); } catch { return []; }
};
const passed = process.env.SWSE_PASSED_TESTS && fs.existsSync(process.env.SWSE_PASSED_TESTS) ? new Set([...fs.readFileSync(process.env.SWSE_PASSED_TESTS, 'utf8').matchAll(/PASS\s+(\S+\.test\.mjs)/g)].map((m) => m[1])) : null;
const evidence = (probeFile, probe, test) => {
  if (!probeFile) return 'NOT_PROVEN';
  if (!fs.existsSync(path.join(ROOT, probeFile)) || !read(probeFile).includes(probe)) return 'NOT_PROVEN';
  if (test && fs.existsSync(path.join(ROOT, test))) return passed ? (passed.has(path.basename(test)) ? 'EXECUTED' : 'STATIC_ONLY') : 'STATIC_ONLY';
  return 'STATIC_ONLY';
};

export function buildLedger() {
  const census = json('data/audits/weapon-phase-5b-schema-field-census.json');
  const map = json('data/audits/weapon-phase-5b-consumption-map.json');
  const closure = json('data/audits/weapon-phase-5d-h-closure-census.json');
  const manifest = json('data/audits/weapon-phase-5d-i-d-input-manifest.json');
  const byPath = new Map(map.entries.map((e) => [e.path, e]));
  const famRows = new Map(closure.fieldFamilies.rows.map((r) => [r.id, r]));
  const FILE_OF = Object.fromEntries(Object.entries({}));
  void FILE_OF;

  // family dispositions (historical -> current)
  const families = {};
  for (const r of closure.fieldFamilies.rows) {
    const recon = FAMILY_RECON[r.id];
    const hist = r.status;
    let cur;
    if (recon) cur = { disposition: recon.disposition, consumer: recon.file ? { module: recon.file, probe: recon.probe } : null, entrypoint: recon.entrypoint ?? null, behaviorTest: recon.test ?? null, evidenceStatus: recon.file ? evidence(recon.file, recon.probe, recon.test) : 'NOT_PROVEN', consumed: recon.consumed, residual: recon.residual, blockingDecision: recon.blockingDecision ?? null, note: recon.note, reconciled: true };
    else if (r.id.startsWith('3b.operation.')) {
      // operation container families: disposition is per key (below); the family is PARTIAL while any executable key is unconsumed
      const open = (closure.operationKeys.families[r.id.replace('3b.operation.', '')]?.executableUnconsumed ?? []).length;
      cur = { disposition: r.status === 'CONSUMED' ? 'DIRECT_CONSUMER' : open ? 'PARTIAL_CONSUMER' : 'DIRECT_CONSUMER', consumer: null, entrypoint: null, behaviorTest: null, evidenceStatus: 'HISTORICAL_MANIFEST', note: `${open} executable operation key(s) still without a consumer (see operationKeys)`, reconciled: false };
    } else {
      const d = r.status === 'CONSUMED' ? 'DIRECT_CONSUMER' : r.status === 'CONSUMED_VIA_DUPLICATE' ? 'CONSUMED_VIA_DUPLICATE' : r.status === 'PARTIAL' ? 'PARTIAL_CONSUMER' : 'ORPHANED';
      const test = r.consumer ? (grepFiles(r.probe ?? '', 'tests', ['*.mjs'])[0] ?? null) : null;
      cur = { disposition: d, consumer: r.consumer ? { module: r.consumer, probe: r.probe ?? null } : null, entrypoint: null, behaviorTest: test, evidenceStatus: r.consumer ? evidence(r.consumer, r.probe ?? '', test) : 'NOT_PROVEN', blockingDecision: r.status === 'DEFERRED' ? (r.reason ?? r.owner ?? null) : null, note: r.note ?? r.reason ?? null, reconciled: false };
    }
    families[r.id] = { historicalStatus: hist, fieldPaths: r.fieldPaths, ...cur };
  }

  // operation keys
  const opKeys = closure.operationKeys.executableKeysUnconsumed.map((qk) => {
    const [family, key] = qk.split('.');
    const row = manifest.rows.find((x) => x.key === key);
    const hist = row?.disposition ?? 'UNKNOWN';
    const scriptHits = grepFiles(key, 'scripts', ['*.js']);
    let disposition = KEY_DISPOSITION[hist] ?? null, reason = row?.automation ?? null;
    if (PROF_ECHO.has(key)) { disposition = 'CONSUMED_VIA_DUPLICATE'; reason = 'echo of selectors.speciesOverrides (proficiency-resolver.js)'; }
    if (!disposition && KEY_FINAL[key]) { [disposition, reason] = KEY_FINAL[key]; }
    if (!disposition && scriptHits.length) disposition = 'PARTIAL_CONSUMER';
    if (!disposition) disposition = 'ORPHANED'; // no production consumer and not source-silent / blocked / duplicate: itemized owner queue
    return { operationKey: qk, family, key, historicalDisposition: hist, disposition, productionReferences: scriptHits, testReferences: grepFiles(key, 'tests', ['*.mjs']).filter((f) => f !== 'tests/weapon-3gate-ledger.test.mjs'), plannedSubpass: /^DEFERRED_TO_/.test(hist) ? hist.replace('DEFERRED_TO_', '') : null, automation: row?.automation ?? null, note: reason };
  });

  // per field path
  const NONEXEC = (c) => !c.includes('EXECUTION');
  const rows = census.fields.map((f) => {
    const e = byPath.get(`${f.namespace}:${f.fieldPath}`) ?? byPath.get(`${f.namespace === '3B' ? '3B' : f.namespace}:${f.canonicalPath}`);
    if (!e) return { fieldPath: f.fieldPath, namespace: f.namespace, ruleId: null, role: 'UNMAPPED', disposition: 'ORPHANED', evidenceStatus: 'NOT_PROVEN', note: 'no 5B consumption-map entry' };
    const cls = e.classification;
    const fam = families[e.ruleId];
    let role, disposition, consumer = null, evidenceStatus = 'HISTORICAL_MANIFEST', behaviorTest = null, blockingDecision = null, note = null;
    if (NONEXEC(cls)) {
      role = cls.includes('VALIDATION') ? 'VALIDATION' : cls.includes('PROVENANCE') ? 'PROVENANCE' : cls.includes('RECOMMENDATION') ? 'RECOMMENDATION' : cls.includes('STORE') ? 'DISPLAY' : cls[0];
      disposition = (role === 'VALIDATION' || role === 'PROVENANCE') ? 'VALIDATION_ONLY' : 'DISPLAY_ONLY';
      note = `role derived from the 5B classification [${cls.join(', ')}]; not an execution claim`;
    } else if (fam) {
      role = 'EXECUTION'; disposition = fam.disposition; consumer = fam.consumer; evidenceStatus = fam.evidenceStatus; behaviorTest = fam.behaviorTest; blockingDecision = fam.blockingDecision ?? null; note = fam.note ?? null;
    } else { role = 'EXECUTION'; disposition = 'ORPHANED'; evidenceStatus = 'NOT_PROVEN'; note = `rule family ${e.ruleId} has no 5D-H ledger row`; }
    return { fieldPath: f.fieldPath, namespace: f.namespace, ruleId: e.ruleId, identityCount: f.identityCount, occurrenceCount: f.occurrenceCount, role, disposition, consumer, behaviorTest, evidenceStatus, blockingDecision, historicalImplementationState: e.implementationState, note };
  });

  const tally = (arr, k) => Object.fromEntries(Object.entries(arr.reduce((a, x) => ((a[x[k]] = (a[x[k]] ?? 0) + 1), a), {})).sort());
  const execFamilies = Object.entries(families);
  return {
    schemaVersion: 1, tool: 'tools/audit-weapon-v2-3gate-field-consumers.mjs', inputs: { census: census.counts, historicalFamilyCounters: closure.counters },
    summary: {
      fieldPaths: rows.length, byDisposition: tally(rows, 'disposition'), byRole: tally(rows, 'role'), byEvidenceStatus: tally(rows, 'evidenceStatus'),
      historicalImplementationStateCounts: map.summary.byImplementationState,
      familiesReconciledAgainstCurrentCode: Object.keys(FAMILY_RECON),
      executionFamilies: { total: execFamilies.length, byHistoricalStatus: tally(execFamilies.map(([, v]) => v), 'historicalStatus'), byCurrentDisposition: tally(execFamilies.map(([, v]) => v), 'disposition') },
      directConsumerByEvidence: tally(rows.filter((r) => r.disposition === 'DIRECT_CONSUMER'), 'evidenceStatus'),
      orphanedFields: rows.filter((r) => r.disposition === 'ORPHANED').map((r) => r.fieldPath),
      operationKeys: { total: opKeys.length, byDisposition: tally(opKeys, 'disposition') },
    },
    families, operationKeys: opKeys, fields: rows,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = JSON.stringify(buildLedger(), null, 2) + '\n';
  const file = path.join(ROOT, OUT_JSON);
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (cur !== out) { console.error('weapon three-gate ledger is STALE: run node tools/audit-weapon-v2-3gate-field-consumers.mjs'); process.exit(1); }
    console.log('weapon three-gate ledger: current');
  } else { fs.writeFileSync(file, out); console.log(`wrote ${OUT_JSON}`); }
}
