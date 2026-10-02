#!/usr/bin/env node
/**
 * Phase 3F-1 — talent-tree identity census (read-only; writes no pack).
 *
 *   node tools/census-talent-tree-identity.mjs           write data/audits/talent-phase-3f-tree-identity-census.json + docs
 *   node tools/census-talent-tree-identity.mjs --check   committed census is current and every consumer of the affected trees is classified
 *
 * Inventories exactly what Phase 3F may touch: (1) every talent whose system.treeId is not the persistent tree _id (stale slug),
 * (2) every tree document whose display name differs from its canonical name, each ONCE; and proves, per tree, how the runtime
 * identity (TalentTreeDB normalized id, derived from the display name) changes when the name is normalized. The audit of every
 * repository consumer of those trees is a classified list: an unclassified file that mentions an affected tree fails --check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCommittedManifests, gitBlobSha as gitSha } from './apply-talent-phase-3c.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/talent-phase-3f-tree-identity-census.json';
export const OUT_MD = 'docs/audits/talent-phase-3f-tree-identity-census.md';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const nd = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);

// EXACT copy of scripts/data/talent-tree-normalizer.js normalizeTalentTreeId (the test asserts it stays identical).
export const runtimeId = name => !name ? 'unknown' : String(name).toLowerCase().replace(/['']/g, '').replace(/\W+/g, '_').replace(/^_|_$/g, '');
export const slugOf = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** TalentTreeDB.build() id assignment over a tree list: name-derived id, `_<sourceId>` suffix for a later same-name tree. */
export function assignRuntimeIds(trees) {
  const held = new Map(), out = new Map();
  for (const t of trees) {
    let id = runtimeId(t.name);
    if (held.has(id) && held.get(id) !== t._id) id = `${id}_${t._id}`;
    held.set(id, t._id); out.set(t._id, id);
  }
  return out;
}

