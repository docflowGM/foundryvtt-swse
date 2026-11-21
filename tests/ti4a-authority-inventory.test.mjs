/**
 * TI-4A — report-only authority inventory: offline analyzer tests.
 *
 * Synthetic sources and a synthetic fixture tree only. No Foundry runtime, no production file is modified, and nothing here
 * asserts that any real writer is absent: the live-tree test checks only that the analyzer runs and emits a well-formed,
 * deterministic artifact REGARDLESS of how many writers it reports (a reported violation must never fail CI).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  analyzeSource, analyzeTree, validateArtifact, lex, classify, evaluateKnownUnobserved, SCHEMA_ID, LIMITATIONS, CLASSIFICATIONS, COVERAGE_STATEMENT
} from '../tools/lib/ti4-authority-inventory.mjs';
import { FAMILIES, KNOWN_UNOBSERVED } from '../tools/lib/ti4-authority-config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const CLI = path.join(ROOT, 'tools', 'ti4-authority-inventory.mjs');
const FIXTURE_ROOT = path.join(here, 'fixtures', 'ti4a');
const UNREVIEWED = 'scripts/new-unreviewed/new-writer.js';

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const rec = (file, src) => analyzeSource(file, src).records;
const kinds = (records) => records.map((r) => `${r.family}:${r.kind}:${r.form}`);
const runCli = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8' });

/* ------------------------------------------------------------------------------------------ */
check('detects representative direct writes to protected fields (payload key, bracket assign, property assign, flag write, setting write)', () => {
  const src = [
    "actor.update({ 'system.credits': 5 });",
    "updates['system.forcePoints.value'] = 3;",
    'actor.system.credits = 7;',
    "actor.setFlag('foundryvtt-swse', 'actionEconomy', {});",
    "SettingsHelper.set('pendingCustomPurchases', []);",
    "update({ 'system.ammunition.current': 1 });",
    "item.update({ 'system.weaponPosture': 'ready' });"
  ].join('\n');
  const k = kinds(rec('scripts/x/new.js', src));
  assert.ok(k.includes('credits:direct-writer:payload-key'), 'payload key on credits');
  assert.ok(k.includes('forcePoints:direct-writer:payload-key'), 'bracket assignment on Force Points');
  assert.ok(k.includes('credits:direct-writer:assignment'), 'property assignment on credits');
  assert.ok(k.includes('actionEconomy:direct-writer:flag-write'), 'flag write on action economy');
  assert.ok(k.includes('gmApprovalState:direct-writer:setting-write'), 'settings write of an approval queue');
  assert.ok(k.includes('ammunitionFireState:direct-writer:payload-key'), 'ammunition payload key');
  assert.ok(k.includes('equipmentState:direct-writer:payload-key'), 'equipment posture payload key');
});

check('recognizes supported delegated writes (authority API calls) and reports them as delegated, not direct', () => {
  const src = [
    'await TransactionEngine.executeMutationTransaction({ actor });',
    'await ActorEngine.spendForcePoints(actor, 1);',
    'await ActorEngine.gainForcePoints(actor, 1);',
    'AmmoSystem.consumeAmmunition(actor, w, 1);',
    'ActionEconomyConsumption.spend(actor, {});',
    'await UpgradeService.applyUpgrade(a, b, c);'
  ].join('\n');
  const records = rec('scripts/x/caller.js', src);
  assert.equal(records.length, 6);
  assert.ok(records.every((r) => r.kind === 'delegated-call' && r.form === 'authority-call'));
  assert.deepEqual(records.map((r) => r.authority).sort(), ['ActionEconomyConsumption', 'ActorEngine.forcePoints', 'ActorEngine.forcePoints', 'AmmoSystem', 'TransactionEngine', 'UpgradeService']);
  assert.ok(!records.some((r) => r.kind === 'direct-writer'));
});

check('delegated calls come only from mutating authority APIs; an authority caller outside the census is informational, not an unclassified WRITER', () => {
  assert.deepEqual(rec('scripts/x/r.js', 'FireStateStore.readFireState(i); FireStateStore.configurationOptions(w); FollowerSlotService.canGrant(a);'), [], 'read-only authority methods are not mutations');
  assert.deepEqual(kinds(rec('scripts/x/m.js', 'FireStateStore.commitFired(a, w);')), ['ammunitionFireState:delegated-call:authority-call']);
  const art = analyzeTree(FIXTURE_ROOT, { sourceRef: 'fixture' });
  assert.ok(art.totals.unclassifiedCallers >= 1);
  assert.ok(!art.unclassifiedWriters.some((w) => /new-caller/.test(w.id)), 'a caller is not listed as an unclassified writer');
  assert.ok(!Object.keys(art.unclassifiedFiles).includes('scripts/new-unreviewed/new-caller.js'));
});

