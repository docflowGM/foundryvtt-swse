#!/usr/bin/env node
/**
 * Phase 3D-3 — DRY-RUN applicator for the 92 production talent records Phase 3C protected.
 *
 * Consumes data/audits/talent-phase-3d-dispositions.json (final adjudication) and simulates, in memory only:
 *   19 MERGE_DUPLICATE · 16 REMOVE_CONTAMINATION · 50 MOVE_HOMEBREW_PACK · 6 KEEP · 1 CORRECT_IDENTITY
 * including embedded-actor repointing, tree / class / registry changes and final count reconciliation.
 *
 * The dry-run modes never write a pack. Modes:
 *   (default)   print the simulated summary
 *   --status    detect the pack state (PRE_3D / POST_3D / UNKNOWN)
 *   --report    write data/audits/talent-phase-3d-dry-run-report.json (the only file this tool writes)
 *   --check     fail unless the committed report equals a fresh projection
 *   --apply     Phase 3D-4: write the certified migration (uncommitted), refusing partial / drifted / unexpected states
 *   --verify [--exact]   check the applied state (writes nothing); --exact also compares every file to the certified blob
 *
 * Reuses the Phase 3C machinery (state detection, tree edit helpers, pack serialization, registry generator)
 * instead of introducing a second migration system.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
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
export const RUNTIME_DATA_FILES = ['data/class-archetypes.json'];
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
    runtimeFiles: Object.fromEntries(RUNTIME_DATA_FILES.map(rel => [rel, readText(rel, root)])),
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
 * Embedded-actor snapshot refresh. Only canonical snapshot + source-identity fields are copied from the surviving
 * record; the embedded item's own _id, sort, ownership, effects, tags, class and every unrelated flag are preserved.
 * ---------------------------------------------------------------------------------------------- */
export const SNAPSHOT_FIELDS = ['name', 'system.prerequisites', 'system.benefit', 'system.description', 'system.summary', 'system.source', 'system.page', 'system.treeId', 'system.talent_tree', 'system.tree', 'system.category', 'system.class', 'flags.swse.id', 'flags.core.sourceId'];
export function refreshSnapshot(item, survivor, survivorTree, targetPack = 'talents', classNameOf = id => id) {
  const sys = (item.system ??= {});
  const s = survivor.system ?? {};
  item.name = survivor.name;
  sys.prerequisites = s.prerequisites ?? '';
  sys.benefit = s.benefit ?? '';
  const desc = typeof s.description === 'object' && s.description !== null ? (s.description.value ?? '') : (s.description ?? '');
  if (typeof sys.description === 'object' && sys.description !== null) sys.description = { ...sys.description, value: desc };
  else sys.description = desc;
  for (const k of ['summary', 'source', 'page']) if (s[k] !== undefined && s[k] !== null && s[k] !== '') sys[k] = s[k];
  if (s.category) sys.category = s.category;
  if (s.class) sys.class = classNameOf(s.class); // embedded copies store the class NAME, compendium docs store its id
  if (survivorTree) {
    sys.treeId = survivorTree._id;
    if ('talent_tree' in sys) sys.talent_tree = survivorTree.name;
    if ('tree' in sys) sys.tree = survivorTree.name;
  }
  item.flags ??= {};
  const swseId = survivor.flags?.swse?.id;
  if (swseId) { item.flags.swse ??= {}; item.flags.swse.id = swseId; }
  else if (item.flags.swse && 'id' in item.flags.swse) delete item.flags.swse.id;
  item.flags.core ??= {};
  item.flags.core.sourceId = sourceIdFor(targetPack, survivor._id);
  return item;
}
const snapshotMatches = (item, survivor, survivorTree, classNameOf) => same(refreshSnapshot(clone(item), survivor, survivorTree, 'talents', classNameOf), item);


/**
 * Allow-listed canonical structured-prerequisite repoints (PHASE_3C_CANONICAL_RECORD_TOUCHED). Exactly one leaf per listed
 * entry: system.prerequisitesStructured.conditions[i].id, and only when it currently holds the expected `from` value.
 * Applied to the canonical record and to its derived mirror entry (same leaf), nothing else.
 */
export function applyCanonicalPrerequisiteRepoints(manifest, talents, derived = {}) {
  const touched = [];
  for (const r of manifest.canonicalPrerequisiteRepoints?.repoints ?? []) {
    const m = /^system\.prerequisitesStructured\.conditions\[(\d+)\]\.id$/.exec(r.path);
    invariant(m, `canonical prerequisite repoint path is not allow-listed: ${r.path}`);
    const leaf = doc => { const c = doc?.system?.prerequisitesStructured?.conditions?.[Number(m[1])]; return c && typeof c === 'object' ? c : null; };
    const rec = talents.find(t => t._id === r.recordId);
    invariant(rec, `canonical prerequisite repoint: ${r.recordName} (${r.recordId}) is missing`);
    invariant(leaf(rec)?.id === r.from, `canonical prerequisite repoint: ${r.recordName} ${r.path} holds ${JSON.stringify(leaf(rec)?.id)}, expected ${r.from}`);
    invariant(rec.system.prerequisites === r.preservePrerequisiteText, `canonical prerequisite repoint: ${r.recordName} prerequisite text must stay ${JSON.stringify(r.preservePrerequisiteText)}`);
    leaf(rec).id = r.to;
    let mirrors = 0;
    for (const arr of Object.values(derived)) { const d = arr.find(e => e._id === r.recordId); if (d && leaf(d)?.id === r.from) { leaf(d).id = r.to; mirrors++; } }
    touched.push({ recordId: r.recordId, name: rec.name, path: r.path, from: r.from, to: r.to, toIdentity: r.toIdentity, mirrorEntriesUpdated: mirrors, flag: 'PHASE_3C_CANONICAL_RECORD_TOUCHED' });
  }
  return touched;
}