/** Classification of every non-audit file that mentions an affected tree (old/new name, slug, runtime id, or pack _id). */
export const CONSUMERS = {
  'data/generated/talent-trees.registry.json': { kind: 'DERIVED_REGISTRY', keyedOn: 'sourceId + name-derived slug id + displayName', effect: 'rebuilt by tools/build-talent-tree-registry.mjs from the tree pack', action: 'REGENERATE' },
  'data/fixes/talent-trees.registry.json': { kind: 'DERIVED_REGISTRY', keyedOn: 'sourceId + name-derived slug id + displayName', effect: 'rebuilt by tools/build-talent-tree-registry.mjs from the tree pack', action: 'REGENERATE' },
  'data/generated/talents.fixed.json': { kind: 'STALE_DERIVED_MIRROR', keyedOn: 'older-schema talent rows', effect: 'no runtime or tool consumer (3D record); already differs from production for every row', action: 'LEAVE' },
  'data/fixes/talents.fixed.json': { kind: 'STALE_DERIVED_MIRROR', keyedOn: 'older-schema talent rows', effect: 'no runtime or tool consumer (3D record); already differs from production for every row', action: 'LEAVE' },
  'data/canonical/talents.json': { kind: 'CERTIFIED_AUTHORITY', keyedOn: 'canonicalTreeKey (already the normalized name); legacy `tree` label keeps the old spelling', effect: 'immutable certified artifact (3B builders byte-compare it); identity uses canonicalTreeKey', action: 'LEAVE' },
  'data/talent_tree_class_map.json': { kind: 'STATIC_DATA', keyedOn: 'tree display name (case-only difference: Bothan Spynet)', effect: 'no script reads this file', action: 'LEAVE' },
  'data/talent-tree-tags.json': { kind: 'STATIC_DATA', keyedOn: 'slug (bothan-spynet: unchanged by a case-only rename)', effect: 'read by TalentTreeTagRegistry from data/metadata; slug unaffected', action: 'LEAVE' },
  'data/fixes/class-talent-tree-bindings.json': { kind: 'STATIC_DATA', keyedOn: 'slug (bothan-spynet: unchanged by a case-only rename)', effect: 'unaffected', action: 'LEAVE' },
  'data/talent_tree_access_rules.json': { kind: 'STATIC_DATA', keyedOn: 'lowercase hyphen slugs of the case-only trees (agent-of-ossus, ember-of-vahl, ...)', effect: 'unaffected: a case change does not change the slug', action: 'LEAVE' },
  'scripts/engine/progression/droids/droid-progression-guards.js': { kind: 'RUNTIME_CONSUMER', keyedOn: 'normalized tree names in BOTH old (1stdegree) and printed (first degree) spellings + pack source ids', effect: 'already tolerant of the normalized names; no change needed', action: 'LEAVE' },
  'scripts/engine/progression/talents/tree-authority.js': { kind: 'RUNTIME_CONSUMER', keyedOn: 'normalizeAccessKey(id|sourceId|key|name) vs FORCE_TRADITION_TREE_RULES keys', effect: "the rule key 'aing-tii-monk' does not match today's 'Aingtii Monk' (-> 'aingtii-monk'); the normalized name 'Aing-Tii Monk' matches it, so the rename repairs that lookup", action: 'IMPROVES' },
  'scripts/apps/force-tradition/force-tradition-picker.js': { kind: 'RUNTIME_CONSUMER', keyedOn: 'lowercase name compare (ember of vahl)', effect: 'case-insensitive; unaffected', action: 'LEAVE' },
  'scripts/mentor/mentor-survey/prestige-survey-profiles.js': { kind: 'RUNTIME_CONSUMER', keyedOn: 'runtime id bothan_spynet', effect: 'a case-only rename leaves the runtime id unchanged', action: 'LEAVE' },
  'packs/classes.db': { kind: 'CLASS_PACK', keyedOn: 'talentTreeSourceIds (pack _id) + runtime talentTreeIds + names', effect: 'Infiltrator references Bothan SpyNet by sourceId and runtime id bothan_spynet; both unchanged', action: 'LEAVE' },
  'packs/heroic.db': { kind: 'ACTOR_SNAPSHOT', keyedOn: 'embedded talent snapshots (tree names as text)', effect: 'independent snapshots; not modified (3E policy)', action: 'LEAVE' },
  'packs/npc.db': { kind: 'ACTOR_SNAPSHOT', keyedOn: 'embedded talent snapshots (tree names as text)', effect: 'independent snapshots; not modified (3E policy)', action: 'LEAVE' },
  'docs/talent-hunter-pursuit-fear-cleanup-phase-t26.json': { kind: 'HISTORICAL_DOC', keyedOn: 'names in a past cleanup report', effect: 'documentation', action: 'LEAVE' },
  'docs/talent-core-force-traditions-cleanup-phase-t22.json': { kind: 'HISTORICAL_DOC', keyedOn: 'names in a past cleanup report', effect: 'documentation', action: 'LEAVE' },
  'data/feat-choice-options.json': { kind: 'NAME_KEYED_ALREADY_CANONICAL', keyedOn: 'canonical spelling (First/Second/Third-Degree Droid)', effect: 'already uses the normalized names; the pack names are the outliers, so the rename aligns them', action: 'IMPROVES' },
  'data/nonheroic/nonheroic_templates.json': { kind: 'NAME_KEYED_ALREADY_CANONICAL', keyedOn: 'canonical spelling (Bothan SpyNet)', effect: 'already canonical; the rename aligns the pack', action: 'IMPROVES' },
  'data/nonheroic/nonheroic_units.json': { kind: 'NAME_KEYED_ALREADY_CANONICAL', keyedOn: 'canonical spellings (Bothan SpyNet, Aing-Tii Monk, Agent of Ossus)', effect: 'already canonical; the rename aligns the pack', action: 'IMPROVES' },
  'data/talent-tree-descriptions.json': { kind: 'NAME_KEYED_ALREADY_CANONICAL', keyedOn: 'canonical spelling (Bothan SpyNet, Master of Intrigue)', effect: 'already canonical; today the pack name "Bothan Spynet" differs in case', action: 'IMPROVES' },
  'scripts/apps/progression-framework/steps/talent-tree-mentor-commentary.js': { kind: 'NAME_KEYED_ALREADY_CANONICAL', keyedOn: 'canonical spelling (Master of Intrigue, Bothan SpyNet)', effect: 'already canonical; the rename aligns the pack', action: 'IMPROVES' },
  'scripts/apps/droid-builder-app.js': { kind: 'NAME_KEYED_ALREADY_CANONICAL', keyedOn: 'canonical spelling (First/Second/Third-Degree Droid)', effect: 'already canonical; the rename aligns the pack', action: 'IMPROVES' },
  'scripts/sheets/v2/character-sheet/concept-context.js': { kind: 'NAME_KEYED_ALREADY_CANONICAL', keyedOn: 'canonical spelling (Aing-Tii Monk)', effect: 'already canonical; today\'s pack name "Aingtii Monk" does not match it', action: 'IMPROVES' },
  'tools/add-class-to-talents.js': { kind: 'LEGACY_TOOL', keyedOn: 'canonical spelling (Bothan SpyNet)', effect: 'one-off class-to-talent tool; already canonical', action: 'LEAVE' },
  'data/languages.json': { kind: 'UNRELATED_SAME_WORDS', keyedOn: 'language names ("Ember of Vahl" language entry)', effect: 'not a tree reference', action: 'LEAVE' },
  'packs/languages.db': { kind: 'UNRELATED_SAME_WORDS', keyedOn: 'language names', effect: 'not a tree reference', action: 'LEAVE' },
  'data/species-traits.json': { kind: 'UNRELATED_SAME_WORDS', keyedOn: 'the Aing-Tii species name', effect: 'not a tree reference', action: 'LEAVE' },
  'data/species-traits-migrated.json': { kind: 'UNRELATED_SAME_WORDS', keyedOn: 'the Aing-Tii species name', effect: 'not a tree reference', action: 'LEAVE' },
  'data/species-canonical-descriptions.json': { kind: 'UNRELATED_SAME_WORDS', keyedOn: 'the Aing-Tii species name', effect: 'not a tree reference', action: 'LEAVE' },
  'packs/species.db': { kind: 'UNRELATED_SAME_WORDS', keyedOn: 'the Aing-Tii species name', effect: 'not a tree reference', action: 'LEAVE' },
  'tools/manual_phase8_remaining_talents_curation.py': { kind: 'LEGACY_TOOL', keyedOn: 'tree _ids', effect: 'one-off Python curation script; ids unchanged', action: 'LEAVE' }
};
/** Every script/tool that reads a talent's `system.treeId`. STRICT_SOURCE_ID = expects / prefers the persistent tree _id; RUNTIME_ID_ONLY = accepts only a TalentTreeDB runtime id (hardened in 3F-2);
 *  TOLERANT = treats it as one of several candidate tokens (id, slug, name) that are normalized and compared; TOOLING = maintenance/audit scripts. */
