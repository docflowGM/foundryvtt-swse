#!/usr/bin/env node
/**
 * Deterministic runtime registry builders for Phase 3C.
 *
 * These derived files are downstream of the production packs:
 *   - data/generated/talent-trees.registry.json
 *   - data/fixes/talent-trees.registry.json (runtime fallback parity)
 *   - data/generated/class-talent-tree-bindings.json
 *
 * The builder preserves an existing registry id when the displayName is unchanged,
 * so Phase 3C repairs membership without gratuitous stable-key churn.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_TREE_REGISTRY = 'data/generated/talent-trees.registry.json';
const FIXES_TREE_REGISTRY = 'data/fixes/talent-trees.registry.json';
const CLASS_BINDINGS = 'data/generated/class-talent-tree-bindings.json';

const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readPack = rel => readText(rel).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const invariant = (ok, message) => { if (!ok) throw new Error('[talent-runtime-registry] ' + message); };

export function normalizeRegistryId(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildTalentTreeRegistry({ talents, trees, legacyRegistry = [] }) {
  const talentById = new Map(talents.map(t => [t._id, t]));
  const legacyIdByDisplayName = new Map();
  for (const entry of legacyRegistry) {
    if (entry?.displayName && entry?.id && !legacyIdByDisplayName.has(entry.displayName)) {
      legacyIdByDisplayName.set(entry.displayName, entry.id);
    }
  }

  const entries = trees.map(tree => {
    const ids = [...(tree.system?.talentIds ?? [])];
    const names = ids.map(id => {
      const talent = talentById.get(id);
      invariant(talent, 'tree ' + tree._id + ' references missing talent ' + id);
      return talent.name;
    });
    const displayName = tree.name || tree.system?.talent_tree;
    invariant(displayName, 'tree ' + tree._id + ' has no display name');
    return {
      id: legacyIdByDisplayName.get(displayName) ?? normalizeRegistryId(displayName),
      displayName,
      talentCount: ids.length,
      talents: names
    };
  }).sort((a,b) => a.id.localeCompare(b.id));

  invariant(new Set(entries.map(e => e.id)).size === entries.length, 'duplicate runtime tree registry ids');
  return entries;
}

export function buildClassTalentTreeBindings(classes) {
  return classes.map(cls => ({
    class: cls.name,
    treeIds: [...(cls.system?.talentTreeIds ?? [])]
  }));
}

export function buildRuntimeRegistries({
  talents,
  trees,
  classes,
  legacyRegistry = []
}) {
  return {
    talentTreeRegistry: buildTalentTreeRegistry({ talents, trees, legacyRegistry }),
    classBindings: buildClassTalentTreeBindings(classes)
  };
}

function serialize(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function runCli() {
  const talents = readPack('packs/talents.db');
  const trees = readPack('packs/talent_trees.db');
  const classes = readPack('packs/classes.db');
  const legacyRegistry = JSON.parse(readText(GENERATED_TREE_REGISTRY));
  const built = buildRuntimeRegistries({ talents, trees, classes, legacyRegistry });

  const expected = {
    [GENERATED_TREE_REGISTRY]: serialize(built.talentTreeRegistry),
    [FIXES_TREE_REGISTRY]: serialize(built.talentTreeRegistry),
    [CLASS_BINDINGS]: serialize(built.classBindings)
  };

  if (process.argv.includes('--check')) {
    for (const [rel, serialized] of Object.entries(expected)) {
      invariant(fs.existsSync(path.join(ROOT, rel)), 'missing derived registry ' + rel);
      invariant(readText(rel) === serialized, 'stale derived registry ' + rel);
    }
    console.log('[talent-runtime-registry] PASS: runtime talent/class registries match production packs');
    return;
  }

  if (process.argv.includes('--write')) {
    for (const [rel, serialized] of Object.entries(expected)) {
      fs.writeFileSync(path.join(ROOT, rel), serialized, 'utf8');
    }
    console.log('[talent-runtime-registry] wrote runtime registries from production packs');
    return;
  }

  console.log(JSON.stringify({
    talentTrees: built.talentTreeRegistry.length,
    classBindings: built.classBindings.length,
    talentAssignments: built.talentTreeRegistry.reduce((n, e) => n + e.talentCount, 0),
    classTreeAssignments: built.classBindings.reduce((n, e) => n + e.treeIds.length, 0)
  }, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) runCli();