/** Runtime identities (production ids and flags.swse.id values no surviving canonical record carries) of every record leaving the canonical pack. */
export function retiredIdentities(manifest, talentsBefore, canonicalAfter) {
  const beforeById = new Map(talentsBefore.map(t => [t._id, t]));
  const carriedAfter = new Set(canonicalAfter.map(t => t.flags?.swse?.id).filter(Boolean));
  const dead = new Set();
  for (const r of manifest.records.filter(x => REMOVING.has(x.finalDisposition))) {
    dead.add(r.productionId);
    const sid = beforeById.get(r.productionId)?.flags?.swse?.id;
    if (sid && !carriedAfter.has(sid)) dead.add(sid);
  }
  return [...dead].sort();
}
/** Structured-prerequisite identities (ids / uuids) held by canonical talents that equal a retired identity. */
export function danglingFromRetired(retired, canonicalAfter) {
  const dead = new Set(retired);
  const leaves = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object') for (const v of Object.values(o)) leaves(v, out); return out; };
  const hits = [];
  for (const t of canonicalAfter) for (const v of leaves(t.system?.prerequisitesStructured ?? {})) {
    const bare = v.replace(/^Compendium\.foundryvtt-swse\.talents\./, '');
    if (dead.has(v) || dead.has(bare)) hits.push(`${t.name} (${t._id}): ${v}`);
  }
  return hits;
}
const danglingStructuredPrerequisites = (manifest, talentsBefore, canonicalAfter) => danglingFromRetired(retiredIdentities(manifest, talentsBefore, canonicalAfter), canonicalAfter);

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
    const refreshed = step.toPack === 'talents';
    if (refreshed) {
      const survivor = input.talents.find(t => t._id === step.toId);
      invariant(survivor, `${actor.name}: repoint target ${step.toId} does not exist`);
      const tree = input.trees.find(t => (t.system.talentIds ?? []).includes(survivor._id));
      refreshSnapshot(item, survivor, tree, step.toPack, id => input.classes.find(c => c._id === id)?.name ?? id);
    } else item.flags.core.sourceId = sourceIdFor(step.toPack, step.toId);
    repointed.push({ pack, actor: actor.name, actorId: actor._id, embeddedItemId: item._id, itemIndex: index, item: item.name, from: parsed.id, to: step.toId, toPack: step.toPack, disposition: step.disposition, snapshotRefreshed: refreshed });
  });
  invariant(repointed.length === plan.size, `planned ${plan.size} actor repoints but performed ${repointed.length}`);
  operationCounts.actorItemsRepointed = repointed.length;

  /* 1b. Runtime data files that name a leaving record by id are repointed by plan (text-level, nothing else touched). */
  const runtimeFiles = clone(input.runtimeFiles ?? {});
  const runtimeRepoints = [];
  for (const rp of manifest.runtimeDataRepoints ?? []) {
    invariant(runtimeFiles[rp.file] !== undefined, `runtime data file ${rp.file} is not loaded`);
    invariant(leavingIds.has(rp.from) && byId.has(rp.to) && !leavingIds.has(rp.to), `runtime repoint ${rp.from} -> ${rp.to}: source must be leaving and target must be a surviving record`);
    const needle = `"${rp.from}"`, count = runtimeFiles[rp.file].split(needle).length - 1;
    invariant(count === rp.expectedOccurrences, `${rp.file}: expected ${rp.expectedOccurrences} occurrences of ${rp.from}, found ${count}`);
    runtimeFiles[rp.file] = runtimeFiles[rp.file].split(needle).join(`"${rp.to}"`);
    JSON.parse(runtimeFiles[rp.file]); // still valid JSON
    runtimeRepoints.push({ file: rp.file, from: rp.from, to: rp.to, occurrences: count });
  }
  operationCounts.runtimeDataReferencesRepointed = runtimeRepoints.reduce((n, r) => n + r.occurrences, 0);

  /* 2. No live reference to a leaving ID may remain anywhere (actors, classes, every other pack, runtime data). */
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
  for (const [file, text] of Object.entries(runtimeFiles)) if (leavingPattern.test(text)) residual.push(file);
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

  /* 3b. Allow-listed canonical structured-prerequisite repoints (owner-authorized PHASE_3C_CANONICAL_RECORD_TOUCHED). */
  const canonicalTouched = applyCanonicalPrerequisiteRepoints(manifest, talents, derived);
  operationCounts.canonicalPrerequisiteRepoints = canonicalTouched.length;

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
  const registry = buildTalentTreeRegistry({ talents: canonicalTalents, trees: canonicalTrees, classes, previousRegistry: rewriteLegacyRegistry(input.previousRegistry ?? [], recs, input.talents, canonicalTalents) });

  return {
    talents: canonicalTalents, trees: canonicalTrees, classes, actors, derived, registry,
    homebrew: { talents: homebrewTalents, trees: homebrewTrees },
    repointed, classAccessRemoved, derivedDrops, operationCounts,
    runtimeFiles, runtimeRepoints, canonicalTouched,
    movedTreeIds: [...movedTreeIds], mixedTrees: [...treeFate.values()].filter(f => f.staying.length).map(f => ({ treeId: f.tree._id, tree: f.tree.name, membersLeaving: f.moved.length + f.removed.length, membersRemaining: f.staying.length }))
  };
}


