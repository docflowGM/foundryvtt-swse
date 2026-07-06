#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PACKS = {
  talents: path.join(ROOT, 'packs', 'talents.db'),
  talentTrees: path.join(ROOT, 'packs', 'talent_trees.db'),
  classes: path.join(ROOT, 'packs', 'classes.db'),
};

function readJsonLines(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter((row) => row.text)
    .map((row) => ({ line: row.line, data: JSON.parse(row.text) }));
}

function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pushToMap(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function getDuplicates(map) {
  return [...map.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([key, values]) => ({ key, values }));
}

const talents = readJsonLines(PACKS.talents).map(({ line, data }) => ({ ...data, line }));
const trees = readJsonLines(PACKS.talentTrees).map(({ line, data }) => ({ ...data, line }));
const classes = readJsonLines(PACKS.classes).map(({ line, data }) => ({ ...data, line }));

const talentsById = new Map();
const talentIdMap = new Map();
const talentNameMap = new Map();
const treesByKey = new Map();
const treeSideClaimsByTalent = new Map();

for (const talent of talents) {
  talentsById.set(talent._id, talent);
  pushToMap(talentIdMap, talent._id, { id: talent._id, name: talent.name, line: talent.line });
  pushToMap(talentNameMap, normalizeKey(talent.name), { id: talent._id, name: talent.name, line: talent.line });
}

for (const tree of trees) {
  for (const ref of [tree._id, tree.name, tree.system?.talent_tree, tree.system?.key]) {
    const key = normalizeKey(ref);
    if (key) treesByKey.set(key, tree);
  }

  for (const talentId of tree.system?.talentIds ?? []) {
    if (!treeSideClaimsByTalent.has(talentId)) treeSideClaimsByTalent.set(talentId, []);
    treeSideClaimsByTalent.get(talentId).push({ treeId: tree._id, treeName: tree.name, treeLine: tree.line });
  }
}

const hardFailures = {
  duplicateTalentIds: getDuplicates(talentIdMap),
  duplicateTalentNames: getDuplicates(talentNameMap),
  treeClaimsMissingTalents: [],
  duplicateTreeSideTalentClaims: [],
  talentsUnclaimedByTree: [],
  talentsSelfClaimUnknownTree: [],
  talentsSelfClaimTreeThatDoesNotClaimThem: [],
  classRefsMissingTrees: [],
};

for (const [talentId, claims] of treeSideClaimsByTalent.entries()) {
  if (!talentsById.has(talentId)) {
    for (const claim of claims) hardFailures.treeClaimsMissingTalents.push({ talentId, ...claim });
  }
  if (claims.length > 1) {
    hardFailures.duplicateTreeSideTalentClaims.push({ talentId, talentName: talentsById.get(talentId)?.name ?? null, claims });
  }
}

for (const talent of talents) {
  const claims = treeSideClaimsByTalent.get(talent._id) ?? [];
  if (!claims.length) {
    hardFailures.talentsUnclaimedByTree.push({
      talentId: talent._id,
      talentName: talent.name,
      line: talent.line,
      treeId: talent.system?.treeId ?? null,
      talentTree: talent.system?.talent_tree ?? talent.system?.talentTree ?? talent.system?.tree ?? null,
    });
  }

  const selfRefs = [talent.system?.treeId, talent.system?.talentTreeId, talent.system?.talent_tree_id, talent.system?.talent_tree, talent.system?.talentTree, talent.system?.tree]
    .map(normalizeKey)
    .filter(Boolean);
  if (!selfRefs.length) continue;

  const matchedTrees = selfRefs.map((ref) => treesByKey.get(ref)).filter(Boolean);
  if (!matchedTrees.length) {
    hardFailures.talentsSelfClaimUnknownTree.push({ talentId: talent._id, talentName: talent.name, line: talent.line, refs: selfRefs });
    continue;
  }

  if (!matchedTrees.some((tree) => (tree.system?.talentIds ?? []).includes(talent._id))) {
    hardFailures.talentsSelfClaimTreeThatDoesNotClaimThem.push({
      talentId: talent._id,
      talentName: talent.name,
      line: talent.line,
      selfRefs,
      matchedTrees: matchedTrees.map((tree) => ({ treeId: tree._id, treeName: tree.name, treeLine: tree.line })),
    });
  }
}

const classClaimedTreeIds = new Set();
for (const cls of classes) {
  const refs = [
    ...(Array.isArray(cls.system?.talentTreeIds) ? cls.system.talentTreeIds : []),
    ...(Array.isArray(cls.system?.talentTreeSourceIds) ? cls.system.talentTreeSourceIds : []),
    ...(Array.isArray(cls.system?.talentTreeNames) ? cls.system.talentTreeNames : []),
    ...(Array.isArray(cls.system?.talent_trees) ? cls.system.talent_trees : []),
  ];
  for (const ref of refs) {
    const tree = treesByKey.get(normalizeKey(ref));
    if (tree) classClaimedTreeIds.add(tree._id);
    else hardFailures.classRefsMissingTrees.push({ classId: cls._id, className: cls.name, line: cls.line, ref });
  }
}

const treesNotClaimedByClass = trees
  .filter((tree) => !classClaimedTreeIds.has(tree._id))
  .map((tree) => ({ treeId: tree._id, treeName: tree.name, line: tree.line, tags: tree.system?.tags ?? [] }));

const hardFailureCount = Object.values(hardFailures).reduce((sum, entries) => sum + entries.length, 0);
const report = {
  counts: {
    talents: talents.length,
    talentTrees: trees.length,
    classes: classes.length,
    treeSideTalentClaims: [...treeSideClaimsByTalent.values()].reduce((sum, claims) => sum + claims.length, 0),
    classClaimedTrees: classClaimedTreeIds.size,
  },
  hardFailures,
  inventory: { treesNotClaimedByClass },
};

console.log('SWSE Talent Tree Membership Static Audit');
console.log('========================================');
console.log(JSON.stringify(report.counts, null, 2));
for (const [name, entries] of Object.entries(hardFailures)) {
  console.log(`${name}: ${entries.length}`);
  for (const entry of entries.slice(0, 25)) console.log(`  - ${JSON.stringify(entry)}`);
  if (entries.length > 25) console.log(`  ... ${entries.length - 25} more`);
}
console.log(`treesNotClaimedByClass: ${treesNotClaimedByClass.length}`);

if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
if (hardFailureCount > 0) {
  console.error(`\nFAIL: ${hardFailureCount} hard talent/tree membership issue(s) found.`);
  process.exit(1);
}
console.log('\nPASS: talent/tree membership audit found no hard failures.');
