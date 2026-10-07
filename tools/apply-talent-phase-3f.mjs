#!/usr/bin/env node
/**
 * Phase 3F-3 — talent-tree identity normalization: manifest -> dry-run -> apply -> verify.
 *
 * Boundary (exact): 71 talents' `system.treeId` (stale name slug -> the persistent tree `_id`) and 12 tree documents' display
 * name (+ the mirrored `system.talent_tree` label). Nothing else in the two packs changes; the derived runtime registries are
 * regenerated from the packs by tools/build-talent-tree-registry.mjs and must differ only in the 12 trees' id/displayName.
 *
 *   --manifest          write data/audits/talent-phase-3f-normalization-manifest.json (pre-state only; derived from the census)
 *   --report            write data/audits/talent-phase-3f-dry-run-report.json + docs/audits/talent-phase-3f-dry-run.md (no pack written)
 *   --check             pre-state: manifest + report equal a fresh derivation; post-state: same as --verify
 *   --apply             write packs/talents.db, packs/talent_trees.db and both registries (uncommitted); refuses drifted/partial states
 *   --verify [--exact]  check the applied state
 *   --status            PRE_3F / POST_3F / UNKNOWN
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';
import { build as buildCensus, projectNormalization } from './census-talent-tree-identity.mjs';
import { leavesOf, leafDiff } from './apply-talent-phase-3e4.mjs';
import { generateFromPackTexts, serializeRegistry, loadPreviousRegistry, REGISTRY_PATHS } from './build-talent-tree-registry.mjs';
import { reconcile, loadInput } from './reconcile-talent-publication-corpus.mjs';

export const MANIFEST_PATH = 'data/audits/talent-phase-3f-normalization-manifest.json';
export const REPORT_PATH = 'data/audits/talent-phase-3f-dry-run-report.json';
export const DOC_PATH = 'docs/audits/talent-phase-3f-dry-run.md';
const P = { talents: 'packs/talents.db', trees: 'packs/talent_trees.db', classes: 'packs/classes.db' };
const UNTOUCHED = ['packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/talents-homebrew.db', 'packs/talent-trees-homebrew.db', 'data/generated/talents.fixed.json', 'data/fixes/talents.fixed.json', 'data/canonical/talents.json', 'data/class-archetypes.json', 'system.json'];
const ERR = '[talent-phase-3f] ';
const invariant = (ok, m) => { if (!ok) throw new Error(ERR + m); };
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const parse = t => t.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));

export function deriveManifest() {
  const c = buildCensus();
  invariant(c.counts.unclassifiedConsumers === 0 && c.counts.unclassifiedTreeIdReaders === 0, 'the census has unclassified consumers/readers');
  invariant(c.counts.staleTalentTreeIds === 71 && c.counts.driftTrees === 12, `unexpected census scope (${c.counts.staleTalentTreeIds} stale, ${c.counts.driftTrees} drift trees)`);
  const treesText = read(P.trees), trees = parse(treesText), by = new Map(trees.map(t => [t._id, t]));
  return {
    schemaVersion: 1, phase: '3F-3', status: 'NORMALIZATION_MANIFEST', census: 'data/audits/talent-phase-3f-tree-identity-census.json',
    boundary: '71 talent system.treeId leaves + 12 tree name / system.talent_tree leaves; registries regenerated from the packs',
    preState: { talents: gitBlobSha(read(P.talents)), trees: gitBlobSha(treesText), registry: gitBlobSha(read(REGISTRY_PATHS[0])) },
    talents: c.staleTalentReferences.map(r => ({ id: r.talentId, name: r.talent, before: r.currentTreeId, after: r.authoritativeTreeId, tree: r.canonicalTreeKey })),
    trees: c.driftTrees.map(d => ({ id: d.treeId, nameBefore: d.currentName, nameAfter: d.canonicalName, talentTreeLabelBefore: by.get(d.treeId).system.talent_tree ?? null, runtimeIdBefore: d.runtimeIdBefore, runtimeIdAfter: d.runtimeIdAfter, registryIdBefore: d.registrySlugBefore, registryIdAfter: d.registrySlugAfter })),
    census: { staleTalentReferences: c.staleTalentReferences, driftTrees: c.driftTrees }
  };
}

export function project(manifest, talents, trees) {
  const tFix = new Map(manifest.talents.map(t => [t.id, t.after])), nFix = new Map(manifest.trees.map(t => [t.id, t]));
  return {
    talents: talents.map(t => { if (!tFix.has(t._id)) return t; const n = structuredClone(t); n.system.treeId = tFix.get(t._id); return n; }),
    trees: trees.map(t => { const f = nFix.get(t._id); if (!f) return t; const n = structuredClone(t); n.name = f.nameAfter; if (n.system.talent_tree === f.nameBefore) n.system.talent_tree = f.nameAfter; return n; })
  };
}

export function buildReport() {
  const manifest = readJson(MANIFEST_PATH);
  const texts = { talents: read(P.talents), trees: read(P.trees), classes: read(P.classes) };
  const talents = parse(texts.talents), trees = parse(texts.trees);
  const after = project(manifest, talents, trees);
  const tIds = new Set(manifest.talents.map(t => t.id)), nIds = new Set(manifest.trees.map(t => t.id));
  const tb = new Map(talents.map(t => [t._id, t])), ta = new Map(after.talents.map(t => [t._id, t]));
  const nb = new Map(trees.map(t => [t._id, t])), na = new Map(after.trees.map(t => [t._id, t]));
  const talentChanges = manifest.talents.map(m => ({ id: m.id, name: m.name, changes: leafDiff(tb.get(m.id), ta.get(m.id)) }));
  const treeChanges = manifest.trees.map(m => ({ id: m.id, name: m.nameBefore, changes: leafDiff(nb.get(m.id), na.get(m.id)) }));
  const afterTexts = { talents: serializePack(texts.talents, after.talents), trees: serializePack(texts.trees, after.trees), classes: texts.classes };
  const prevReg = loadPreviousRegistry();
  const mans = []; // obsolete-tree aliases only matter for the 3C consolidation, already reflected in the registry on disk
  const regBefore = JSON.parse(read(REGISTRY_PATHS[0]));
  const regAfterSerialized = serializeRegistry(generateFromPackTexts({ texts: afterTexts, previousRegistry: prevReg, manifests: mans }));
  const regAfter = JSON.parse(regAfterSerialized);
  const regByS = new Map(regBefore.filter(e => e.sourceId).map(e => [e.sourceId, e])), regAfterByS = new Map(regAfter.filter(e => e.sourceId).map(e => [e.sourceId, e]));
  const regDiff = [...regAfterByS].filter(([sid, e]) => JSON.stringify(e) !== JSON.stringify(regByS.get(sid))).map(([sid, e]) => ({ sourceId: sid, before: { id: regByS.get(sid).id, displayName: regByS.get(sid).displayName }, after: { id: e.id, displayName: e.displayName }, onlyIdAndDisplayNameChanged: JSON.stringify({ ...e, id: 0, displayName: 0 }) === JSON.stringify({ ...regByS.get(sid), id: 0, displayName: 0 }) })).sort((a, b) => a.before.displayName.localeCompare(b.before.displayName));
  const legacyBefore = regBefore.filter(e => !e.sourceId), legacyAfter = regAfter.filter(e => !e.sourceId);
  const rec = reconcile({ ...loadInput(), production: after.talents, trees: after.trees });
  const v = []; const check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  check('manifest scope is exactly 71 talents and 12 trees', manifest.talents.length === 71 && manifest.trees.length === 12 && talents.length === 1187 && trees.length === 177);
  check('every talent change is exactly the `system.treeId` leaf, and the new value is the `_id` of a tree that contains the talent', talentChanges.every(c => c.changes.length === 1 && c.changes[0].leaf === 'system.treeId') && manifest.talents.every(m => nb.get(m.after)?.system.talentIds.includes(m.id)));
  check('every tree change is exactly `name` and the mirrored `system.talent_tree` label (old -> canonical), nothing else', treeChanges.every(c => c.changes.every(x => ['name', 'system.talent_tree'].includes(x.leaf)) && c.changes.some(x => x.leaf === 'name')) && manifest.trees.every(m => m.talentTreeLabelBefore === m.nameBefore || m.talentTreeLabelBefore === null));
  check('zero changes outside the 71 talents and the 12 trees', sortedFp(talents.filter(t => !tIds.has(t._id))) === sortedFp(after.talents.filter(t => !tIds.has(t._id))) && sortedFp(trees.filter(t => !nIds.has(t._id))) === sortedFp(after.trees.filter(t => !nIds.has(t._id))));
  check('no talent id / name / text / source / page / tag / flag / effect change; no tree id / member list change', manifest.talents.every(m => { const b = tb.get(m.id), a = ta.get(m.id); const s = x => { const y = structuredClone(x); delete y.system.treeId; return JSON.stringify(y); }; return s(a) === s(b); }) && manifest.trees.every(m => JSON.stringify(na.get(m.id).system.talentIds) === JSON.stringify(nb.get(m.id).system.talentIds) && JSON.stringify(na.get(m.id).system.talentNames) === JSON.stringify(nb.get(m.id).system.talentNames) && na.get(m.id)._id === m.id));
  check('talent and tree counts unchanged (1,187 / 177); tree ids and talent ids preserved', after.talents.length === 1187 && after.trees.length === 177 && after.trees.every(t => nb.has(t._id)) && after.talents.every(t => tb.has(t._id)));
  check('reconciler on the projected packs: STALE_TREE_ID_SLUG 0, TREE_DISPLAY_NAME_DRIFT 0, every blocking finding 0', rec.findingCounts.STALE_TREE_ID_SLUG === 0 && rec.findingCounts.TREE_DISPLAY_NAME_DRIFT === 0 && rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  check('registry: only the 12 trees change, and only their `id` (slug) / `displayName`; membership, counts and classAccess identical', regDiff.length === 12 && regDiff.every(d => d.onlyIdAndDisplayNameChanged) && regAfter.length === regBefore.length && JSON.stringify(legacyAfter) === JSON.stringify(legacyBefore));
  check('registry slug ids change only for the six trees whose runtime id changes (case-only renames keep id and slug)', regDiff.filter(d => d.before.id !== d.after.id).length === manifest.trees.filter(t => t.runtimeIdBefore !== t.runtimeIdAfter).length);
  check('no runtime-id collision, and every other tree keeps its runtime id', manifest.census.driftTrees.length === 12 && buildCensusInvariantsOk());
  check('the registry generator (as invoked here) reproduces the on-disk registry from the CURRENT packs byte-for-byte', serializeRegistry(generateFromPackTexts({ texts, previousRegistry: prevReg, manifests: mans })) === read(REGISTRY_PATHS[0]) && read(REGISTRY_PATHS[0]) === read(REGISTRY_PATHS[1]));
  check('second run is a zero diff', JSON.stringify(project(manifest, after.talents, after.trees)) === JSON.stringify(after));
  check(`serialization is surgical: ${71} talent lines and ${12} tree lines change`, (() => { const d = (a, b) => a.split('\n').filter((l, i) => l !== b.split('\n')[i]).length; return d(texts.talents, afterTexts.talents) === 71 && d(texts.trees, afterTexts.trees) === 12; })());
  const untouched = Object.fromEntries(UNTOUCHED.filter(rel => fs.existsSync(path.join(ROOT, rel))).map(rel => [rel, gitBlobSha(read(rel))]));
  return {
    schemaVersion: 1, phase: '3F-3', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    counts: { talentsChanged: 71, treesChanged: 12, talentLeafChanges: talentChanges.reduce((n, c) => n + c.changes.length, 0), treeLeafChanges: treeChanges.reduce((n, c) => n + c.changes.length, 0), registryEntriesChanged: regDiff.length, changedOutsideTargets: 0 },
    preState: { talents: gitBlobSha(texts.talents), trees: gitBlobSha(texts.trees), registryGenerated: gitBlobSha(read(REGISTRY_PATHS[0])), registryFixes: gitBlobSha(read(REGISTRY_PATHS[1])) },
    postState: { talents: gitBlobSha(afterTexts.talents), trees: gitBlobSha(afterTexts.trees), registryGenerated: gitBlobSha(regAfterSerialized), registryFixes: gitBlobSha(regAfterSerialized) },
    untouchedFiles: untouched, talentOthersFingerprint: sortedFp(after.talents.filter(t => !tIds.has(t._id))), treeOthersFingerprint: sortedFp(after.trees.filter(t => !nIds.has(t._id))),
    talentChanges: talentChanges.map(c => ({ id: c.id, name: c.name, before: c.changes[0].before, after: c.changes[0].after })), treeChanges, registryChanges: regDiff, verification: { results: v }
  };
}
function buildCensusInvariantsOk() { const c = readJson('data/audits/talent-phase-3f-tree-identity-census.json'); return c.invariants.runtimeIdCollisionsAfterRename.length === 0 && c.invariants.allOtherRuntimeIdsUnchanged === true; }

function renderDoc(r) {
  const fam = {}; for (const t of r.talentChanges) { const k = `${t.before} → ${t.after}`; (fam[k] ??= []).push(t.name); }
  return ['# Phase 3F-3 — tree identity normalization dry-run', '', `Status: **${r.status}** · ${r.counts.talentsChanged} talents (\`system.treeId\`) · ${r.counts.treesChanged} trees (name + label) · ${r.counts.registryEntriesChanged} registry entries · ${r.counts.changedOutsideTargets} changes outside the targets. **No pack has been written.**`, '',
    '## Verification', '', ...r.verification.results.map(x => `- ${x.ok ? 'PASS' : 'FAIL'} ${x.id}${x.ok || !x.detail ? '' : ' — ' + x.detail}`), '',
    '## Talent `system.treeId` (by slug family)', '', '| Change | Talents |', '|---|---|', ...Object.entries(fam).map(([k, v]) => `| \`${k}\` | ${v.length} |`), '',
    '## Tree display names', '', '| Tree `_id` | Before | After | Leaves |', '|---|---|---|---|', ...r.treeChanges.map(t => `| \`${t.id}\` | ${t.name} | ${t.changes.find(c => c.leaf === 'name').after} | ${t.changes.map(c => c.leaf).join(', ')} |`), '',
    '## Registry entries', '', '| Tree `_id` | Id before → after | displayName before → after |', '|---|---|---|', ...r.registryChanges.map(d => `| \`${d.sourceId}\` | \`${d.before.id}\` → \`${d.after.id}\` | ${d.before.displayName} → ${d.after.displayName} |`), ''].join('\n');
}

export function detect3FState() {
  if (!fs.existsSync(path.join(ROOT, REPORT_PATH))) return 'PRE_3F';
  const r = readJson(REPORT_PATH), t = gitBlobSha(read(P.talents)), n = gitBlobSha(read(P.trees));
  // Phase 3G (structured prerequisites) is a later certified state that rewrites other talent records; the tree pack and registries stay 3F's.
  const g = path.join(ROOT, 'data/audits/talent-phase-3g-dry-run-report.json');
  if (fs.existsSync(g) && r.postState.trees === n && JSON.parse(fs.readFileSync(g, 'utf8')).postState.talents === t) return 'POST_LATER';
  for (const f of ['talent-phase-11-2a-dry-run-report.json', 'talent-phase-11-2b-dry-run-report.json', 'talent-phase-11-2c-dry-run-report.json', 'talent-phase-12-1-dry-run-report.json', 'talent-phase-12-2-dry-run-report.json', 'talent-phase-12-final-dry-run-report.json']) { const h = path.join(ROOT, 'data/audits', f); if (fs.existsSync(h) && r.postState.trees === n && JSON.parse(fs.readFileSync(h, 'utf8')).postState.talents === t) return 'POST_LATER'; }
  return r.postState.talents === t && r.postState.trees === n ? 'POST_3F' : r.preState.talents === t && r.preState.trees === n ? 'PRE_3F' : 'UNKNOWN';
}

export function verifyApplied({ exact = false } = {}) {
  const res = [], check = (id, ok, detail = '') => res.push({ id, ok: !!ok, detail });
  const report = readJson(REPORT_PATH), manifest = readJson(MANIFEST_PATH);
  const talents = parse(read(P.talents)), trees = parse(read(P.trees)), tb = new Map(talents.map(t => [t._id, t])), nb = new Map(trees.map(t => [t._id, t]));
  const tIds = new Set(manifest.talents.map(t => t.id)), nIds = new Set(manifest.trees.map(t => t.id));
  const later = detect3FState() === 'POST_LATER'; // 3G rewrote prerequisite data on other talent records: whole-pack talent fingerprints/blob are superseded
  if (!later) check('packs are the certified Phase 3F post-state', detect3FState() === 'POST_3F');
  else check('tree pack is the certified Phase 3F post-state (talent pack is a later certified state)', gitBlobSha(read(P.trees)) === report.postState.trees);
  check('talent and tree counts unchanged (1,187 / 177)', talents.length === 1187 && trees.length === 177);
  check('all 71 talents carry their tree `_id` in system.treeId, and that tree contains them', manifest.talents.every(m => tb.get(m.id)?.system.treeId === m.after && nb.get(m.after)?.system.talentIds.includes(m.id)));
  check('all 12 trees carry the canonical display name (and mirrored label)', manifest.trees.every(m => nb.get(m.id)?.name === m.nameAfter && (nb.get(m.id).system.talent_tree ?? m.nameAfter) === m.nameAfter));
  if (!later) check('the other talents are unchanged', sortedFp(talents.filter(t => !tIds.has(t._id))) === report.talentOthersFingerprint);
  check('the other trees are unchanged', sortedFp(trees.filter(t => !nIds.has(t._id))) === report.treeOthersFingerprint);
  check('runtime registries equal a fresh generation from the packs', REGISTRY_PATHS.every(rel => gitBlobSha(read(rel)) === report.postState.registryGenerated));
  // Phase 5C owns actor-pack reference migration (embedded sourceId remaps)
  for (const [rel, sha] of Object.entries(report.untouchedFiles)) if (!['data/class-archetypes.json','packs/heroic.db','packs/nonheroic.db','packs/npc.db','packs/droids.db','packs/beasts.db'].includes(rel)) check(`untouched: ${rel}`, fs.existsSync(path.join(ROOT, rel)) && gitBlobSha(read(rel)) === sha);
  const rec = reconcile(loadInput());
  check('reconciler: STALE_TREE_ID_SLUG 0, TREE_DISPLAY_NAME_DRIFT 0, zero blocking findings', rec.findingCounts.STALE_TREE_ID_SLUG === 0 && rec.findingCounts.TREE_DISPLAY_NAME_DRIFT === 0 && rec.blockingFindings.length === 0, JSON.stringify(rec.findingCounts));
  if (exact) { if (!later) check('packs/talents.db equals the certified blob', gitBlobSha(read(P.talents)) === report.postState.talents); check('packs/talent_trees.db equals the certified blob', gitBlobSha(read(P.trees)) === report.postState.trees); }
  return res;
}

export function applyProduction() {
  invariant(detect3FState() === 'PRE_3F', 'REFUSED: packs are not the pre-normalization state (already applied or drifted)');
  invariant(fs.existsSync(path.join(ROOT, REPORT_PATH)) && fs.existsSync(path.join(ROOT, MANIFEST_PATH)), 'REFUSED: manifest and dry-run report must be committed first');
  const committed = readJson(REPORT_PATH); invariant(committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: dry-run report is not certified');
  const fresh = buildReport(); invariant(read(REPORT_PATH) === JSON.stringify(fresh, null, 2) + '\n', 'REFUSED: committed dry-run report differs from a fresh projection');
  const manifest = readJson(MANIFEST_PATH), texts = { talents: read(P.talents), trees: read(P.trees), classes: read(P.classes) };
  const after = project(manifest, parse(texts.talents), parse(texts.trees));
  const out = { talents: serializePack(texts.talents, after.talents), trees: serializePack(texts.trees, after.trees) };
  const reg = serializeRegistry(generateFromPackTexts({ texts: { ...out, classes: texts.classes }, previousRegistry: loadPreviousRegistry(), manifests: [] }));
  invariant(gitBlobSha(out.talents) === committed.postState.talents && gitBlobSha(out.trees) === committed.postState.trees && gitBlobSha(reg) === committed.postState.registryGenerated, 'REFUSED: rendered output does not match the certified post-state blobs');
  fs.writeFileSync(path.join(ROOT, P.talents), out.talents); fs.writeFileSync(path.join(ROOT, P.trees), out.trees);
  for (const rel of REGISTRY_PATHS) fs.writeFileSync(path.join(ROOT, rel), reg);
}

export function main(argv = process.argv.slice(2)) {
  const has = f => argv.includes(f), state = detect3FState();
  const pr = res => { for (const x of res) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`); return res.filter(x => !x.ok).length; };
  if (has('--status')) { console.log(ERR + state); return 0; }
  if (has('--verify') || (has('--check') && state === 'POST_3F')) { const bad = pr(verifyApplied({ exact: has('--exact') })); console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'}`); return bad ? 1 : 0; }
  if (has('--apply')) { applyProduction(); console.log(ERR + 'APPLIED packs/talents.db, packs/talent_trees.db and both registries (uncommitted)'); return 0; }
  invariant(state === 'PRE_3F', `the pre-normalization packs are required (found ${state})`);
  if (has('--manifest')) { fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), JSON.stringify(deriveManifest(), null, 2) + '\n'); console.log(ERR + 'wrote ' + MANIFEST_PATH); return 0; }
  if (has('--check')) {
    if (read(MANIFEST_PATH) !== JSON.stringify(deriveManifest(), null, 2) + '\n') { console.error(ERR + 'STALE: manifest differs from a fresh derivation'); return 1; }
    const r = buildReport(); if (!fs.existsSync(path.join(ROOT, REPORT_PATH)) || read(REPORT_PATH) !== JSON.stringify(r, null, 2) + '\n' || read(DOC_PATH) !== renderDoc(r)) { console.error(ERR + 'STALE: dry-run report differs from a fresh projection'); return 1; }
    console.log(ERR + 'manifest and dry-run report match a fresh projection'); return 0;
  }
  const r = buildReport(); const bad = pr(r.verification.results);
  console.log(`\n${ERR}${r.status}: ${r.counts.talentsChanged} talents, ${r.counts.treesChanged} trees, ${r.counts.registryEntriesChanged} registry entries, ${r.counts.changedOutsideTargets} outside targets`);
  if (bad) return 1;
  if (has('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), JSON.stringify(r, null, 2) + '\n'); fs.writeFileSync(path.join(ROOT, DOC_PATH), renderDoc(r)); console.log(ERR + `wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { process.exit(main()); } catch (e) { console.error(e.message); process.exit(1); } }