/** Every actor document is byte-identical except the planned embedded items, and those change only snapshot + source-identity fields. */
function onlySnapshotChanged(beforeActors, p) {
  const planned = new Set(p.repointed.map(r => `${r.pack}|${r.actorId}|${r.itemIndex}`));
  const allowed = new Set(SNAPSHOT_FIELDS);
  const flat = (o, pre = '', out = {}) => { if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flat(v, pre + k + '.', out); else out[pre.slice(0, -1)] = o; return out; };
  for (const [pack, list] of Object.entries(beforeActors)) {
    for (const a of list) {
      const n = p.actors[pack].find(x => x._id === a._id);
      const { items: bi = [], ...bRest } = a, { items: ni = [], ...nRest } = n;
      if (!same(bRest, nRest) || bi.length !== ni.length) return false;
      for (let i = 0; i < bi.length; i++) {
        if (!planned.has(`${pack}|${a._id}|${i}`)) { if (!same(bi[i], ni[i])) return false; continue; }
        if (bi[i]._id !== ni[i]._id) return false;
        const x = flat(bi[i]), y = flat(ni[i]);
        for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
          const field = [...allowed].some(f => k === f || k.startsWith(f + '.'));
          if (!field && !same(x[k], y[k])) return false;
        }
      }
    }
  }
  return true;
}


/**
 * Legacy registry aliases (entries without a sourceId) list talent NAMES. A name that belonged to a record leaving the
 * canonical pack is renamed to its merge survivor's name, or dropped when no canonical talent carries that name.
 * Name-level by necessity (legacy entries carry no ids); only the exact names of leaving records are touched.
 */
export function rewriteLegacyRegistry(previousRegistry, recs, talentsBefore, canonicalAfter) {
  const before = new Map(talentsBefore.map(t => [t._id, t])), canonNames = new Set(canonicalAfter.map(t => t.name));
  const rename = new Map(), drop = new Set();
  for (const r of recs.filter(x => REMOVING.has(x.finalDisposition))) {
    const name = before.get(r.productionId).name;
    if (canonNames.has(name)) continue; // the name is still carried by a canonical talent
    if (r.finalDisposition === 'MERGE_DUPLICATE') rename.set(name, before.get(r.survivorId).name); else drop.add(name);
  }
  return previousRegistry.map(e => {
    if (e.sourceId || !Array.isArray(e.talents)) return e;
    const names = [...new Set(e.talents.filter(n => !drop.has(n)).map(n => rename.get(n) ?? n))];
    return names.length === e.talents.length && names.every((n, i) => n === e.talents[i]) ? e : { ...e, talents: names, talentCount: names.length };
  });
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
  const touchedIds = new Set((manifest.canonicalPrerequisiteRepoints?.repoints ?? []).map(r => r.recordId));
  check('every talent outside the 92 and the allow-listed prerequisite repoints is byte-identical', input.talents.filter(t => !protectedIds.has(t._id) && !touchedIds.has(t._id)).every(t => same(after.get(t._id), t)));
  check('each allow-listed canonical record changed ONLY its listed prerequisitesStructured id leaf (text, tags, abilityMeta, everything else identical)', (manifest.canonicalPrerequisiteRepoints?.repoints ?? []).every(r => {
    const a = clone(after.get(r.recordId)), b = clone(before.get(r.recordId));
    for (const x of manifest.canonicalPrerequisiteRepoints.repoints.filter(q => q.recordId === r.recordId)) { const i = Number(/\[(\d+)\]/.exec(x.path)[1]); a.system.prerequisitesStructured.conditions[i].id = b.system.prerequisitesStructured.conditions[i].id; }
    return same(a, b) && after.get(r.recordId).system.prerequisites === r.preservePrerequisiteText;
  }));
  check('the four Notorious prerequisites keep their tree-specific identities (Bounty Hunter vs Infamy) and Weakening Strike names Dastardly Strike', (() => { const id = (n, i) => after.get(n).system.prerequisitesStructured.conditions[i].id; return id('11e8f858af268e8c', 0) === 'c67cbd59abd1cc53' && id('8298e12805291c78', 0) === 'c67cbd59abd1cc53' && id('9491f34aad83dfb1', 0) === '09744041cdcc9e22' && id('b0ecc747a76deb72', 1) === '09744041cdcc9e22' && id('9c1e0b0566cb45c2', 0) === '9e4345faaaa94dd8' && after.get('9c1e0b0566cb45c2').system.prerequisites === 'Dastardly Strike'; })());
  check('no canonical structured prerequisite identity points at a removed/merged/moved Phase 3D record', danglingStructuredPrerequisites(manifest, input.talents, p.talents).length === 0, danglingStructuredPrerequisites(manifest, input.talents, p.talents).slice(0, 4).join('; '));
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
  check('repointed items change only snapshot + source-identity fields (embedded _id, sort, effects, tags, local flags preserved)', onlySnapshotChanged(input.actors, p));
  check('every refreshed embedded snapshot equals its surviving canonical record', p.repointed.filter(r => r.snapshotRefreshed).every(r => { const item = p.actors[r.pack].find(a => a._id === r.actorId).items[r.itemIndex]; const survivor = after.get(r.to); const tree = p.trees.find(t => t.system.talentIds.includes(survivor._id)); return item._id === r.embeddedItemId && snapshotMatches(item, survivor, tree, id => input.classes.find(c => c._id === id)?.name ?? id); }));
  check('no contaminated Notorious text survives in any actor item', Object.values(p.actors).flat().every(a => (a.items ?? []).filter(i => i.name === 'Notorious').every(i => !/Reference Book|Master Manipulator|small favor from someone/i.test(JSON.stringify(i.system)))));
  check('every actor target of a repoint exists (canonical pack or homebrew pack)', p.repointed.every(r => r.toPack === 'talents' ? after.has(r.to) : hbAfter.has(r.to)));

  const reg = p.registry, treeIds = new Set(p.trees.map(t => t._id));
  check('registry has no entry for a tree that left the canonical pack', reg.every(e => !e.sourceId || treeIds.has(e.sourceId)));
  check('registry has an entry for every projected canonical tree', [...treeIds].every(id => reg.some(e => e.sourceId === id)));
  check('registry talentIds resolve in the canonical pack', reg.every(e => (e.talentIds ?? []).every(id => after.has(id) || !e.sourceId)));
  check('derived talents.fixed.json mirrors no longer carry leaving ids', Object.values(p.derived).every(a => a.every(e => !leavingIds.has(e._id))));
  check('runtime data files carry no leaving id after the planned repoints', Object.values(p.runtimeFiles).every(t => ![...leavingIds].some(id => t.includes(`"${id}"`))));
  check('every planned runtime repoint was performed and targets a surviving record', p.runtimeRepoints.length === (manifest.runtimeDataRepoints ?? []).length && p.runtimeRepoints.every(r => after.has(r.to)));
  const legacyNames = new Set(p.registry.filter(e => !e.sourceId).flatMap(e => e.talents ?? []));
  const canonNames = new Set(p.talents.map(t => t.name));
  check('legacy registry aliases name no talent that is missing from the canonical pack', [...legacyNames].every(n => canonNames.has(n) || !input.talents.some(t => t.name === n && leavingIds.has(t._id))));

  let second = 'refused';
  try { projectPhase3D({ ...input, talents: p.talents, trees: p.trees, classes: p.classes, actors: p.actors, derived: p.derived }); second = 'applied-again'; } catch (e) { second = /already applied/.test(e.message) ? 'refused' : 'other:' + e.message.slice(0, 80); }
  check('idempotence: a second projection refuses cleanly as already applied', second === 'refused', second);
  return results;
}

