#!/usr/bin/env node
/**
 * Phase 3D-3 — DRY-RUN applicator for the 92 production talent records Phase 3C protected.
 *
 * Consumes data/audits/talent-phase-3d-dispositions.json (final adjudication) and simulates, in memory only:
 *   19 MERGE_DUPLICATE · 16 REMOVE_CONTAMINATION · 50 MOVE_HOMEBREW_PACK · 6 KEEP · 1 CORRECT_IDENTITY
 * including embedded-actor repointing, tree / class / registry changes and final count reconciliation.
 *
 * It never writes a pack. Modes:
 *   (default)   print the simulated summary
 *   --status    detect the pack state (PRE_3D / POST_3D / UNKNOWN)
 *   --report    write data/audits/talent-phase-3d-dry-run-report.json (the only file this tool writes)
 *   --check     fail unless the committed report equals a fresh projection
 *   --apply     refused: Phase 3D-3 is dry-run only
 *
 * Reuses the Phase 3C machinery (state detection, tree edit helpers, pack serialization, registry generator)
 * instead of introducing a second migration system.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT, detectPackState as detectPhase3cState, detachFromTree, attachToTree, serializePack, gitBlobSha, fingerprint
} from './apply-talent-phase-3c.mjs';
import { buildTalentTreeRegistry, serializeRegistry, loadPreviousRegistry, REGISTRY_PATHS, registrySlug } from './build-talent-tree-registry.mjs';
import { checkDispositions } from './check-talent-phase-3d-dispositions.mjs';

export const MANIFEST_PATH = 'data/audits/talent-phase-3d-dispositions.json';
export const CENSUS_PATH = 'data/audits/talent-phase-3d-production-extras-census.json';
export const REPORT_PATH = 'data/audits/talent-phase-3d-dry-run-report.json';
export const PACKS = { talents: 'packs/talents.db', trees: 'packs/talent_trees.db', classes: 'packs/classes.db' };
export const ACTOR_PACKS = { heroic: 'packs/heroic.db', nonheroic: 'packs/nonheroic.db', npc: 'packs/npc.db' };
export const DERIVED_FILES = ['data/generated/talents.fixed.json', 'data/fixes/talents.fixed.json'];
export const HOMEBREW = { talentsPack: 'talents-homebrew', treesPack: 'talent-trees-homebrew', talentsFile: 'packs/talents-homebrew.db', treesFile: 'packs/talent-trees-homebrew.db' };
const SYSTEM_ID = 'foundryvtt-swse';

const ERR = '[talent-phase-3d] ';
export const invariant = (ok, message) => { if (!ok) throw new Error(ERR + message); };
const clone = v => structuredClone(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const readText = (rel, root = ROOT) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel, root = ROOT) => JSON.parse(readText(rel, root));
const parseNdjson = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);
const tally = (list, fn) => list.reduce((o, x) => { const k = fn(x); o[k] = (o[k] || 0) + 1; return o; }, {});
const sourceIdFor = (pack, id) => `Compendium.${SYSTEM_ID}.${pack}.${id}`;
const parseSourceId = s => { const m = /^Compendium\.foundryvtt-swse\.([^.]+)\.([0-9a-zA-Z]+)$/.exec(String(s || '')); return m ? { pack: m[1], id: m[2] } : null; };
const REMOVING = new Set(['MERGE_DUPLICATE', 'REMOVE_CONTAMINATION', 'MOVE_HOMEBREW_PACK']);

/* ------------------------------------------------------------------------------------------------
 * Inputs
 * ---------------------------------------------------------------------------------------------- */