export const TREE_ID_READERS = {
  'scripts/actors/derived/defense-calculator.js': 'STRICT_SOURCE_ID', 'scripts/engine/suggestion/equipment/scoring/armor-benefit-simulator.js': 'STRICT_SOURCE_ID',
  'scripts/engine/progression/talents/talent-tree-membership-authority.js': 'STRICT_SOURCE_ID',
  'scripts/data/talent-normalizer.js': 'RUNTIME_ID_ONLY',
  'scripts/engine/effects/modifiers/ModifierEngine.js': 'TOLERANT', 'scripts/engine/progression/feats/feat-choice-resolver.js': 'TOLERANT', 'scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js': 'TOLERANT',
  'scripts/engine/progression/droids/droid-progression-guards.js': 'TOLERANT', 'scripts/engine/talent/sith-talent-actions.js': 'TOLERANT', 'scripts/engine/crew/follower-talent-config.js': 'TOLERANT',
  'scripts/engine/suggestion/ClassSuggestionEngine.js': 'TOLERANT', 'scripts/engine/suggestion/SuggestionEngine.js': 'TOLERANT', 'scripts/engine/suggestion/OpportunityCostAnalyzer.js': 'TOLERANT',
  'scripts/engine/suggestion/BuildCoherenceAnalyzer.js': 'TOLERANT', 'scripts/engine/suggestion/BuildIntent.js': 'TOLERANT', 'scripts/engine/suggestion/SynergyEvaluator.js': 'TOLERANT',
  'scripts/infrastructure/hooks/follower-hooks.js': 'TOLERANT', 'scripts/registries/talent-registry.js': 'TOLERANT', 'scripts/items/talent-data-resolver.js': 'TOLERANT', 'scripts/data/prerequisite-checker.js': 'TOLERANT',
  'scripts/apps/progression-framework/steps/talent-step.js': 'TOLERANT', 'scripts/patches/follower-repeatable-entitlement-hotfix.js': 'TOLERANT', 'scripts/patches/runtime-bugfix-hotfixes.js': 'TOLERANT',
  'scripts/maintenance/migrate-compendium-to-v2-ids.js': 'TOOLING', 'scripts/maintenance/migrate-ndjson-to-v2-ids.js': 'TOOLING', 'scripts/maintenance/migrations/migrate-orphaned-talents.js': 'TOOLING',
  'tools/verify-compendium-fixes.js': 'TOOLING', 'tools/apply-talent-phase-3c.mjs': 'TOOLING', 'tools/audit-talent-homebrew-pack.mjs': 'TOOLING', 'tools/audit-talent-phase-3c-independent.mjs': 'TOOLING', 'tools/build-talent-phase-3b-manifest.mjs': 'TOOLING', 'tools/build-talent-phase-3d-census.mjs': 'TOOLING', 'tools/check-talent-phase-3b-global-closeout.mjs': 'TOOLING', 'tools/check-talent-phase-3e-additions.mjs': 'TOOLING', 'tools/fix-compendium-issues.js': 'TOOLING', 'tools/audit-talent-tree-membership.mjs': 'TOOLING'
};
const EXCLUDE = /^(data\/audits|data\/audit|docs\/audits|reference|node_modules|\.git)\//;
const SELF = new Set([OUT_JSON, OUT_MD, 'tools/census-talent-tree-identity.mjs', 'tools/apply-talent-phase-3f.mjs', 'docs/audits/talent-phase-3f-dry-run.md', 'data/audits/talent-phase-3f-normalization-manifest.json', 'data/audits/talent-phase-3f-dry-run-report.json', 'tests/talent-phase-3f-tree-identity.test.mjs', 'docs/audits/talent-phase-3f-identity-contract.md']);

