#!/usr/bin/env node
/**
 * Homebrew talent-pack integrity audit (read-only). The homebrew compendia preserve noncanonical talents that left the
 * canonical pack in Phase 3D; they must stay isolated, internally consistent and clearly noncanonical.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ndjson = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);
const errors = [];
const fail = m => errors.push(m);

const sys = JSON.parse(read('system.json'));
const packs = new Map(sys.packs.map(p => [p.name, p]));
for (const [name, file] of [['talents-homebrew', 'packs/talents-homebrew.db'], ['talent-trees-homebrew', 'packs/talent-trees-homebrew.db']]) {
  const p = packs.get(name);
  if (!p) { fail(`system.json has no "${name}" pack`); continue; }
  if (p.type !== 'Item') fail(`${name}: type must be Item`);
  if (p.flags?.swse?.noncanonical !== true) fail(`${name}: pack is not flagged noncanonical`);
  if (!/Homebrew/i.test(p.label) || !/Noncanonical/i.test(p.label)) fail(`${name}: label must say Homebrew and Noncanonical (${p.label})`);
  if (!fs.existsSync(path.join(ROOT, file))) fail(`${file} is missing`);
}
if (!errors.length) {
  const hbTalents = ndjson('packs/talents-homebrew.db'), hbTrees = ndjson('packs/talent-trees-homebrew.db');
  const canon = new Set(ndjson('packs/talents.db').map(t => t._id));
  const canonTrees = new Map(ndjson('packs/talent_trees.db').map(t => [t._id, t]));
  const ids = new Set(hbTalents.map(t => t._id));
  if (ids.size !== hbTalents.length) fail('duplicate _id in the homebrew talent pack');
  for (const t of hbTalents) {
    if (canon.has(t._id)) fail(`homebrew talent ${t._id} ${t.name} also exists in the canonical pack`);
    if (t.type !== 'talent') fail(`${t._id}: type ${t.type}`);
    const hbTree = hbTrees.find(x => x.system.talentIds.includes(t._id));
    const slugOk = [...canonTrees.values()].some(c => String(c.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === String(t.system?.treeId).replace(/_/g, '-'));
    if (!hbTree && !canonTrees.has(t.system?.treeId) && !slugOk) fail(`${t._id} ${t.name}: no resolvable tree context`);
    if (canonTrees.has(t.system?.treeId) && canonTrees.get(t.system.treeId).system.talentIds.includes(t._id)) fail(`${t._id} ${t.name}: leaked into canonical tree ${t.system.treeId}`);
  }
  const treeIds = new Set(hbTrees.map(t => t._id));
  if (treeIds.size !== hbTrees.length) fail('duplicate _id in the homebrew tree pack');
  for (const t of hbTrees) {
    if (canonTrees.has(t._id)) fail(`homebrew tree ${t._id} ${t.name} also exists in the canonical tree pack`);
    for (const id of t.system.talentIds) if (!ids.has(id)) fail(`homebrew tree ${t.name}: member ${id} is not in the homebrew talent pack`);
  }
  for (const f of ['data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json']) {
    const reg = JSON.parse(read(f));
    for (const e of reg) { if (treeIds.has(e.sourceId)) fail(`${f}: registers homebrew tree ${e.sourceId}`); for (const id of e.talentIds ?? []) if (ids.has(id)) fail(`${f}: entry ${e.id} exposes homebrew talent ${id}`); }
  }
  for (const c of ndjson('packs/classes.db')) { const j = JSON.stringify(c.system ?? {}); for (const id of treeIds) if (j.includes(id)) fail(`class ${c.name} references homebrew tree ${id}`); }
  if (!errors.length) console.log(`[homebrew-pack] PASS: ${hbTalents.length} homebrew talents, ${hbTrees.length} homebrew trees; isolated from the canonical pack, registries and class access`);
}
if (errors.length) { errors.forEach(e => console.error('  FAIL ' + e)); process.exit(1); }