check('does not classify read-only access as a mutation (property read, getProperty, getFlag, comparison)', () => {
  const src = [
    'const c = actor.system.credits;',
    'if (actor.system.credits === 5) {}',
    'if (actor.system.credits >= cost) {}',
    "const p = foundry.utils.getProperty(actor, 'system.credits');",
    "const a = actor.getFlag('foundryvtt-swse', 'actionEconomy');",
    "const b = actor.getFlag?.('swse', 'bonusForcePoints');",
    'const fp = actor.system.forcePoints.value;'
  ].join('\n');
  const r = analyzeSource('scripts/x/reader.js', src);
  assert.deepEqual(r.records, [], 'no record of any kind for pure reads');
  assert.ok(r.reads.credits >= 3 && r.reads.actionEconomy >= 1 && r.reads.forcePoints >= 2, 'reads are counted, not hidden');
});

check('a bare identifier named like a protected field (const/let/param/local) is a local binding, not a field write; a property assignment still is', () => {
  const local = rec('scripts/x/l.js', 'const installedSystems = actor.system.installedSystems ?? {};\nlet weaponPosture = null;\nfunction f(installedUpgrades = []) { installedUpgrades = []; }');
  assert.deepEqual(local, [], 'local bindings are not document writes');
  assert.deepEqual(kinds(rec('scripts/x/p.js', 'item.system.installedUpgrades = [];')), ['upgradeModificationState:direct-writer:assignment']);
});

check('compound/increment assignment to a protected property is a write; ==, === and => are not', () => {
  const k = kinds(rec('scripts/x/a.js', 'actor.system.credits -= 10;\nactor.system.credits++;\nx = actor.system.credits == 4;\nf = (s) => s.system.credits;'));
  assert.equal(k.filter((x) => x === 'credits:direct-writer:assignment').length, 2);
  assert.equal(k.length, 2);
});

check('comments never produce findings; "//" inside a string or regex does not hide the code that follows', () => {
  const src = [
    "// actor.update({ 'system.credits': 1 });",
    "/* updates['system.credits'] = 9; */",
    "const u = 'http://example.test'; actor.update({ 'system.credits': 2 });",
    "const re = /['\"]\\/\\/x/; actor.update({ 'system.forcePoints.value': 1 });"
  ].join('\n');
  const records = rec('scripts/x/c.js', src);
  assert.deepEqual(kinds(records).sort(), ['credits:direct-writer:payload-key', 'forcePoints:direct-writer:payload-key']);
  assert.deepEqual(records.map((r) => r.line).sort(), [3, 4]);
});

check('aliases and computed paths follow the documented limitations: the literal is surfaced as unresolved-use, never silently dropped', () => {
  const alias = rec('scripts/x/alias.js', "const p = 'system.credits';\nactor.update({ [p]: 1 });");
  assert.deepEqual(kinds(alias), ['credits:unresolved-use:string-literal-use'], 'alias literal is reported, not classified as a write');
  const arg = rec('scripts/x/arg.js', "mystery('system.forcePoints.value', 4);");
  assert.deepEqual(kinds(arg), ['forcePoints:unresolved-use:string-literal-use'], 'argument to an unknown callee is surfaced');
  const inLog = rec('scripts/x/log.js', "console.warn('failed to write system.credits for actor');");
  assert.deepEqual(kinds(inLog), ['credits:unresolved-use:string-literal-use'], 'path embedded in a sentence is surfaced, not hidden');
  // documented false negative: a path built at runtime is invisible
  const computed = rec('scripts/x/computed.js', "actor.update({ ['system.' + k]: 1 });");
  assert.deepEqual(computed, [], 'computed path is a documented false negative');
  assert.ok(LIMITATIONS.some((l) => /Computed or concatenated paths/.test(l)) && LIMITATIONS.some((l) => /Aliases are not followed/.test(l)), 'the limitation is documented in the artifact');
});

check('an unrecognized mutation pattern (nested object form) is a documented false negative, and the limitation says so', () => {
  assert.deepEqual(rec('scripts/x/nested.js', 'actor.update({ system: { credits: 5 } });'), []);
  assert.ok(LIMITATIONS.some((l) => /not a JavaScript parser/i.test(l)));
});

