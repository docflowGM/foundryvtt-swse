#!/usr/bin/env node
/**
 * Deterministic generator for the runtime talent-tree membership registry.
 *
 *   data/generated/talent-trees.registry.json   (primary; read by TalentTreeDB, TalentTreeMembershipAuthority,
 *   data/fixes/talent-trees.registry.json        TalentTreeRegistry; the fixes copy is the byte-identical fallback)
 *
 * Authority is the production packs, not the registry:
 *   packs/talent_trees.db  -> one entry per tree (sourceId, displayName, member IDs)
 *   packs/talents.db       -> member display names, in the tree's own order
 *   packs/classes.db       -> classAccess (class names that reference the tree by ID)
 *
 * Every generated entry carries `sourceId` (the pack tree _id). That is what makes the registry able to represent
 * distinct trees that share a display name (Squad Leader exists in Clone Wars and Galaxy at War) and what lets the
 * runtime resolve members by ID (`talentIds`) so same-name talents in different trees (Core / JATM Charm Beast) are
 * never conflated. `talents` (names) and `talentCount` keep their historical meaning for name-based consumers.
 *
 * Entries WITHOUT `sourceId` are hand-maintained legacy aliases (class-level aggregates such as "soldier"); they are
 * passed through verbatim, except aliases named after a tree the certified Phase 3B consolidation deleted.
 *
 * Usage:
 *   node tools/build-talent-tree-registry.mjs           write both registry files from the on-disk packs
 *   node tools/build-talent-tree-registry.mjs --check   fail if either file differs from a fresh generation
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY_PATHS = ['data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json'];

export const registrySlug = name => String(name ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @param {{talents:object[], trees:object[], classes:object[], previousRegistry:object[], obsoleteTreeNames?:string[]}} input
 * @returns {object[]} registry entries sorted by id
 */
export function buildTalentTreeRegistry({ talents, trees, classes, previousRegistry = [], obsoleteTreeNames = [] }) {
  const talentById = new Map(talents.map(t => [t._id, t]));
  const slugCounts = new Map();
  for (const t of trees) slugCounts.set(registrySlug(t.name), (slugCounts.get(registrySlug(t.name)) ?? 0) + 1);

  const classAccess = new Map();
  for (const cls of classes) {
    const refs = new Set([...(cls.system?.talent_trees ?? []), ...(cls.system?.talentTreeSourceIds ?? [])]);
    for (const ref of refs) classAccess.set(ref, [...(classAccess.get(ref) ?? []), cls.name]);
  }

  const generated = trees.map(tree => {
    const ids = [...(tree.system?.talentIds ?? [])];
    const names = ids.map(id => {
      const talent = talentById.get(id);
      if (!talent) throw new Error(`[talent-tree-registry] tree "${tree.name}" (${tree._id}) references missing talent ${id}`);
      return talent.name;
    });
    const slug = registrySlug(tree.name);
    return {
      // Distinct trees that share a display name must not share an entry id.
      id: slugCounts.get(slug) > 1 ? `${slug}-${tree._id}` : slug,
      displayName: tree.name,
      talentCount: names.length,
      talents: names,
      talentIds: ids,
      sourceId: tree._id,
      classAccess: [...new Set(classAccess.get(tree._id) ?? [])].sort(byString)
    };
  });

  const generatedIds = new Set(generated.map(e => e.id));
  // A legacy alias is superseded by any pack tree whose display-name slug it shares (including same-name trees that
  // received a disambiguated id), and by a tree the certified consolidation deleted.
  const supersededIds = new Set([...slugCounts.keys(), ...obsoleteTreeNames.map(registrySlug)]);
  const legacy = previousRegistry.filter(entry => !entry.sourceId && !generatedIds.has(entry.id) && !supersededIds.has(entry.id));

  const ids = generated.map(e => e.id);
  if (new Set(ids).size !== ids.length) throw new Error('[talent-tree-registry] generated entry IDs are not unique');
  return [...generated, ...legacy].sort((a, b) => byString(a.id, b.id));
}

export const serializeRegistry = registry => JSON.stringify(registry, null, 2) + '\n';

export function obsoleteTreeNamesFromManifests(manifests) {
  return manifests.flatMap(({ manifest }) => (manifest.treeConsolidations ?? []).flatMap(c => (c.obsoleteTrees ?? []).map(t => t.treeName)));
}

const parseNdjson = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);

/** Generate from a set of pack texts (used by the applicator for the projected state) or from disk. */
export function generateFromPackTexts({ texts, previousRegistry, manifests }) {
  return buildTalentTreeRegistry({
    talents: parseNdjson(texts.talents),
    trees: parseNdjson(texts.trees),
    classes: parseNdjson(texts.classes),
    previousRegistry,
    obsoleteTreeNames: obsoleteTreeNamesFromManifests(manifests)
  });
}

export function loadPreviousRegistry(root = ROOT) {
  const p = path.join(root, REGISTRY_PATHS[0]);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

function loadManifests(root) {
  const dir = path.join(root, 'data/audits');
  return fs.readdirSync(dir).filter(f => /^talent-phase-3b-.*-manifest\.json$/.test(f)).sort()
    .map(f => ({ manifest: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

export function generateFromDisk(root = ROOT) {
  const texts = Object.fromEntries(['talents', 'talent_trees', 'classes'].map(k => [k === 'talent_trees' ? 'trees' : k,
    fs.readFileSync(path.join(root, 'packs', `${k}.db`), 'utf8')]));
  return generateFromPackTexts({ texts, previousRegistry: loadPreviousRegistry(root), manifests: loadManifests(root) });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const serialized = serializeRegistry(generateFromDisk());
  if (process.argv.includes('--check')) {
    const stale = REGISTRY_PATHS.filter(rel => !fs.existsSync(path.join(ROOT, rel)) || fs.readFileSync(path.join(ROOT, rel), 'utf8') !== serialized);
    if (stale.length) {
      console.error('[talent-tree-registry] STALE: ' + stale.join(', ') + ' (run node tools/build-talent-tree-registry.mjs)');
      process.exit(1);
    }
    console.log(`[talent-tree-registry] PASS: ${REGISTRY_PATHS.length} registry files match the production packs`);
  } else {
    for (const rel of REGISTRY_PATHS) fs.writeFileSync(path.join(ROOT, rel), serialized, 'utf8');
    console.log('[talent-tree-registry] wrote ' + REGISTRY_PATHS.join(', '));
  }
}