/** Inverse of the projection: rebuild the pre-normalization packs from the committed (pre-state) census. Lets the contract tests exercise the
 *  BEFORE state after Phase 3F has been applied. */
export function reverseNormalization({ trees, talents }, census) {
  const nameOf = new Map(census.driftTrees.map(d => [d.treeId, d.currentName]));
  const was = new Map(census.staleTalentReferences.map(r => [r.talentId, r.currentTreeId]));
  return {
    trees: trees.map(t => nameOf.has(t._id) ? { ...t, name: nameOf.get(t._id), system: { ...t.system, ...(t.system.talent_tree !== undefined ? { talent_tree: nameOf.get(t._id) } : {}) } } : t),
    talents: talents.map(t => was.has(t._id) ? { ...t, system: { ...t.system, treeId: was.get(t._id) } } : t)
  };
}

/** Pure projection of the Phase 3F normalization over the two packs (used by the dry-run and by the runtime-contract tests). */
export function projectNormalization({ trees, talents }, census) {
  const nameOf = new Map(census.driftTrees.map(d => [d.treeId, d.canonicalName]));
  const fix = new Map(census.staleTalentReferences.map(r => [r.talentId, r.authoritativeTreeId]));
  return {
    trees: trees.map(t => {
      if (!nameOf.has(t._id)) return t;
      const d = census.driftTrees.find(x => x.treeId === t._id);
      return { ...t, name: nameOf.get(t._id), system: t.system.talent_tree === d.currentName ? { ...t.system, talent_tree: nameOf.get(t._id) } : t.system };
    }),
    talents: talents.map(t => fix.has(t._id) ? { ...t, system: { ...t.system, treeId: fix.get(t._id) } } : t)
  };
}