check('authority files are AUTHORITY_INTERNAL; documented exceptions are still emitted and grant nothing; unknown files are UNCLASSIFIED', () => {
  const w = "actor.update({ 'system.credits': 1 });";
  const auth = rec('scripts/engine/store/transaction-engine.js', w);
  const exc = rec('scripts/sheets/v2/character-like-sheet.js', w);
  const unk = rec('scripts/brand/new.js', w);
  assert.equal(auth[0].classification, 'AUTHORITY_INTERNAL');
  assert.equal(exc[0].classification, 'DOCUMENTED_EXCEPTION');
  assert.ok(exc[0].note && exc[0].kind === 'direct-writer', 'the exception record is still a direct-writer finding with its reason');
  assert.equal(unk[0].classification, 'UNCLASSIFIED');
  assert.ok(CLASSIFICATIONS.every((c) => ['AUTHORITY_INTERNAL', 'DOCUMENTED_EXCEPTION', 'PHASE0_INVENTORIED', 'UNCLASSIFIED'].includes(c)));
  assert.equal(classify('scripts/talents/DarkSidePowers.js', 'credits').classification, 'PHASE0_INVENTORIED');
});

check('the lexer masks comments and keeps string contents; templates with substitutions are not exact paths', () => {
  const { masked, strings } = lex("a = 'x'; // c 'system.credits'\n/* system.credits */ b = `p ${q} system.credits`;");
  assert.ok(!masked.includes('// c') && !/\/\* system/.test(masked));
  assert.equal(strings.length, 2);
  assert.deepEqual(kinds(rec('scripts/x/t.js', 'x = `flags.swse.actionEconomy.${k}`;')), ['actionEconomy:unresolved-use:string-literal-use']);
});

/* ------------------------------------------------------------------------------------------ */
check('a newly added writer is REPORTED (UNCLASSIFIED) and does not fail anything: the CLI exits 0 on a tree containing it', () => {
  const art = analyzeTree(FIXTURE_ROOT, { sourceRef: 'fixture' });
  assert.deepEqual(validateArtifact(art), []);
  const unreviewed = art.records.filter((r) => r.file === UNREVIEWED);
  assert.ok(unreviewed.some((r) => r.family === 'credits' && r.kind === 'direct-writer' && r.classification === 'UNCLASSIFIED'), 'credits writer reported');
  assert.ok(unreviewed.some((r) => r.family === 'actionEconomy' && r.form === 'flag-write'), 'flag write reported');
  assert.ok(art.totals.unclassified >= 2);
  assert.ok(Object.keys(art.unclassifiedFiles).includes(UNREVIEWED), 'explicit list of unclassified files');
  const cli = runCli('--root', FIXTURE_ROOT, '--source-ref', 'fixture', '--quiet');
  assert.equal(cli.status, 0, `exit code must be 0 even though violations are reported: ${cli.stderr}`);
  const out = runCli('--root', FIXTURE_ROOT, '--source-ref', 'fixture');
  assert.match(out.stdout, /UNCLASSIFIED/);
  assert.equal(out.status, 0);
});

check('the fixture tree\'s read-only function contributes no writer record', () => {
  const art = analyzeTree(FIXTURE_ROOT, { sourceRef: 'fixture' });
  const lines = fs.readFileSync(path.join(FIXTURE_ROOT, UNREVIEWED), 'utf8').split('\n');
  const readLine = lines.findIndex((l) => l.includes('actor.system.credits +')) + 1;
  assert.ok(readLine > 0);
  assert.ok(!art.records.some((r) => r.file === UNREVIEWED && r.line === readLine), 'read-only expression is not a record');
});

check('output is deterministic: repeated runs and repeated CLI invocations are byte-identical; records are sorted; ids are unique', () => {
  const a = JSON.stringify(analyzeTree(FIXTURE_ROOT, { sourceRef: 'fixture' }));
  const b = JSON.stringify(analyzeTree(FIXTURE_ROOT, { sourceRef: 'fixture' }));
  assert.equal(a, b);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ti4a-'));
  const j1 = path.join(tmp, '1.json'); const j2 = path.join(tmp, '2.json');
  assert.equal(runCli('--root', FIXTURE_ROOT, '--source-ref', 'fixture', '--out-json', j1, '--quiet').status, 0);
  assert.equal(runCli('--root', FIXTURE_ROOT, '--source-ref', 'fixture', '--out-json', j2, '--quiet').status, 0);
  assert.equal(fs.readFileSync(j1, 'utf8'), fs.readFileSync(j2, 'utf8'));
  assert.ok(!fs.readFileSync(j1, 'utf8').includes(FIXTURE_ROOT), 'no absolute paths in the artifact');
  const art = JSON.parse(fs.readFileSync(j1, 'utf8'));
  assert.equal(art.schema, SCHEMA_ID);
  assert.equal(new Set(art.records.map((r) => r.id)).size, art.records.length);
  fs.rmSync(tmp, { recursive: true, force: true });
});