/* ------------------------------------------------------------------------------------------------
 * Rendered outputs (what --apply writes) and report
 * ---------------------------------------------------------------------------------------------- */
const SYSTEM_JSON = 'system.json';
const HOMEBREW_PACK_BLOCKS = {
  after_talent_trees: { name: HOMEBREW.treesPack, label: 'Talent Trees (Homebrew, Noncanonical)', path: 'packs/talent-trees-homebrew' },
  after_talents: { name: HOMEBREW.talentsPack, label: 'Talents (Homebrew, Noncanonical)', path: 'packs/talents-homebrew' }
};
const packBlock = b => `    {\n      "name": "${b.name}",\n      "label": "${b.label}",\n      "type": "Item",\n      "path": "${b.path}",\n      "system": "foundryvtt-swse",\n      "flags": { "swse": { "noncanonical": true, "homebrew": true } }\n    },\n`;
/** Textual insertion keeps every other byte of system.json; idempotent. */
export function withHomebrewPacks(text) {
  let out = text;
  for (const [after, block] of [['talent_trees', HOMEBREW_PACK_BLOCKS.after_talent_trees], ['talents', HOMEBREW_PACK_BLOCKS.after_talents]]) {
    if (out.includes(`"name": "${block.name}"`)) continue;
    const at = out.indexOf(`"name": "${after}",`);
    invariant(at >= 0, `system.json has no "${after}" pack entry`);
    const close = out.indexOf('\n    },\n', at);
    invariant(close >= 0, `cannot locate the end of the "${after}" pack entry`);
    const insertAt = close + '\n    },\n'.length;
    out = out.slice(0, insertAt) + packBlock(block) + out.slice(insertAt);
  }
  return out;
}

export function renderOutputs(input, p, root = ROOT) {
  const registryText = serializeRegistry(p.registry);
  const files = {
    [PACKS.talents]: serializePack(input.texts.talents, p.talents),
    [PACKS.trees]: serializePack(input.texts.trees, p.trees),
    ...Object.fromEntries(Object.entries(ACTOR_PACKS).map(([k, rel]) => [rel, serializePack(input.texts[k], p.actors[k])])),
    [HOMEBREW.talentsFile]: p.homebrew.talents.map(r => JSON.stringify(r)).join('\n') + '\n',
    [HOMEBREW.treesFile]: p.homebrew.trees.map(r => JSON.stringify(r)).join('\n') + '\n',
    [REGISTRY_PATHS[0]]: registryText, [REGISTRY_PATHS[1]]: registryText,
    ...Object.fromEntries(DERIVED_FILES.map(rel => [rel, JSON.stringify(p.derived[rel], null, 2) + '\n'])),
    ...p.runtimeFiles,
    [SYSTEM_JSON]: withHomebrewPacks(readText(SYSTEM_JSON, root))
  };
  return files;
}
const blobOf = (files, rel) => gitBlobSha(files[rel]);
const stateKeys = { talents: PACKS.talents, trees: PACKS.trees, heroic: ACTOR_PACKS.heroic, nonheroic: ACTOR_PACKS.nonheroic, npc: ACTOR_PACKS.npc, homebrewTalents: HOMEBREW.talentsFile, homebrewTrees: HOMEBREW.treesFile, registry: REGISTRY_PATHS[0], registryFixes: REGISTRY_PATHS[1], derivedGenerated: DERIVED_FILES[0], derivedFixes: DERIVED_FILES[1], archetypes: RUNTIME_DATA_FILES[0], systemJson: SYSTEM_JSON };