export function build() {
  const trees = nd('packs/talent_trees.db'), talents = nd('packs/talents.db');
  const treeById = new Map(trees.map(t => [t._id, t]));
  const canonByIdentity = new Map(JSON.parse(read('data/canonical/talents.json')).records.map(r => [r.canonicalIdentity, r]));
  const idOf = new Map(), treeOf = new Map();
  for (const { manifest } of loadCommittedManifests()) for (const r of manifest.records) { const i = r.identityResolution; idOf.set(r.canonicalIdentity, i.productionRecordId || i.createRecordId); treeOf.set(r.canonicalIdentity, r.targetTree?.treeId); }
  const additions = JSON.parse(read('data/audits/talent-phase-3e-canonical-additions.json')).additions;
  const prodById = new Map(talents.map(t => [t._id, t]));
  const rows = [];
  for (const [identity, rec] of canonByIdentity) rows.push({ identity, treeKey: rec.canonicalTreeKey, name: rec.name, pid: idOf.get(identity), treeId: treeOf.get(identity) });
  for (const a of additions) rows.push({ identity: a.canonicalIdentity, treeKey: a.canonicalTreeKey, name: a.name, pid: a.production.id, treeId: a.production.registryTreeIds[0] });

  const before = assignRuntimeIds(trees);
  const stale = [], driftTrees = new Map();
  for (const r of rows) {
    const p = prodById.get(r.pid), tree = treeById.get(r.treeId), treeName = r.treeKey.split('|')[1];
    if (!p || !tree) continue;
    if (p.system.treeId !== tree._id) stale.push({
      talentId: p._id, talent: p.name, identity: r.identity, currentTreeId: p.system.treeId, authoritativeTreeId: tree._id, canonicalTreeKey: r.treeKey,
      currentTreeName: tree.name, canonicalTreeName: treeName, runtimeTreeId: before.get(tree._id), slugMatchesTree: slugOf(tree.name) === String(p.system.treeId).replace(/_/g, '-') || slugOf(treeName) === String(p.system.treeId).replace(/_/g, '-'),
      inTreeMembership: tree.system.talentIds.includes(p._id)
    });
    if (tree.name !== treeName) { const d = driftTrees.get(tree._id) ?? { treeId: tree._id, currentName: tree.name, canonicalName: treeName, canonicalTreeKey: r.treeKey, talentInstances: 0 }; d.talentInstances++; driftTrees.set(tree._id, d); }
  }
  // what the runtime ids become after the display-name normalization (and whether anything collides)
  const after = assignRuntimeIds(trees.map(t => driftTrees.has(t._id) ? { ...t, name: driftTrees.get(t._id).canonicalName } : t));
  const driftList = [...driftTrees.values()].map(d => {
    const t = treeById.get(d.treeId);
    return { ...d, runtimeIdBefore: before.get(d.treeId), runtimeIdAfter: after.get(d.treeId), runtimeIdChanges: before.get(d.treeId) !== after.get(d.treeId), registrySlugBefore: slugOf(d.currentName), registrySlugAfter: slugOf(d.canonicalName), memberCount: t.system.talentIds.length, treeSourceId: t._id };
  }).sort((a, b) => a.currentName.localeCompare(b.currentName));
  const collisions = [...after.values()].filter((v, i, a) => a.indexOf(v) !== i);
  const unchangedIds = trees.filter(t => !driftTrees.has(t._id)).every(t => before.get(t._id) === after.get(t._id));
  const families = Object.entries(stale.reduce((o, s) => ((o[s.currentTreeId] ??= []).push(s.talent), o), {})).map(([value, names]) => ({ value, talents: names.length, tree: stale.find(s => s.currentTreeId === value).currentTreeName })).sort((a, b) => a.value.localeCompare(b.value));

  // consumer audit: every non-audit file mentioning an affected tree (any old/new spelling, slug, runtime id, or _id)
  const forms = new Set();
  for (const d of driftList) for (const v of [d.currentName, d.canonicalName, d.currentName.toLowerCase(), d.canonicalName.toLowerCase(), d.runtimeIdBefore, d.runtimeIdAfter, d.registrySlugBefore, d.registrySlugAfter, d.treeId]) forms.add(v);
  const hits = new Map();
  for (const f of forms) {
    let r = ''; try { r = execSync(`grep -rIl --exclude-dir=node_modules --exclude-dir=.git -F -- ${JSON.stringify(f)} . 2>/dev/null || true`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch { /* none */ }
    for (const file of r.split('\n').filter(Boolean).map(x => x.replace(/^\.\//, ''))) if (!EXCLUDE.test(file) && !SELF.has(file) && !/^(packs\/(talents|talent_trees|talents-homebrew|talent-trees-homebrew)\.db)$/.test(file) && !/^tests\//.test(file)) hits.set(file, (hits.get(file) ?? new Set()).add(f));
  }
  let rd = ''; try { rd = execSync(`grep -rlE "system\\??\\.treeId|sys\\.treeId" scripts tools --include=*.js --include=*.mjs 2>/dev/null || true`, { cwd: ROOT, encoding: 'utf8' }); } catch { /* none */ }
  const readerFiles = rd.split('\n').filter(Boolean).filter(f => !/^tools\/(census-talent-tree-identity|apply-talent-phase-3e[45]|apply-talent-phase-3f|reconcile-talent-publication-corpus|apply-talent-phase-3d)\./.test(f)).sort();
  const treeIdReaders = readerFiles.map(file => ({ file, kind: TREE_ID_READERS[file] ?? 'UNCLASSIFIED' }));
  const consumers = [...hits.keys()].sort().map(file => ({ file, ...(CONSUMERS[file] ?? { kind: 'UNCLASSIFIED' }) }));
  return {
    schemaVersion: 1, phase: '3F-1', status: 'CENSUS', productionMutationPerformed: false, mergedMainBaseline: 'dfbddb9cfeadfafd0e965f9732d47875457e097e',
    counts: { staleTalentTreeIds: stale.length, staleSlugFamilies: families.length, driftTalentInstances: [...driftTrees.values()].reduce((n, d) => n + d.talentInstances, 0), driftTrees: driftList.length, runtimeIdChangingTrees: driftList.filter(d => d.runtimeIdChanges).length, caseOnlyTrees: driftList.filter(d => !d.runtimeIdChanges).length, canonicalTrees: trees.length, unclassifiedConsumers: consumers.filter(c => c.kind === 'UNCLASSIFIED').length, treeIdReaders: treeIdReaders.length, unclassifiedTreeIdReaders: treeIdReaders.filter(r => r.kind === 'UNCLASSIFIED').length },
    invariants: { allStaleAreMembers: stale.every(s => s.inTreeMembership), allStaleSlugsResolveToTheirTree: stale.every(s => s.slugMatchesTree), runtimeIdCollisionsAfterRename: collisions, allOtherRuntimeIdsUnchanged: unchangedIds },
    staleSlugFamilies: families, driftTrees: driftList, staleTalentReferences: stale, consumers, treeIdReaders
  };
}

function renderMd(c) {
  return ['# Phase 3F-1 — Talent-tree identity census', '', 'Read-only. Generator: `node tools/census-talent-tree-identity.mjs` · data: `data/audits/talent-phase-3f-tree-identity-census.json`. Baseline: merged `main` `dfbddb9cf`.', '',
    `**${c.counts.staleTalentTreeIds} talents** carry a name-derived slug in \`system.treeId\` instead of the persistent tree \`_id\` (${c.counts.staleSlugFamilies} slug families); **${c.counts.driftTrees} tree documents** (${c.counts.driftTalentInstances} talent instances) have a display name that differs from the canonical name. Membership is correct for all ${c.counts.staleTalentTreeIds} stale talents (${c.invariants.allStaleAreMembers}); every stale slug resolves to its own tree (${c.invariants.allStaleSlugsResolveToTheirTree}).`, '',
    '## Stale `system.treeId` families', '', '| Value | Talents | Tree |', '|---|---|---|', ...c.staleSlugFamilies.map(f => `| \`${f.value}\` | ${f.talents} | ${f.tree} |`), '',
    '## Display-name drift (each tree once)', '', '| Tree `_id` | Current | Canonical | Runtime id before → after | Changes runtime id? | Members |', '|---|---|---|---|---|---|',
    ...c.driftTrees.map(d => `| \`${d.treeId}\` | ${d.currentName} | ${d.canonicalName} | \`${d.runtimeIdBefore}\` → \`${d.runtimeIdAfter}\` | ${d.runtimeIdChanges ? '**YES**' : 'no (case only)'} | ${d.memberCount} |`), '',
    `Runtime-id collisions after the rename: ${c.invariants.runtimeIdCollisionsAfterRename.length ? c.invariants.runtimeIdCollisionsAfterRename.join(', ') : 'none'}; every other tree keeps its runtime id: ${c.invariants.allOtherRuntimeIdsUnchanged}.`, '',
    '## Readers of a talent\'s `system.treeId`', '', `${c.counts.treeIdReaders} scripts/tools read it. STRICT_SOURCE_ID readers expect the persistent tree _id; RUNTIME_ID_ONLY (talent-normalizer) accepts only a TalentTreeDB runtime id and is hardened in 3F-2; TOLERANT readers compare it as one of several normalized candidate tokens.`, '', '| File | Kind |', '|---|---|', ...c.treeIdReaders.map(r => `| \`${r.file}\` | ${r.kind} |`), '',
    '## Consumers of the affected trees', '', '| File | Kind | Keyed on | Effect of the normalization | Action |', '|---|---|---|---|---|',
    ...c.consumers.map(x => `| \`${x.file}\` | ${x.kind} | ${x.keyedOn ?? ''} | ${x.effect ?? ''} | ${x.action ?? '**UNCLASSIFIED**'} |`), ''].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const c = build(), json = JSON.stringify(c, null, 2) + '\n', md = renderMd(c);
  if (argv.includes('--check')) {
    const bad = [];
    // After Phase 3F the census is a frozen record of the pre-normalization state: the live packs must be clean, and the committed census must
    // still describe exactly the 71/12 scope that the certified 3F report applied.
    const reportPath = path.join(ROOT, 'data/audits/talent-phase-3f-dry-run-report.json');
    if (fs.existsSync(reportPath) && fs.existsSync(path.join(ROOT, OUT_JSON))) {
      const rep = JSON.parse(read('data/audits/talent-phase-3f-dry-run-report.json')), committed = JSON.parse(read(OUT_JSON));
      const crypto = gitSha; const g3 = path.join(ROOT, 'data/audits/talent-phase-3g-dry-run-report.json'); // 3G (later certified state) rewrites prerequisite data on other talents only
      const applied = (crypto(read('packs/talents.db')) === rep.postState.talents || ['talent-phase-3g-dry-run-report.json', 'talent-phase-11-2a-dry-run-report.json', 'talent-phase-11-2b-dry-run-report.json', 'talent-phase-11-2c-dry-run-report.json', 'talent-phase-12-1-dry-run-report.json', 'talent-phase-12-2-dry-run-report.json', 'talent-phase-12-final-dry-run-report.json'].some(f => fs.existsSync(path.join(ROOT, 'data/audits', f)) && crypto(read('packs/talents.db')) === JSON.parse(read('data/audits/' + f)).postState.talents)) && crypto(read('packs/talent_trees.db')) === rep.postState.trees;
      if (applied) {
        if (c.counts.staleTalentTreeIds !== 0 || c.counts.driftTrees !== 0) bad.push(`post-3F packs still show ${c.counts.staleTalentTreeIds} stale ids / ${c.counts.driftTrees} drift trees`);
        if (committed.counts.staleTalentTreeIds !== 71 || committed.counts.driftTrees !== 12 || committed.staleTalentReferences.length !== 71) bad.push('the frozen census no longer describes the certified 71/12 scope');
        if (bad.length) { console.error('[tree-identity-census] FAIL: ' + bad.join(' | ')); return 1; }
        console.log('[tree-identity-census] PASS (post-3F): packs are clean; the committed census is the frozen pre-normalization record'); return 0;
      }
    }
    if (c.counts.unclassifiedTreeIdReaders) bad.push('unclassified system.treeId readers: ' + c.treeIdReaders.filter(x => x.kind === 'UNCLASSIFIED').map(x => x.file).join(', '));
    if (c.counts.unclassifiedConsumers) bad.push('unclassified consumers: ' + c.consumers.filter(x => x.kind === 'UNCLASSIFIED').map(x => x.file).join(', '));
    if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json || !fs.existsSync(path.join(ROOT, OUT_MD)) || read(OUT_MD) !== md) bad.push('committed census is stale');
    if (bad.length) { console.error('[tree-identity-census] FAIL: ' + bad.join(' | ')); return 1; }
    console.log(`[tree-identity-census] PASS: ${c.counts.staleTalentTreeIds} stale ids, ${c.counts.driftTrees} drift trees, every consumer classified`); return 0;
  }
  { const rp = path.join(ROOT, 'data/audits/talent-phase-3f-dry-run-report.json'); if (fs.existsSync(rp) && ['talent-phase-3f-dry-run-report.json', 'talent-phase-3g-dry-run-report.json', 'talent-phase-11-2a-dry-run-report.json', 'talent-phase-11-2b-dry-run-report.json', 'talent-phase-11-2c-dry-run-report.json', 'talent-phase-12-1-dry-run-report.json', 'talent-phase-12-2-dry-run-report.json', 'talent-phase-12-final-dry-run-report.json'].some(f => fs.existsSync(path.join(ROOT, 'data/audits', f)) && gitSha(read('packs/talents.db')) === JSON.parse(read('data/audits/' + f)).postState.talents)) { console.error('[tree-identity-census] REFUSED: the packs are the post-3F state; the census is the frozen pre-normalization record and must not be regenerated'); return 1; } }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md);
  console.log(JSON.stringify({ counts: c.counts, invariants: c.invariants }, null, 1)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