check('CI semantics: a MALFORMED artifact fails (exit 1), a bad root is an execution error (exit 2); neither is triggered by a reported violation', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ti4a-'));
  const good = path.join(tmp, 'good.json');
  assert.equal(runCli('--root', FIXTURE_ROOT, '--source-ref', 'fixture', '--out-json', good, '--quiet').status, 0);
  assert.equal(runCli('--check-artifact', good).status, 0, 'artifact that reports violations is still well-formed');
  const art = JSON.parse(fs.readFileSync(good, 'utf8'));
  const bad1 = path.join(tmp, 'bad1.json'); fs.writeFileSync(bad1, JSON.stringify({ ...art, schema: 'nope' }));
  const bad2 = path.join(tmp, 'bad2.json'); fs.writeFileSync(bad2, JSON.stringify({ ...art, totals: { ...art.totals, records: art.totals.records + 1 } }));
  const bad3 = path.join(tmp, 'bad3.json'); fs.writeFileSync(bad3, JSON.stringify({ ...art, records: [...art.records].reverse() }));
  const bad4 = path.join(tmp, 'bad4.json'); fs.writeFileSync(bad4, '{not json');
  assert.equal(runCli('--check-artifact', bad1).status, 1);
  assert.equal(runCli('--check-artifact', bad2).status, 1);
  assert.equal(runCli('--check-artifact', bad3).status, 1);
  assert.equal(runCli('--check-artifact', bad4).status, 2, 'unparseable file is an execution error');
  assert.equal(runCli('--root', path.join(tmp, 'does-not-exist')).status, 2);
  fs.rmSync(tmp, { recursive: true, force: true });
});

check('report-only guarantee: the analyzer has no runtime hook, interception or enforcement surface (static source check)', () => {
  const files = ['tools/lib/ti4-authority-inventory.mjs', 'tools/lib/ti4-authority-config.mjs', 'tools/ti4-authority-inventory.mjs'];
  for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
    assert.ok(!/\bHooks\b|\bgame\.|\bActor\.prototype|\bProxy\b|Object\.defineProperty|\bglobalThis\b|\bsetTimeout\b|\bchild_process\b/.test(code.replace(/spawnSync/g, '')) , `${f}: no Foundry/runtime hook or interception tokens`);
    assert.ok(!/\bthrow new Error\(.*(violation|forbidden|unauthori)/i.test(code), `${f}: never throws on a boundary violation`);
  }
  const lib = fs.readFileSync(path.join(ROOT, 'tools/lib/ti4-authority-inventory.mjs'), 'utf8');
  assert.ok(!/writeFileSync|appendFileSync|unlinkSync|renameSync/.test(lib), 'the library never writes files');
});

check('analysis does not modify the scanned tree', () => {
  const snap = () => JSON.stringify(fs.readdirSync(path.join(FIXTURE_ROOT, 'scripts'), { recursive: true }).sort().map((f) => [f, (() => { try { return fs.statSync(path.join(FIXTURE_ROOT, 'scripts', f)).mtimeMs; } catch { return 0; } })()]));
  const before = snap();
  analyzeTree(FIXTURE_ROOT, { sourceRef: 'x' });
  assert.equal(snap(), before);
});

check('live tree: the analyzer runs on this checkout and emits a well-formed, deterministic artifact whatever it reports', () => {
  const a = analyzeTree(ROOT, { sourceRef: 'live' });
  assert.deepEqual(validateArtifact(a), []);
  assert.equal(JSON.stringify(a), JSON.stringify(analyzeTree(ROOT, { sourceRef: 'live' })));
  assert.equal(a.reportOnly, true);
  assert.ok(a.scanned.fileCount > 100);
});