export function buildReport(input, p, verification, root = ROOT) {
  const out = renderOutputs(input, p, root);
  const recs = input.manifest.records;
  const gone = tally(recs.filter(r => REMOVING.has(r.finalDisposition)), r => r.finalDisposition);
  const pre = { classes: gitBlobSha(input.texts.classes) };
  for (const [k, rel] of Object.entries(stateKeys)) if (fs.existsSync(path.join(root, rel))) pre[k] = gitBlobSha(readText(rel, root));
  const post = { classes: gitBlobSha(input.texts.classes) };
  for (const [k, rel] of Object.entries(stateKeys)) post[k] = blobOf(out, rel);
  return {
    schemaVersion: 2, phase: '3D-3', productionMutationPerformed: false, dryRun: true,
    status: verification.every(v => v.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    inputAuthority: { dispositions: MANIFEST_PATH, census: CENSUS_PATH, phase3cState: 'POST_STATE (required)', inheritedRecords: recs.length },
    preState: pre, postState: post,
    counts: {
      before: { talents: input.talents.length, trees: input.trees.length, classes: input.classes.length },
      after: { canonicalTalents: p.talents.length, homebrewTalents: p.homebrew.talents.length, totalPreservedTalents: p.talents.length + p.homebrew.talents.length, canonicalTrees: p.trees.length, homebrewTrees: p.homebrew.trees.length, classes: p.classes.length, registryEntries: p.registry.length },
      arithmetic: `${input.talents.length} - ${gone.MERGE_DUPLICATE ?? 0} merges - ${gone.REMOVE_CONTAMINATION ?? 0} removals - ${gone.MOVE_HOMEBREW_PACK ?? 0} moves = ${p.talents.length} canonical; + ${p.homebrew.talents.length} homebrew = ${p.talents.length + p.homebrew.talents.length} preserved`
    },
    dispositions: tally(recs, r => r.finalDisposition),
    operations: p.operationCounts,
    actorRepoints: { total: p.repointed.length, snapshotRefreshed: p.repointed.filter(r => r.snapshotRefreshed).length, byDisposition: tally(p.repointed, r => r.disposition), byTargetPack: tally(p.repointed, r => r.toPack), snapshotFields: SNAPSHOT_FIELDS, items: p.repointed },
    trees: { movedToHomebrew: p.homebrew.trees.map(t => ({ treeId: t._id, name: t.name, members: t.system.talentIds.length })), keepCanonicalLoseMembers: p.mixedTrees },
    classAccess: { changes: p.classAccessRemoved, note: p.classAccessRemoved.length ? undefined : 'no canonical class references any tree that moves to the homebrew pack' },
    retiredIdentities: retiredIdentities(input.manifest, input.talents, p.talents),
    canonicalRecordsTouched: { flag: 'PHASE_3C_CANONICAL_RECORD_TOUCHED', count: p.canonicalTouched.length, records: p.canonicalTouched, authorization: 'owner-authorized; only the listed prerequisitesStructured id leaves', note: 'The CORRECT_IDENTITY record (Ranged Disarm) is one of the inherited 92 and is not counted here.' },
    runtimeData: { repointed: p.runtimeRepoints, note: 'found by the repository-wide residual-reference gate; the first dry run scanned packs only' },
    derivedData: { entriesDropped: p.derivedDrops, note: 'data/*/talents.fixed.json are partial derived mirrors with no runtime or tool consumer found' },
    homebrewPack: {
      talentsPack: HOMEBREW.talentsPack, treesPack: HOMEBREW.treesPack, files: [HOMEBREW.talentsFile, HOMEBREW.treesFile], idsPreserved: true,
      systemJsonEntries: [HOMEBREW_PACK_BLOCKS.after_talents, HOMEBREW_PACK_BLOCKS.after_talent_trees],
      note: 'Not loaded by any canonical talent engine; must never be presented as official SWSE content.'
    },
    followUps: [
      'Structured talent prerequisites are only evaluated when a talent has no prerequisite text; all five repointed records have text, so the leaves are identity data. The survivors c67cbd59abd1cc53 (Bounty Hunter Notorious) and 9e4345faaaa94dd8 (Dastardly Strike) carry no flags.swse.id, so the production _id is stored; giving them runtime ids (or a uuid leaf) would make id-path resolution effective and is a separate canonical-record decision.',
      'Add the six KEEP records and the Ranged Disarm correction to the canonical corpus through the Phase 2 → canonical → manifest chain (CANONICAL_CORPUS_ADDITION).'
    ],
    verification: { passed: verification.filter(v => v.ok).length, failed: verification.filter(v => !v.ok).length, results: verification }
  };
}

/* ------------------------------------------------------------------------------------------------
 * Residual-reference gate (repository-wide). Runtime surfaces must hold ZERO references to a merged/removed id and
 * no moved id outside the homebrew packs; audit history and Phase 3D's own evidence files are classified separately.
 * ---------------------------------------------------------------------------------------------- */
/** Tests that quote pre-migration ids as state-gated evidence (each skips or switches behavior once Phase 3D is applied). */
export const STATE_GATED_EVIDENCE = new Set(['tests/talent-phase-3c-migration-flow.test.mjs', 'tests/talent-tree-membership-review-extras.test.mjs', 'tests/talent-membership-and-pack-completion.test.mjs']);
export function classifyPath(rel) {
  if (/^(data\/audit\/|data\/audits\/|docs\/)/.test(rel)) return 'HISTORY';
  if (rel === HOMEBREW.talentsFile || rel === HOMEBREW.treesFile) return 'HOMEBREW_PACK';
  if (/talent-phase-3d/.test(rel)) return 'PHASE_3D_EVIDENCE';
  if (/^tests\//.test(rel)) return 'TEST';
  if (/^tools\//.test(rel)) return 'TOOL';
  return 'RUNTIME';
}
export function scanResidualReferences({ root = ROOT, manifest }) {
  const recs = manifest.records.filter(r => REMOVING.has(r.finalDisposition));
  const moved = new Set(recs.filter(r => r.finalDisposition === 'MOVE_HOMEBREW_PACK').map(r => r.productionId));
  const mode = fs.existsSync(path.join(root, '.git')) ? '--untracked' : '--no-index'; // scratch copies are not repositories
  const args = ['grep', mode, '-a', '-n', '-o', '-F', ...recs.flatMap(r => ['-e', r.productionId]), '--', '.'];
  const run = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  invariant(run.status === 0 || run.status === 1, 'git grep failed: ' + run.stderr);
  const hits = (run.stdout || '').split('\n').filter(Boolean).map(l => { const [file, , ...rest] = l.split(':'); return { file, id: rest.join(':') }; });
  const out = { RUNTIME: [], TEST: [], TOOL: [], INFORMATIONAL: [], HISTORY: 0, PHASE_3D_EVIDENCE: 0, HOMEBREW_PACK: 0 };
  for (const h of hits) {
    let cls = classifyPath(h.file);
    // Tools/tests: a stale merged/removed id blocks; a MOVED id (record still exists in the homebrew pack) and the explicitly
    // state-gated pre-state tests are informational.
    if ((cls === 'TOOL' || cls === 'TEST') && (moved.has(h.id) || STATE_GATED_EVIDENCE.has(h.file))) { out.INFORMATIONAL.push(`${h.file}:${h.id}`); continue; }
    if (cls === 'HISTORY' || cls === 'PHASE_3D_EVIDENCE') out[cls]++;
    else if (cls === 'HOMEBREW_PACK') { if (moved.has(h.id)) out.HOMEBREW_PACK++; else out.RUNTIME.push(`${h.file}:${h.id}`); }
    else if (cls === 'RUNTIME' && (h.file === 'packs/heroic.db' || h.file === 'packs/nonheroic.db' || h.file === 'packs/npc.db') && moved.has(h.id)) {
      // actor items may reference a moved id ONLY through the homebrew pack sourceId
      const line = readText(h.file, root).split('\n').filter(l => l.includes(h.id));
      const bad = line.some(l => (l.match(new RegExp(h.id, 'g')) ?? []).length !== (l.match(new RegExp(`${HOMEBREW.talentsPack}\\.${h.id}`, 'g')) ?? []).length);
      if (bad) out.RUNTIME.push(`${h.file}:${h.id}`); else out.HOMEBREW_PACK++;
    } else out[cls].push(`${h.file}:${h.id}`);
  }
  for (const k of ['RUNTIME', 'TEST', 'TOOL', 'INFORMATIONAL']) out[k] = [...new Set(out[k])].sort();
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Post-state verification (reads the disk; needs only the committed manifest, census and dry-run report).
 * ---------------------------------------------------------------------------------------------- */
export function loadPostState(root = ROOT) {
  const read = rel => readText(rel, root);
  return {
    manifest: readJson(MANIFEST_PATH, root), report: readJson(REPORT_PATH, root),
    talents: parseNdjson(read(PACKS.talents)), trees: parseNdjson(read(PACKS.trees)), classes: parseNdjson(read(PACKS.classes)),
    actors: Object.fromEntries(Object.entries(ACTOR_PACKS).map(([k, rel]) => [k, parseNdjson(read(rel))])),
    homebrewTalents: fs.existsSync(path.join(root, HOMEBREW.talentsFile)) ? parseNdjson(read(HOMEBREW.talentsFile)) : [],
    homebrewTrees: fs.existsSync(path.join(root, HOMEBREW.treesFile)) ? parseNdjson(read(HOMEBREW.treesFile)) : [],
    texts: { classes: read(PACKS.classes), ...Object.fromEntries(Object.entries(stateKeys).filter(([, rel]) => fs.existsSync(path.join(root, rel))).map(([k, rel]) => [k, read(rel)])) },
    registry: fs.existsSync(path.join(root, REGISTRY_PATHS[0])) ? JSON.parse(read(REGISTRY_PATHS[0])) : [],
    systemJson: JSON.parse(read(SYSTEM_JSON))
  };
}

export function verifyPostState(st, { exact = false, root = ROOT, scan = true } = {}) {
  const results = [];
  const check = (id, ok, detail = '') => results.push({ id, ok: !!ok, detail });
  const { manifest, report } = st;
  const recs = manifest.records, by = d => recs.filter(r => r.finalDisposition === d);
  const leaving = recs.filter(r => REMOVING.has(r.finalDisposition)), moves = by('MOVE_HOMEBREW_PACK');
  const canon = new Map(st.talents.map(t => [t._id, t])), hb = new Map(st.homebrewTalents.map(t => [t._id, t]));
  const exp = report.counts.after;

  check('Phase 3D post-state detected (no merged/removed/moved record remains in the canonical pack)', detect3DState(manifest, st.talents) === 'POST_3D');
  check(`canonical talents = ${exp.canonicalTalents}`, st.talents.length === exp.canonicalTalents, String(st.talents.length));
  check(`homebrew talents = ${exp.homebrewTalents}`, st.homebrewTalents.length === exp.homebrewTalents, String(st.homebrewTalents.length));
  check(`preserved total = ${exp.totalPreservedTalents}`, st.talents.length + st.homebrewTalents.length === exp.totalPreservedTalents);
  check(`canonical trees = ${exp.canonicalTrees}; homebrew-only trees = ${exp.homebrewTrees}`, st.trees.length === exp.canonicalTrees && st.homebrewTrees.length === exp.homebrewTrees, `${st.trees.length}/${st.homebrewTrees.length}`);
  check('review-required = 0', recs.every(r => r.finalDisposition !== 'REVIEW_REQUIRED'));
  check('canonical and homebrew talent packs are disjoint and ids are unique', st.talents.length === canon.size && st.homebrewTalents.length === hb.size && [...hb.keys()].every(id => !canon.has(id)));
  check('homebrew pack holds exactly the MOVE_HOMEBREW_PACK ids', hb.size === moves.length && moves.every(r => hb.has(r.productionId)));
  check('merged and removed records exist in neither pack', [...by('MERGE_DUPLICATE'), ...by('REMOVE_CONTAMINATION')].every(r => !canon.has(r.productionId) && !hb.has(r.productionId)));
  check('merge survivors, KEEP and CORRECT_IDENTITY records are in the canonical pack', [...by('MERGE_DUPLICATE').map(r => r.survivorId), ...by('KEEP_CANONICAL_ADDITIONAL_PUBLICATION').map(r => r.productionId), ...by('CORRECT_IDENTITY').map(r => r.productionId)].every(id => canon.has(id)));
  check('Ranged Disarm is in Gunslinger only, with the corrected system.treeId', (() => { const r = by('CORRECT_IDENTITY')[0]; const owners = st.trees.filter(t => t.system.talentIds.includes(r.productionId)); return owners.length === 1 && owners[0]._id === r.correctIdentity.toTreeId && canon.get(r.productionId).system.treeId === r.correctIdentity.toTreeId; })());
  check('every canonical tree member exists in the canonical pack and no homebrew talent is a canonical tree member', st.trees.every(t => (t.system.talentIds ?? []).every(id => canon.has(id) && !hb.has(id))));
  check('canonical talentNames expose only canonical members', st.trees.every(t => { const names = new Set(t.system.talentIds.map(id => canon.get(id).name)); return (t.system.talentNames ?? []).every(n => names.has(n)); }));
  check('every homebrew tree member exists in the homebrew pack; homebrew trees are not canonical trees', st.homebrewTrees.every(t => t.system.talentIds.every(id => hb.has(id)) && !st.trees.some(c => c._id === t._id)));
  check('every homebrew talent keeps a resolvable tree context (homebrew tree, canonical tree id, or the legacy slug of a canonical tree)', st.homebrewTalents.every(t => st.homebrewTrees.some(x => x.system.talentIds.includes(t._id)) || st.trees.some(c => c._id === t.system.treeId || registrySlug(c.name) === String(t.system.treeId).replace(/_/g, '-'))));
  const hbTreeIds = st.homebrewTrees.map(t => t._id);
  check('no canonical class references a homebrew-only tree', st.classes.every(c => !hbTreeIds.some(id => JSON.stringify(c.system ?? {}).includes(id))));
  check('class records are byte-identical to the Phase 3C state', gitBlobSha(st.texts.classes) === report.preState.classes);

  const regIds = new Set(st.trees.map(t => t._id));
  check('both registry files are identical and canonical-only (no homebrew tree, no homebrew talent)', st.texts.registry === st.texts.registryFixes && st.registry.every(e => !e.sourceId || regIds.has(e.sourceId)) && st.registry.every(e => (e.talentIds ?? []).every(id => !hb.has(id))));
  check('registry has an entry for every canonical tree', [...regIds].every(id => st.registry.some(e => e.sourceId === id)));
  const regen = serializeRegistry(buildTalentTreeRegistry({ talents: st.talents, trees: st.trees, classes: st.classes, previousRegistry: st.registry }));
  check('registry equals a fresh generation from the packs (fresh)', regen === st.texts.registry);

  const items = report.actorRepoints.items;
  check(`all ${items.length} certified embedded actor repoints are in place, embedded _id preserved`, items.length === report.actorRepoints.total && items.every(r => { const it = st.actors[r.pack].find(a => a._id === r.actorId)?.items?.[r.itemIndex]; return it && it._id === r.embeddedItemId && it.flags?.core?.sourceId === sourceIdFor(r.toPack, r.to); }));
  const classNameOf = id => st.classes.find(c => c._id === id)?.name ?? id;
  check('every refreshed snapshot equals its surviving canonical record', items.filter(r => r.snapshotRefreshed).every(r => { const it = st.actors[r.pack].find(a => a._id === r.actorId).items[r.itemIndex]; const sv = canon.get(r.to); return snapshotMatches(it, sv, st.trees.find(t => t.system.talentIds.includes(sv._id)), classNameOf); }));
  const leavingIds = new Set(leaving.map(r => r.productionId));
  check('no embedded actor item points at a record that left the canonical pack', Object.values(st.actors).flat().every(a => (a.items ?? []).every(i => { const s = parseSourceId(i.flags?.core?.sourceId); return !(s && s.pack === 'talents' && leavingIds.has(s.id)); })));
  check('no contaminated Notorious / merged Teräs Käsi snapshot text survives', Object.values(st.actors).flat().every(a => (a.items ?? []).every(i => !(i.name === 'Notorious' && /Reference Book|Master Manipulator|small favor from someone/i.test(JSON.stringify(i.system))) && !(i.name === 'Teräs Käsi Basics' && /Prerequisites: ,/.test(JSON.stringify(i.system))))));
  check('no canonical structured prerequisite identity points at a removed/merged/moved Phase 3D record (zero dangling)', (report.retiredIdentities ?? []).length > 0 && danglingFromRetired(report.retiredIdentities, st.talents).length === 0);
  check('allow-listed canonical prerequisite repoints are in place with prerequisite text preserved', (manifest.canonicalPrerequisiteRepoints?.repoints ?? []).every(r => { const i = Number(/\[(\d+)\]/.exec(r.path)[1]); const t = canon.get(r.recordId); return [t?.system?.prerequisitesStructured?.conditions?.[i]?.id, t?.system?.prerequisitesStructured?.conditions?.[i]?.uuid].some(x => x === r.to || x === `Compendium.foundryvtt-swse.talents.Item.${r.to}`) && // Phase 3G (later state) migrated the leaf to its uuid
     t.system.prerequisites === r.preservePrerequisiteText; }));
  check('derived talents.fixed.json mirrors carry no leaving id', DERIVED_FILES.every(rel => !leaving.some(r => (st.texts[rel === DERIVED_FILES[0] ? 'derivedGenerated' : 'derivedFixes'] ?? '').includes(`"${r.productionId}"`))));

  const packNames = new Map(st.systemJson.packs.map(p => [p.name, p]));
  check('system.json registers both homebrew packs as noncanonical Item compendia, and the canonical packs still exist', packNames.has(HOMEBREW.talentsPack) && packNames.has(HOMEBREW.treesPack) && packNames.get(HOMEBREW.talentsPack).flags?.swse?.noncanonical === true && packNames.get(HOMEBREW.talentsPack).path === 'packs/talents-homebrew' && packNames.has('talents') && packNames.has('talent_trees') && /Homebrew/.test(packNames.get(HOMEBREW.talentsPack).label));

  if (scan) {
    const res = scanResidualReferences({ root, manifest });
    check('residual-reference gate: 0 runtime references to any merged/removed id (and to moved ids outside the homebrew packs)', res.RUNTIME.length === 0, res.RUNTIME.slice(0, 8).join(', '));
    check('tools/tests outside Phase 3D evidence carry no stale reference (triage list is empty)', res.TOOL.length === 0 && res.TEST.length === 0, [...res.TOOL, ...res.TEST].slice(0, 8).join(', '));
  }
  if (exact) for (const [k, rel] of Object.entries(stateKeys)) check(`exact certified blob: ${rel}`, st.texts[k] !== undefined && gitBlobSha(st.texts[k]) === report.postState[k], k);
  return results;
}

/* ------------------------------------------------------------------------------------------------
 * CLI
 * ---------------------------------------------------------------------------------------------- */
export function freshReport(root = ROOT) {
  const c3 = detectPhase3cState(root);
  invariant(c3.state === 'POST_STATE', `the Phase 3C certified post-state is required (found ${c3.state})`);
  const input = loadInputs(root);
  const p = projectPhase3D(input);
  const verification = verifyProjection(input, p);
  // Repository-wide: every runtime reference to a leaving id must sit in a file this plan rewrites (packs, registries, derived mirrors, runtime data).
  const planned = new Set([...Object.values(PACKS), ...Object.values(ACTOR_PACKS), ...REGISTRY_PATHS, ...DERIVED_FILES, ...RUNTIME_DATA_FILES]);
  const scan = scanResidualReferences({ root, manifest: input.manifest });
  const uncovered = scan.RUNTIME.filter(h => !planned.has(h.split(':')[0]));
  verification.push({ id: 'repository-wide scan: every runtime reference to a leaving id is in a file this plan rewrites', ok: uncovered.length === 0, detail: uncovered.slice(0, 6).join(', ') });
  verification.push({ id: 'repository-wide scan: stale tool/test references are listed for triage', ok: true, detail: `${scan.TOOL.length} tool, ${scan.TEST.length} test` });
  return { input, p, scan, report: buildReport(input, p, verification, root) };
}

const printResults = results => { for (const v of results) console.log(`${v.ok ? 'PASS' : 'FAIL'}  ${v.id}${v.ok || !v.detail ? '' : '  [' + v.detail + ']'}`); };

export function applyProduction(root = ROOT) {
  const c3 = detectPhase3cState(root);
  invariant(c3.state !== 'POST_3D_STATE' && c3.state !== 'POST_3E4_STATE' && c3.state !== 'POST_3E5_STATE' && c3.state !== 'POST_3F_STATE' && c3.state !== 'POST_3G_STATE' && c3.state !== 'POST_11_2A_STATE' && c3.state !== 'POST_11_2B_STATE' && c3.state !== 'POST_11_2C_STATE', 'REFUSED: already applied — the packs are the Phase 3D certified post-state (use --verify --exact)');
  invariant(c3.state === 'POST_STATE', `REFUSED: the Phase 3C certified post-state is required (found ${c3.state}); partial or unexpected pack fingerprints are not migrated`);
  const input = loadInputs(root);
  invariant(detect3DState(input.manifest, input.talents) === 'PRE_3D', 'REFUSED: Phase 3D is already applied (or partly applied)');
  invariant(fs.existsSync(path.join(root, REPORT_PATH)), 'REFUSED: no committed dry-run report');
  const committed = readJson(REPORT_PATH, root);
  invariant(committed.dryRun === true && committed.status === 'DRY_RUN_CERTIFIED', 'REFUSED: the committed dry-run report is not certified');
  const { report } = freshReport(root);
  invariant(readText(REPORT_PATH, root) === JSON.stringify(report, null, 2) + '\n', 'REFUSED: the committed dry-run report differs from a fresh projection (production drifted or the report is stale)');
  const p = projectPhase3D(input);
  const files = renderOutputs(input, p, root);
  // self-verify the rendered bytes before anything is written
  const failed = verifyProjection(input, p).filter(v => !v.ok);
  invariant(!failed.length, 'REFUSED: projection failed self-verification: ' + failed.map(f => f.id).join('; '));
  for (const [k, rel] of Object.entries(stateKeys)) invariant(gitBlobSha(files[rel]) === committed.postState[k], `REFUSED: rendered ${rel} does not match the certified post-state blob`);
  for (const [rel, text] of Object.entries(files)) fs.writeFileSync(path.join(root, rel), text);
  return { written: Object.keys(files) };
}

export async function main(argv = process.argv.slice(2), root = ROOT) {
  const has = f => argv.includes(f);
  if (has('--status')) {
    const input = loadInputs(root);
    console.log(`${ERR}phase 3C: ${detectPhase3cState(root).state}; phase 3D: ${detect3DState(input.manifest, input.talents)}`);
    return 0;
  }
  if (has('--apply')) {
    const { written } = applyProduction(root);
    console.log(`${ERR}APPLIED. Wrote ${written.length} files (uncommitted):\n  ` + written.join('\n  '));
    return 0;
  }
  if (has('--verify')) {
    const st = loadPostState(root);
    const results = verifyPostState(st, { exact: has('--exact'), root });
    printResults(results);
    const bad = results.filter(r => !r.ok).length;
    console.log(`\n${ERR}verify ${bad ? 'FAIL' : 'PASS'} (${results.length} checks; no files written)`);
    return bad ? 1 : 0;
  }
  const { report } = freshReport(root);
  printResults(report.verification.results);
  console.log(`\n${ERR}${report.status}: ${report.counts.arithmetic}`);
  console.log(`${ERR}actor repoints ${report.actorRepoints.total} (snapshots refreshed ${report.actorRepoints.snapshotRefreshed}) · trees to homebrew ${report.trees.movedToHomebrew.length} · registry entries ${report.counts.after.registryEntries}`);
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
