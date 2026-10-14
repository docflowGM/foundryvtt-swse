import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { observeSpecies, isApplied, hasAnyEffect } from './helpers/species-trait-observer.mjs';

// Trait-level verification of the Core Rulebook species against the printed species-traits blocks
// (reference/sourcebooks/Core Rulebook_djvu.txt, the searchable layer; the PDF stays the final authority).
// Three independent checks per species:
//   1. the set of printed trait names equals the pack record's traits (modulo the fixture's aliases);
//   2. each trait's key words appear in BOTH the printed block and the pack's player-facing text (no unprinted weapons,
//      no dropped bonus types, no invented text);
//   3. the CURRENT automation state declared in the fixture matches what the engine really does ("automated" must be
//      applied, "display-only" must have no effect at all, "partial" must be applied for its automated part).
// Rules text is not reproduced here; only names and short key words.

const fx = JSON.parse(readFileSync(new URL('./fixtures/species-printed-traits-core.json', import.meta.url), 'utf8'));
const book = readFileSync(new URL('../reference/sourcebooks/Core Rulebook_djvu.txt', import.meta.url), 'utf8').split('\n');
const packs = Object.fromEntries(readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean)
  .map(l => JSON.parse(l)).map(r => [r.name, r.system]));
const flat = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function printedBlock(start) {
  const out = [];
  for (let i = start - 1; i < Math.min(book.length, start + 95); i++) {
    out.push(book[i]);
    if (i > start + 3 && /^[\s©*®•\-]*(Automatic )?Languages?\s*[:;]/.test(book[i])) { out.push(book[i + 1] ?? '', book[i + 2] ?? ''); break; }
  }
  return flat(out.join(' '));
}

assert.equal(Object.keys(fx.species).length, 19, 'all 19 Core profiles are covered');
const tally = { automated: 0, partial: 0, 'display-only': 0 };

for (const [name, spec] of Object.entries(fx.species)) {
  const rec = packs[name];
  assert.ok(rec, `${name}: pack record`);
  const block = printedBlock(spec.line);

  // 1. printed trait names <-> pack traits (a printed trait may be split into several pack traits via packTraits)
  const expected = spec.traits.flatMap(t => t.packTraits ?? [t.name]).map(flat).sort();
  const actual = (rec.canonicalTraits ?? []).map(t => flat(t.name)).sort();
  assert.deepEqual(actual, expected, `${name}: pack traits must be exactly the printed traits`);
  assert.deepEqual((rec.special ?? []).map(flat).sort(), expected, `${name}: special[] must list the same traits`);

  const observed = await observeSpecies(name);
  for (const t of spec.traits) {
    // 2. printed + pack text key words
    const packText = flat((rec.canonicalTraits ?? []).filter(c => (t.packTraits ?? [t.name]).map(flat).includes(flat(c.name))).map(c => c.description).join(' '));
    for (const w of t.tokens ?? []) {
      assert.ok(block.includes(flat(w)), `${name} / ${t.name}: "${w}" must appear in the printed block`);
      assert.ok(packText.includes(flat(w)), `${name} / ${t.name}: "${w}" must appear in the pack text`);
    }
    // 3. measured automation state
    tally[t.automation]++;
    if (t.automation === 'automated') assert.ok(isApplied(observed, t.mechanic), `${name} / ${t.name}: declared automated but not applied`);
    else if (t.automation === 'partial') assert.ok(isApplied(observed, t.mechanic), `${name} / ${t.name}: declared partial but its automated part is missing`);
    else {
      assert.equal(t.automation, 'display-only');
      assert.ok(!hasAnyEffect(observed, t.mechanic), `${name} / ${t.name}: declared display-only but the engine applies it (update the fixture)`);
    }
  }
}

// Specific corrections found by this verification
assert.match(packs.Gungan.canonicalTraits.find(t => t.name === 'Weapon Familiarity').description, /atlatl and the cesta/i);
assert.ok(!/electropole/i.test(packs.Gungan.canonicalTraits.find(t => t.name === 'Weapon Familiarity').description), 'Core Gungan text prints only the atlatl and the cesta (the electropole is an Unknown Regions weapon entry)');
assert.match(packs.Hutt.canonicalTraits.find(t => t.name === 'Force Resistance').description, /species bonus/i, 'the printed +5 is a species bonus');
for (const [n, skill] of [['Duros', 'pilot'], ['Aqualish', 'swim']]) {
  const o = await observeSpecies(n);
  assert.deepEqual(o.rerolls.filter(r => r.target === skill).map(r => r.outcome), ['mustAccept'], `${n}: printed "must be accepted even if it is worse"`);
}

console.log('species-core-trait-verification:', JSON.stringify(tally));