check('R3: a known blind spot (constant-key flag write) is invisible to the recognizers but is surfaced by the machine-readable known-unobserved inventory, which marks the family KNOWN_GAPS', () => {
  const src = fs.readFileSync(path.join(FIXTURE_ROOT, 'scripts/engine/combat/action/action-economy-persistence.js'), 'utf8');
  const r = analyzeSource('scripts/engine/combat/action/action-economy-persistence.js', src);
  assert.deepEqual(r.records.filter((x) => x.family === 'actionEconomy'), [], 'the analyzer does NOT recognize the constant-key write (documented false negative)');
  const art = analyzeTree(FIXTURE_ROOT, { sourceRef: 'fixture' });
  assert.deepEqual(validateArtifact(art), []);
  const ku = art.knownUnobserved.find((k) => k.id === 'KU-AE-1');
  assert.equal(ku.presentInTree, true, 'self-verified against the tree');
  assert.deepEqual(ku.matches.map((m) => m.line), [6, 9], 'the two constant-key writes are located');
  assert.equal(art.coverage.families.actionEconomy.ratchetCoverage, 'KNOWN_GAPS');
  assert.deepEqual(art.coverage.families.actionEconomy.knownUnobservedIds, ['KU-AE-1']);
  assert.equal(art.coverage.families.credits.ratchetCoverage, 'LOWER_BOUND');
  assert.ok(Object.values(art.coverage.families).every((f) => f.inventoryComplete === false), 'no family is ever complete');
  assert.equal(art.coverage.statement, COVERAGE_STATEMENT);
  assert.equal(runCli('--root', FIXTURE_ROOT, '--source-ref', 'fixture', '--quiet').status, 0, 'known-unobserved entries never change the exit code');
});

check('R3: entries are self-verifying — absent from a tree that lacks the evidence; stale entries are reported not-present; config entries are well-formed', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ti4a-'));
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'scripts', 'lone.js'), 'export const x = 1;\n');
  const art = analyzeTree(tmp, { sourceRef: 'empty' });
  assert.ok(art.knownUnobserved.every((k) => k.presentInTree === false && k.matches.length === 0));
  assert.ok(Object.values(art.coverage.families).every((f) => f.ratchetCoverage === 'LOWER_BOUND' && f.knownUnobservedIds.length === 0));
  assert.deepEqual(validateArtifact(art), []);
  fs.rmSync(tmp, { recursive: true, force: true });
  const ids = KNOWN_UNOBSERVED.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  for (const k of KNOWN_UNOBSERVED) {
    assert.ok(FAMILIES[k.family], `${k.id}: known family`);
    assert.ok(k.evidence.length >= 1 && k.evidence.every((e) => e.file && e.pattern), `${k.id}: evidence`);
    assert.ok(k.reason && k.certificationEffect && k.description, `${k.id}: states why and what it limits`);
  }
  assert.equal(evaluateKnownUnobserved(FIXTURE_ROOT).length, KNOWN_UNOBSERVED.length);
});

check('R3: a coverage claim that overstates completeness is a MALFORMED artifact (CI-visible), while a reported gap is not', () => {
  const art = analyzeTree(FIXTURE_ROOT, { sourceRef: 'fixture' });
  const clone = () => JSON.parse(JSON.stringify(art));
  const a1 = clone(); a1.coverage.families.credits.inventoryComplete = true;
  const a2 = clone(); a2.coverage.families.actionEconomy.ratchetCoverage = 'LOWER_BOUND';
  const a3 = clone(); a3.coverage.families.credits.knownUnobservedIds = ['KU-AE-1'];
  const a4 = clone(); delete a4.coverage;
  const a5 = clone(); a5.coverage.statement = 'complete';
  for (const [name, bad] of [['complete claim', a1], ['ratchet mismatch', a2], ['wrong id list', a3], ['missing coverage', a4], ['rewritten statement', a5]]) {
    assert.notDeepEqual(validateArtifact(bad), [], `${name} must be malformed`);
  }
  assert.deepEqual(validateArtifact(art), [], 'the honest artifact with a known gap is well-formed');
});

check('committed baseline artifacts (if present) are well-formed, report-only and carry a source ref; their contents are NOT compared to the live tree', () => {
  const dir = path.join(ROOT, 'docs', 'audits', 'transaction-integrity', 'ti-4', 'baseline');
  if (!fs.existsSync(dir)) return;
  const jsons = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.ok(jsons.length >= 1);
  for (const f of jsons) {
    const art = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.deepEqual(validateArtifact(art), [], `${f} must validate`);
    assert.match(art.sourceRef, /[0-9a-f]{7,}/, `${f} records the exact source head`);
    assert.ok(art.coverage && art.coverage.families.actionEconomy.ratchetCoverage === 'KNOWN_GAPS', `${f} carries explicit known-gap coverage limits`);
  }
});

/* ------------------------------------------------------------------------------------------ */
let passed = 0;
for (const { name, fn } of checks) {
  try { fn(); passed++; console.log(`  [${passed}] ${name} OK`); } catch (e) { console.error(`FAILED: ${name}`); throw e; }
}
console.log(`\nTI-4A authority inventory: ${passed} checks passed.`);
