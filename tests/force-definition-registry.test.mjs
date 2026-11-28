import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  installForceDefinitions, clearForceDefinitions, isForceDefinitionRegistryLoaded, loadForceDefinitions,
  getForceDefinition, listForceDefinitions, forceDefinitionCounts, forceDefinitionForItem, FORCE_DEFINITION_DOMAINS
} from '../scripts/engine/force/force-definition-registry.js';

const corpus = JSON.parse(readFileSync('data/force-v2/definitions.json', 'utf8'));

// Baseline reconciliation: six revalidated books (194) + Legacy Era Book 7 (18) = 212, per-domain counts exactly as audited.
assert.equal(corpus.total, 212);
assert.deepEqual(corpus.counts, { 'force-power': 65, 'force-technique': 58, 'force-secret': 15, 'unleashed-overlay': 11, 'lightsaber-form-power': 24, 'force-regimen': 12, 'starship-maneuver': 27 });
assert.equal(corpus.sources.reduce((n, s) => n + s.count, 0), 212);
assert.equal(corpus.sources.find((s) => /Legacy_Era/.test(s.file))?.count, 18, 'Legacy Era Book 7 is part of the corpus');
assert.equal(corpus.sources.filter((s) => !/Legacy_Era/.test(s.file)).reduce((n, s) => n + s.count, 0), 194);

// Generated file is in sync with its audit sources (drift detection)
const { createHash } = await import('node:crypto');
for (const s of corpus.sources) assert.equal(createHash('sha256').update(readFileSync('docs/audits/force-v2/bookwise-v2.9/' + s.file)).digest('hex'), s.sha256, `${s.file} changed: rebuild data/force-v2/definitions.json`);

assert.equal(isForceDefinitionRegistryLoaded(), false);
assert.equal(getForceDefinition('cwcg/force-power/cloak'), null, 'nothing loaded -> null, never a guess');
assert.equal(installForceDefinitions({ schemaVersion: 2, definitions: [] }), false, 'wrong schema refused');
assert.equal(installForceDefinitions({ ...corpus, total: 211 }), false, 'inconsistent total refused');
assert.equal(installForceDefinitions({ ...corpus, definitions: [...corpus.definitions, corpus.definitions[0]], total: 213 }), false, 'duplicate id refused');
assert.equal(isForceDefinitionRegistryLoaded(), false);
assert.equal(installForceDefinitions(corpus), true);
assert.deepEqual(forceDefinitionCounts(), corpus.counts);
assert.equal(listForceDefinitions().length, 212);
assert.equal(listForceDefinitions({ domain: 'starship-maneuver' }).length, 27);
assert(listForceDefinitions({ domain: 'force-power', bookId: 'swse-clone-wars' }).length === 8);
assert(FORCE_DEFINITION_DOMAINS.every((d) => listForceDefinitions({ domain: d }).length > 0));
assert.equal(getForceDefinition('cwcg/force-power/cloak').printedName, 'Cloak');

// Item linkage against the real packs: pack id is strong evidence; name fallback is labelled and refuses ambiguity.
const readPack = (p) => readFileSync(`packs/${p}.db`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const packs = { 'force-power': ['forcepowers', 'force-power'], 'force-technique': ['forcetechniques', 'force-technique'], 'force-secret': ['forcesecrets', 'force-secret'], 'force-regimen': ['forceregimens', 'force-regimen'], 'lightsaber-form-power': ['lightsaberformpowers', 'lightsaber-form-power'] };
const KNOWN_GAPS = new Set(['fucg/force-technique/improved-force-storm']); // definition with no pack record at all (runtime: cannot be learned from the pack)
const KNOWN_NAME_DIFF = new Set(['fucg/force-power/force-storm']);          // pack record is named "Force Storm (FUCG)"; id matches
const unlinked = [], nameDiff = [];
for (const def of listForceDefinitions()) {
  const entry = packs[def.domain];
  if (!entry) continue;
  const item = readPack(entry[0]).find((r) => r._id === def.legacyPackId);
  if (!item) { unlinked.push(def.definitionId); continue; }
  const hit = forceDefinitionForItem({ type: entry[1], name: item.name, _stats: { compendiumSource: `Compendium.foundryvtt-swse.${entry[0]}.Item.${item._id}` } });
  assert.equal(hit?.definition.definitionId, def.definitionId, `${def.definitionId} resolves from its pack item`);
  assert.equal(hit.via, 'pack-id');
  if (item.name.toLowerCase() !== def.printedName.toLowerCase()) nameDiff.push(def.definitionId);
}
assert.deepEqual(new Set(unlinked), KNOWN_GAPS, 'only the documented pack gap');
assert.deepEqual(new Set(nameDiff), KNOWN_NAME_DIFF);
// name fallback
const byName = forceDefinitionForItem({ type: 'forcepower', name: 'Cloak' });
assert.equal(byName?.via, 'name'); assert.equal(byName.definition.definitionId, 'cwcg/force-power/cloak');
assert.equal(forceDefinitionForItem({ type: 'weapon', name: 'Cloak' }), null, 'wrong item domain is never linked');
assert.equal(forceDefinitionForItem({ type: 'forcepower', name: 'Not A Power' }), null);

// loader never throws
clearForceDefinitions();
assert.equal(await loadForceDefinitions(async () => { throw new Error('boom'); }), false);
assert.equal(await loadForceDefinitions(async () => ({ ok: false })), false);
assert.equal(await loadForceDefinitions(async () => ({ ok: true, json: async () => corpus })), true);
console.log('force definition registry: ok');
