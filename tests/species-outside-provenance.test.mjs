import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const prov = JSON.parse(readFileSync('tools/data/species-outside-provenance.json', 'utf8'));
const doc = readFileSync('docs/audits/swse-species-outside-inventory.md', 'utf8');
const KNOWN = new Set(['NOT_FOUND_IN_LOCAL_TEXT', 'MENTION_ONLY', 'CREATURE_ONLY', 'NPC_ONLY', 'NEAR_HUMAN_TEMPLATE', 'NEAR_HUMAN_DESCRIPTION_ONLY',
  'NEAR_HUMAN_NPC_ONLY', 'NEAR_HUMAN_CAPTION_ONLY', 'GENERIC_RULE_RECORD', 'FORCE_TRADITION_NOT_PLAYABLE', 'MISIDENTIFIED_RECORD',
  'NOT_A_SEPARATE_SPECIES_BLOCK', 'PUBLISHED_PLAYABLE_PROFILE']);
const pack = readFileSync('packs/species.db', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

test('every outside-inventory species has a classified provenance entry with evidence', () => {
  assert.equal(Object.keys(prov).length, 41);
  for (const [name, e] of Object.entries(prov)) {
    assert.ok(KNOWN.has(e.classification), `${name}: unknown classification`);
    assert.ok(e.evidence && e.evidence.length > 20, `${name}: missing evidence`);
    assert.ok(pack.some(d => d.name === name), `${name}: not a pack species`);
    assert.ok(doc.includes(`| ${name}`), `${name}: missing from generated doc`);
  }
});

test('nothing outside the audited inventory was silently hydrated or removed', () => {
  for (const name of Object.keys(prov)) {
    const d = pack.find(x => x.name === name);
    assert.ok(d, `${name} must still exist (no deletion/rename)`);
    const variants = d.system?.variants ?? [];
    assert.ok(!variants.some(v => v.completeSnapshot), `${name}: unaudited species must not carry a complete snapshot`);
  }
});

test('only a printed species block is classified as a playable profile', () => {
  const playable = Object.entries(prov).filter(([, e]) => e.classification === 'PUBLISHED_PLAYABLE_PROFILE').map(([n]) => n);
  assert.deepEqual(playable, ['Replica Droid']);
  assert.match(prov['Replica Droid'].evidence, /Threats of the Galaxy line \d+/);
});

test('O\'reenian near-Human question is registered, not decided', () => {
  const reg = readFileSync('docs/audits/swse-rules-decisions-pending.md', 'utf8');
  assert.match(reg, /SPECIES-RD-020/);
  assert.match(reg, /Recommended ruling \| none/);
});