export function loadInputs(root = ROOT) {
  const texts = {
    ...Object.fromEntries(Object.entries(PACKS).map(([k, rel]) => [k, readText(rel, root)])),
    ...Object.fromEntries(Object.entries(ACTOR_PACKS).map(([k, rel]) => [k, readText(rel, root)]))
  };
  return {
    manifest: readJson(MANIFEST_PATH, root), census: readJson(CENSUS_PATH, root), texts,
    talents: parseNdjson(texts.talents), trees: parseNdjson(texts.trees), classes: parseNdjson(texts.classes),
    actors: Object.fromEntries(Object.keys(ACTOR_PACKS).map(k => [k, parseNdjson(texts[k])])),
    derived: Object.fromEntries(DERIVED_FILES.map(rel => [rel, readJson(rel, root)])),
    previousRegistry: loadPreviousRegistry(root),
    otherPackTexts: otherPackTexts(root)
  };
}
/** Every other pack, scanned for residual references to an ID that would leave the canonical talent pack. */
function otherPackTexts(root) {
  const skip = new Set([...Object.values(PACKS), ...Object.values(ACTOR_PACKS)].map(p => path.basename(p)));
  const dir = path.join(root, 'packs');
  return Object.fromEntries(fs.readdirSync(dir).filter(f => f.endsWith('.db') && !skip.has(f) && !f.includes('homebrew'))
    .map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
}

/** PRE_3D: every removing record is in the canonical pack. POST_3D: none is. Anything else refuses. */
export function detect3DState(manifest, talents) {
  const ids = new Set(talents.map(t => t._id));
  const leaving = manifest.records.filter(r => REMOVING.has(r.finalDisposition));
  const present = leaving.filter(r => ids.has(r.productionId)).length;
  return present === leaving.length ? 'PRE_3D' : present === 0 ? 'POST_3D' : 'PARTIAL_3D';
}

/* ------------------------------------------------------------------------------------------------
 * Projection. Pure: never touches disk.
 * ---------------------------------------------------------------------------------------------- */
export function projectPhase3D(input) {
  const { manifest, census } = input;
  const talents = clone(input.talents), trees = clone(input.trees), classes = clone(input.classes);
  const actors = clone(input.actors), derived = clone(input.derived);

  const state = detect3DState(manifest, input.talents);
  invariant(state === 'PRE_3D', state === 'POST_3D' ? 'Phase 3D is already applied; refusing to project again' : 'Phase 3D is only partly applied (PARTIAL_3D); refusing to project');
  const problems = checkDispositions({ manifest, census, talents: input.talents, actors: input.actors });
  invariant(!problems.length, 'disposition manifest is invalid:\n  ' + problems.join('\n  '));

  const byId = new Map(talents.map(t => [t._id, t]));
  const nameOf = id => byId.get(id)?.name;
  const recs = manifest.records;
  const leaving = recs.filter(r => REMOVING.has(r.finalDisposition));
  const leavingIds = new Set(leaving.map(r => r.productionId));
  const moveIds = new Set(recs.filter(r => r.finalDisposition === 'MOVE_HOMEBREW_PACK').map(r => r.productionId));
  const operationCounts = { ...tally(recs, r => r.finalDisposition), actorItemsRepointed: 0, treesMovedToHomebrew: 0, treesLosingMembers: 0, classAccessEntriesRemoved: 0, derivedEntriesDropped: 0 };

  /* 1. HARD PREREQUISITE: every embedded actor item that references a leaving record is repointed first. */
  const plan = new Map();
  for (const r of leaving) {
    const toPack = r.finalDisposition === 'MOVE_HOMEBREW_PACK' ? HOMEBREW.talentsPack : 'talents';
    for (const ref of r.referencesToRepoint?.actorPackEmbeddedItems ?? []) {
      const toId = r.finalDisposition === 'MERGE_DUPLICATE' ? r.survivorId : ref.replacementId;
      invariant(toId, `${r.name}: actor reference ${ref.actor} has no replacement`);
      plan.set(`${ref.pack}|${ref.actorId}|${ref.itemIndex}`, { from: r.productionId, toId, toPack, actor: ref.actor, disposition: r.finalDisposition });
    }
  }
  const repointed = [];
  for (const [pack, list] of Object.entries(actors)) for (const actor of list) (actor.items ?? []).forEach((item, index) => {
    const parsed = parseSourceId(item.flags?.core?.sourceId);
    if (!parsed || parsed.pack !== 'talents' || !leavingIds.has(parsed.id)) return;
    const step = plan.get(`${pack}|${actor._id}|${index}`);
    invariant(step && step.from === parsed.id, `BLOCKED: embedded item ${actor.name}/${item.name} (${pack}) references ${parsed.id}, which is leaving the canonical pack, but no repoint is planned`);
    invariant(step.toId !== parsed.id || step.toPack !== 'talents', `${actor.name}: repoint target equals source`);
    item.flags.core.sourceId = sourceIdFor(step.toPack, step.toId);
    repointed.push({ pack, actor: actor.name, actorId: actor._id, itemIndex: index, item: item.name, from: parsed.id, to: step.toId, toPack: step.toPack, disposition: step.disposition });
  });
  invariant(repointed.length === plan.size, `planned ${plan.size} actor repoints but performed ${repointed.length}`);
  operationCounts.actorItemsRepointed = repointed.length;

  /* 2. No live reference to a leaving ID may remain anywhere (actors, classes, every other pack). */
  const leavingPattern = new RegExp([...leavingIds].join('|'));
  const residual = [];
  for (const [pack, list] of Object.entries(actors)) for (const actor of list) {
    const text = JSON.stringify(actor);
    for (const hit of new Set(text.match(new RegExp(leavingPattern, 'g')) ?? [])) {
      // Only a homebrew-pack sourceId of a MOVEd record may still mention its ID.
      const okOnly = moveIds.has(hit) && (text.match(new RegExp(hit, 'g')) ?? []).length === (text.match(new RegExp(`${HOMEBREW.talentsPack}\\.${hit}`, 'g')) ?? []).length;
      if (!okOnly) residual.push(`${pack}:${actor.name}:${hit}`);
    }
  }
  for (const cls of classes) if (leavingPattern.test(JSON.stringify(cls))) residual.push(`classes:${cls.name}`);
  for (const [file, text] of Object.entries(input.otherPackTexts ?? {})) if (leavingPattern.test(text)) residual.push(`packs/${file}`);
  invariant(!residual.length, 'BLOCKED: unresolved live references to records leaving the canonical pack: ' + residual.slice(0, 10).join(', '));

  /* 3. CORRECT_IDENTITY: the talent stays canonical but changes tree. */
  for (const r of recs.filter(x => x.finalDisposition === 'CORRECT_IDENTITY')) {
    const { fromTreeId, toTreeId } = r.correctIdentity;
    const from = trees.find(t => t._id === fromTreeId), to = trees.find(t => t._id === toTreeId);
    invariant(from && to, `${r.name}: correct-identity trees missing`);
    invariant(from.system.talentIds.includes(r.productionId), `${r.name}: not a member of ${from.name}`);
    const t = byId.get(r.productionId);
    detachFromTree(from, t._id, [t.name], nameOf);
    attachToTree(to, t._id, null, t.name, nameOf);
    t.system.treeId = toTreeId;
  }

  /* 4. Trees: classify every tree that loses a member (by ID), then detach. */
  const treeFate = new Map();
  for (const tree of trees) {
    const members = tree.system.talentIds ?? [];
    const moved = members.filter(id => moveIds.has(id));
    const removed = members.filter(id => leavingIds.has(id) && !moveIds.has(id));
    if (!moved.length && !removed.length) continue;
    const staying = members.filter(id => !leavingIds.has(id));
    treeFate.set(tree._id, { tree, moved, removed, staying });
  }
  const homebrewTrees = [];
  for (const { tree, moved, removed, staying } of treeFate.values()) {
    if (staying.length === 0) {
      invariant(moved.length > 0, `BLOCKED: tree ${tree.name} (${tree._id}) would be emptied by removals with nothing moving; decide its fate explicitly`);
      const doc = clone(tree);
      doc.system.talentIds = [...moved];
      doc.system.talentNames = moved.map(nameOf);
      homebrewTrees.push(doc);
    } else {
      operationCounts.treesLosingMembers++;
      for (const id of [...moved, ...removed]) detachFromTree(tree, id, [nameOf(id)], nameOf);
    }
  }
  operationCounts.treesMovedToHomebrew = homebrewTrees.length;
  const movedTreeIds = new Set(homebrewTrees.map(t => t._id));
  const canonicalTrees = trees.filter(t => !movedTreeIds.has(t._id));

  /* 5. Classes: drop access to trees that left the canonical pack (aligned arrays, all reference forms). */
  const classAccessRemoved = [];
  const treeRefs = new Map(homebrewTrees.map(t => [t._id, [t._id, t.name, registrySlug(t.name), registrySlug(t.name).replace(/-/g, '_')]]));
  for (const cls of classes) {
    const s = cls.system ?? {}, arrays = ['talent_trees', 'talentTreeIds', 'talentTreeSourceIds', 'talentTreeUuids'].filter(k => Array.isArray(s[k]));
    const drop = new Set();
    for (const k of arrays) s[k].forEach((v, i) => { for (const [tid, forms] of treeRefs) if (forms.some(f => String(v).toLowerCase() === String(f).toLowerCase() || String(v).includes(tid))) drop.add(i); });
    if (!drop.size) continue;
    const lens = new Set(arrays.map(k => s[k].length));
    invariant(lens.size === 1, `BLOCKED: class ${cls.name} has misaligned tree-access arrays; cannot safely remove homebrew tree access`);
    for (const k of arrays) s[k] = s[k].filter((_, i) => !drop.has(i));
    classAccessRemoved.push({ class: cls.name, entries: drop.size });
    operationCounts.classAccessEntriesRemoved += drop.size;
  }

  /* 6. Talent packs. Moved records are copied unchanged, ids preserved. */
  const homebrewTalents = talents.filter(t => moveIds.has(t._id)).map(clone);
  const canonicalTalents = talents.filter(t => !leavingIds.has(t._id));

  /* 7. Derived data mirrors (no runtime/tool consumer found): entries for leaving ids are dropped. */
  const derivedDrops = {};
  for (const [rel, arr] of Object.entries(derived)) {
    const kept = arr.filter(e => !leavingIds.has(e._id));
    derivedDrops[rel] = arr.length - kept.length;
    operationCounts.derivedEntriesDropped += arr.length - kept.length;
    derived[rel] = kept;
  }

  /* 8. Runtime registry regenerated from the projected packs. */
  const registry = buildTalentTreeRegistry({ talents: canonicalTalents, trees: canonicalTrees, classes, previousRegistry: input.previousRegistry ?? [] });

  return {
    talents: canonicalTalents, trees: canonicalTrees, classes, actors, derived, registry,
    homebrew: { talents: homebrewTalents, trees: homebrewTrees },
    repointed, classAccessRemoved, derivedDrops, operationCounts,
    movedTreeIds: [...movedTreeIds], mixedTrees: [...treeFate.values()].filter(f => f.staying.length).map(f => ({ treeId: f.tree._id, tree: f.tree.name, membersLeaving: f.moved.length + f.removed.length, membersRemaining: f.staying.length }))
  };
}


/** Every actor document is byte-identical except the planned embedded items, whose only change is flags.core.sourceId. */
function onlySourceIdChanged(beforeActors, p) {
  const planned = new Set(p.repointed.map(r => `${r.pack}|${r.actorId}|${r.itemIndex}`));
  for (const [pack, list] of Object.entries(beforeActors)) {
    for (const a of list) {
      const n = p.actors[pack].find(x => x._id === a._id);
      const { items: bi = [], ...bRest } = a, { items: ni = [], ...nRest } = n;
      if (!same(bRest, nRest) || bi.length !== ni.length) return false;
      for (let i = 0; i < bi.length; i++) {
        if (!planned.has(`${pack}|${a._id}|${i}`)) { if (!same(bi[i], ni[i])) return false; continue; }
        const c = clone(ni[i]); c.flags.core.sourceId = bi[i].flags.core.sourceId;
        if (!same(c, bi[i])) return false;
      }
    }
  }
  return true;
}

/* ------------------------------------------------------------------------------------------------
 * Verification of a projection against the pre-state (used by the report and by the tests).
 * ---------------------------------------------------------------------------------------------- */
export function verifyProjection(input, p) {
  const results = [];
  const check = (id, ok, detail = '') => results.push({ id, ok: !!ok, detail });
  const { manifest } = input;
  const recs = manifest.records, by = d => recs.filter(r => r.finalDisposition === d);
  const leaving = recs.filter(r => REMOVING.has(r.finalDisposition)), leavingIds = new Set(leaving.map(r => r.productionId));
  const protectedIds = new Set(recs.map(r => r.productionId));
  const before = new Map(input.talents.map(t => [t._id, t])), after = new Map(p.talents.map(t => [t._id, t]));
  const hbAfter = new Map(p.homebrew.talents.map(t => [t._id, t]));

  const expectedCanonical = input.talents.length - leaving.length;
  check('canonical talent count = before - (merges + removals + moves)', p.talents.length === expectedCanonical, `${input.talents.length} - ${leaving.length} = ${expectedCanonical}, got ${p.talents.length}`);
  check('homebrew talent count = MOVE_HOMEBREW_PACK count', p.homebrew.talents.length === by('MOVE_HOMEBREW_PACK').length, String(p.homebrew.talents.length));
  check('total preserved talent records = before - merges - removals', p.talents.length + p.homebrew.talents.length === input.talents.length - by('MERGE_DUPLICATE').length - by('REMOVE_CONTAMINATION').length);
  check('tree count reconciles (canonical + homebrew = before)', p.trees.length + p.homebrew.trees.length === input.trees.length, `${p.trees.length}+${p.homebrew.trees.length}`);
  check('every talent outside the 92 is byte-identical', input.talents.filter(t => !protectedIds.has(t._id)).every(t => same(after.get(t._id), t)));
  check('KEEP records are present and unchanged', by('KEEP_CANONICAL_ADDITIONAL_PUBLICATION').every(r => same(after.get(r.productionId), before.get(r.productionId))));
  check('CORRECT_IDENTITY changes only system.treeId', by('CORRECT_IDENTITY').every(r => { const a = clone(after.get(r.productionId)), b = clone(before.get(r.productionId)); a.system.treeId = b.system.treeId; return same(a, b); }));
  check('merged / removed / moved records are gone from the canonical pack', leaving.every(r => !after.has(r.productionId)));
  check('merged / removed records exist nowhere; moved records exist only in the homebrew pack', leaving.every(r => r.finalDisposition === 'MOVE_HOMEBREW_PACK' ? hbAfter.has(r.productionId) : !hbAfter.has(r.productionId)));
  check('moved records are identical to their originals (ids + all automation metadata preserved)', by('MOVE_HOMEBREW_PACK').every(r => same(hbAfter.get(r.productionId), before.get(r.productionId))));
  check('merge survivors exist and are unchanged (none of the 1,180 canonical identities touched)', by('MERGE_DUPLICATE').every(r => after.has(r.survivorId) && same(after.get(r.survivorId), before.get(r.survivorId))));

  const claims = (trees, id) => trees.filter(t => (t.system.talentIds ?? []).includes(id)).length;
  check('no canonical tree member is missing from the canonical pack (no orphan memberships)', p.trees.every(t => (t.system.talentIds ?? []).every(id => after.has(id))));
  check('every homebrew tree member exists in the homebrew pack', p.homebrew.trees.every(t => t.system.talentIds.every(id => hbAfter.has(id))));
  check('a talent is never claimed by more canonical trees than before', p.talents.every(t => claims(p.trees, t._id) <= claims(input.trees, t._id) || t._id === recs.find(r => r.finalDisposition === 'CORRECT_IDENTITY').productionId));
  check('Ranged Disarm is claimed by exactly one canonical tree (Gunslinger)', (() => { const r = by('CORRECT_IDENTITY')[0]; const owners = p.trees.filter(t => t.system.talentIds.includes(r.productionId)); return owners.length === 1 && owners[0]._id === r.correctIdentity.toTreeId; })());
  check('talentNames stay consistent with talentIds in every changed tree', p.trees.concat(p.homebrew.trees).every(t => { const names = new Set(t.system.talentIds.map(id => (after.get(id) ?? hbAfter.get(id)).name)); return (t.system.talentNames ?? []).every(n => names.has(n)); }));
  const touched = new Set([...p.movedTreeIds, ...p.mixedTrees.map(m => m.treeId), ...by('CORRECT_IDENTITY').flatMap(r => [r.correctIdentity.fromTreeId, r.correctIdentity.toTreeId])]);
  check('trees outside the change set are byte-identical', input.trees.filter(t => !touched.has(t._id)).every(t => same(p.trees.find(x => x._id === t._id), t)));
  check('no canonical class references a tree that moved to the homebrew pack', p.classes.every(c => !JSON.stringify(c.system ?? {}).match(new RegExp(p.movedTreeIds.join('|') || '$^'))));
  check('classes are unchanged unless homebrew access had to be removed', p.classAccessRemoved.length > 0 || same(p.classes, input.classes), `${p.classAccessRemoved.length} class(es) changed`);

  const plannedRefs = leaving.reduce((n, r) => n + (r.referencesToRepoint?.actorPackEmbeddedItems?.length ?? 0), 0);
  check('every planned embedded-actor repoint was performed (hard prerequisite)', p.repointed.length === plannedRefs, `${p.repointed.length}/${plannedRefs}`);
  check('the 34 Notorious/Teräs Käsi actor repoints are included', p.repointed.filter(x => x.disposition === 'REMOVE_CONTAMINATION' || x.from === '222327492c484b4a').length >= 34);
  check('no embedded actor item still points at a record that left the canonical pack', Object.values(p.actors).flat().every(a => (a.items ?? []).every(i => { const s = parseSourceId(i.flags?.core?.sourceId); return !(s && s.pack === 'talents' && leavingIds.has(s.id)); })));
  check('repointed items change only flags.core.sourceId', onlySourceIdChanged(input.actors, p));
  check('every actor target of a repoint exists (canonical pack or homebrew pack)', p.repointed.every(r => r.toPack === 'talents' ? after.has(r.to) : hbAfter.has(r.to)));

  const reg = p.registry, treeIds = new Set(p.trees.map(t => t._id));
  check('registry has no entry for a tree that left the canonical pack', reg.every(e => !e.sourceId || treeIds.has(e.sourceId)));
  check('registry has an entry for every projected canonical tree', [...treeIds].every(id => reg.some(e => e.sourceId === id)));
  check('registry talentIds resolve in the canonical pack', reg.every(e => (e.talentIds ?? []).every(id => after.has(id) || !e.sourceId)));
  check('derived talents.fixed.json mirrors no longer carry leaving ids', Object.values(p.derived).every(a => a.every(e => !leavingIds.has(e._id))));

  let second = 'refused';
  try { projectPhase3D({ ...input, talents: p.talents, trees: p.trees, classes: p.classes, actors: p.actors, derived: p.derived }); second = 'applied-again'; } catch (e) { second = /already applied/.test(e.message) ? 'refused' : 'other:' + e.message.slice(0, 80); }
  check('idempotence: a second projection refuses cleanly as already applied', second === 'refused', second);
  return results;
}

/* ------------------------------------------------------------------------------------------------
 * Report
 * ---------------------------------------------------------------------------------------------- */
const homebrewText = records => records.map(r => JSON.stringify(r)).join('\n') + '\n';
export function buildReport(input, p, verification, root = ROOT) {
  const out = {
    talents: serializePack(input.texts.talents, p.talents), trees: serializePack(input.texts.trees, p.trees), classes: serializePack(input.texts.classes, p.classes),
    ...Object.fromEntries(Object.keys(ACTOR_PACKS).map(k => [k, serializePack(input.texts[k], p.actors[k])])),
    homebrewTalents: homebrewText(p.homebrew.talents), homebrewTrees: homebrewText(p.homebrew.trees)
  };
  const preRegistry = REGISTRY_PATHS.map(rel => fs.readFileSync(path.join(root, rel), 'utf8'));
  const registryText = serializeRegistry(p.registry);
  const recs = input.manifest.records;
  const gone = tally(recs.filter(r => REMOVING.has(r.finalDisposition)), r => r.finalDisposition);
  return {
    schemaVersion: 1, phase: '3D-3', productionMutationPerformed: false, dryRun: true,
    status: verification.every(v => v.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    inputAuthority: { dispositions: MANIFEST_PATH, census: CENSUS_PATH, phase3cState: 'POST_STATE (required)', inheritedRecords: recs.length },
    preState: {
      talents: gitBlobSha(input.texts.talents), trees: gitBlobSha(input.texts.trees), classes: gitBlobSha(input.texts.classes),
      ...Object.fromEntries(Object.keys(ACTOR_PACKS).map(k => [k, gitBlobSha(input.texts[k])])),
      registry: gitBlobSha(preRegistry[0]), registryFixes: gitBlobSha(preRegistry[1])
    },
    postState: {
      talents: gitBlobSha(out.talents), trees: gitBlobSha(out.trees), classes: gitBlobSha(out.classes),
      ...Object.fromEntries(Object.keys(ACTOR_PACKS).map(k => [k, gitBlobSha(out[k])])),
      homebrewTalents: gitBlobSha(out.homebrewTalents), homebrewTrees: gitBlobSha(out.homebrewTrees),
      registry: gitBlobSha(registryText), registryFixes: gitBlobSha(registryText)
    },
    counts: {
      before: { talents: input.talents.length, trees: input.trees.length, classes: input.classes.length },
      after: { canonicalTalents: p.talents.length, homebrewTalents: p.homebrew.talents.length, totalPreservedTalents: p.talents.length + p.homebrew.talents.length, canonicalTrees: p.trees.length, homebrewTrees: p.homebrew.trees.length, classes: p.classes.length, registryEntries: p.registry.length },
      arithmetic: `${input.talents.length} - ${gone.MERGE_DUPLICATE ?? 0} merges - ${gone.REMOVE_CONTAMINATION ?? 0} removals - ${gone.MOVE_HOMEBREW_PACK ?? 0} moves = ${p.talents.length} canonical; + ${p.homebrew.talents.length} homebrew = ${p.talents.length + p.homebrew.talents.length} preserved`
    },
    dispositions: tally(recs, r => r.finalDisposition),
    operations: p.operationCounts,
    actorRepoints: { total: p.repointed.length, byDisposition: tally(p.repointed, r => r.disposition), byTargetPack: tally(p.repointed, r => r.toPack), items: p.repointed },
    trees: { movedToHomebrew: p.homebrew.trees.map(t => ({ treeId: t._id, name: t.name, members: t.system.talentIds.length })), keepCanonicalLoseMembers: p.mixedTrees },
    classAccess: { changes: p.classAccessRemoved, note: p.classAccessRemoved.length ? undefined : 'no canonical class references any tree that moves to the homebrew pack' },
    derivedData: { entriesDropped: p.derivedDrops, note: 'data/*/talents.fixed.json are partial derived mirrors with no runtime or tool consumer found' },
    homebrewPack: {
      talentsPack: HOMEBREW.talentsPack, treesPack: HOMEBREW.treesPack, files: [HOMEBREW.talentsFile, HOMEBREW.treesFile], idsPreserved: true,
      systemJsonEntriesRequired: [{ name: HOMEBREW.talentsPack, label: 'SWSE Talents (Homebrew — noncanonical)', path: 'packs/talents-homebrew', type: 'Item' }, { name: HOMEBREW.treesPack, label: 'SWSE Talent Trees (Homebrew — noncanonical)', path: 'packs/talent-trees-homebrew', type: 'Item' }],
      note: 'Not loaded by any canonical talent engine; must never be presented as official SWSE content.'
    },
    followUps3D4: [
      'Add the two homebrew pack entries to system.json and write packs/talents-homebrew.db and packs/talent-trees-homebrew.db.',
      'Refresh the stale snapshot text (benefit/description) of the 34 repointed Notorious/Teräs Käsi embedded actor items from their new targets (sourceId is repointed here; text is not).',
      'Update tests that pin removed ids (talent-phase-3c-migration-flow, talent-tree-membership-review-extras, talent-membership-and-pack-completion) and retire the review-extra exemption in the membership audit.',
      'Retire the legacy entries in tools/fix-compendium-issues.js and tools/verify-compendium-fixes.js that key on removed ids.',
      'The Phase 3C POST_STATE CI/verify gates compare pack blob SHAs and will read UNKNOWN_STATE after 3D is applied; add a 3D post-state gate and let the 3C gate accept the certified 3D post-state.',
      'Add the six KEEP records (and the Ranged Disarm correction) to the canonical corpus through the Phase 2 → canonical → manifest chain (CANONICAL_CORPUS_ADDITION).'
    ],
    verification: { passed: verification.filter(v => v.ok).length, failed: verification.filter(v => !v.ok).length, results: verification }
  };
}

/* ------------------------------------------------------------------------------------------------
 * CLI
 * ---------------------------------------------------------------------------------------------- */
export function freshReport(root = ROOT) {
  const c3 = detectPhase3cState(root);
  invariant(c3.state === 'POST_STATE', `the Phase 3C certified post-state is required (found ${c3.state})`);
  const input = loadInputs(root);
  const p = projectPhase3D(input);
  return { input, p, report: buildReport(input, p, verifyProjection(input, p), root) };
}

export async function main(argv = process.argv.slice(2), root = ROOT) {
  const has = f => argv.includes(f);
  if (has('--apply') || has('--write')) { console.error(ERR + 'REFUSED: Phase 3D-3 is dry-run only; production application is Phase 3D-4.'); return 2; }
  if (has('--status')) {
    const input = loadInputs(root);
    console.log(`${ERR}phase 3C: ${detectPhase3cState(root).state}; phase 3D: ${detect3DState(input.manifest, input.talents)}`);
    return 0;
  }
  const { report } = freshReport(root);
  for (const v of report.verification.results) console.log(`${v.ok ? 'PASS' : 'FAIL'}  ${v.id}${v.ok || !v.detail ? '' : '  [' + v.detail + ']'}`);
  console.log(`\n${ERR}${report.status}: ${report.counts.arithmetic}`);
  console.log(`${ERR}actor repoints ${report.actorRepoints.total} · trees to homebrew ${report.trees.movedToHomebrew.length} · mixed trees ${report.trees.keepCanonicalLoseMembers.length} · registry entries ${report.counts.after.registryEntries}`);
  if (report.status !== 'DRY_RUN_CERTIFIED') return 1;
  const text = JSON.stringify(report, null, 2) + '\n';
  if (has('--report')) { fs.writeFileSync(path.join(root, REPORT_PATH), text); console.log(`${ERR}wrote ${REPORT_PATH} (no pack was written)`); }
  if (has('--check')) {
    const committed = fs.existsSync(path.join(root, REPORT_PATH)) ? readText(REPORT_PATH, root) : '';
    if (committed !== text) { console.error(ERR + 'STALE: committed dry-run report differs from a fresh projection (run --report)'); return 1; }
    console.log(ERR + 'committed dry-run report matches a fresh projection');
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => process.exit(code), e => { console.error(e.message); process.exit(1); });
}
