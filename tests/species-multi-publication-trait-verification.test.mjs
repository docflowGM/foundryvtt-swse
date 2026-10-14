import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { observeSpecies, isApplied, hasAnyEffect } from './helpers/species-trait-observer.mjs';

// Trait-level verification of every audited publication of the seven multi-publication species (Bith, Chadra-Fan, Chagrian,
// Chiss, Krevaaki, Neimoidian, Yuuzhan Vong), each against ITS OWN sourcebook text (OCR search layer; the PDF stays authoritative).
// Per snapshot: printed trait names == snapshot traits; key words in the printed block AND the snapshot text; ability modifiers
// and automatic languages as printed; measured automation state. Then independence checks: where two publications print
// different mechanics, neither snapshot may carry the other's.

const fx = JSON.parse(readFileSync(new URL('./fixtures/species-printed-traits-multi.json', import.meta.url), 'utf8')).variants;
const books = {};
const bookLines = b => (books[b] ??= readFileSync(new URL(`../reference/sourcebooks/${b}_djvu.txt`, import.meta.url), 'utf8').split('\n'));
const recs = Object.fromEntries(readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean)
  .map(l => JSON.parse(l)).map(r => [r.name, r.system]));
const flat = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const mods = s => String(s).split(',').map(x => x.trim().toLowerCase()).filter(Boolean).sort();

function printedBlock(book, start, window = null) {
  const lines = bookLines(book), out = [];
  for (let i = start - 1; i < Math.min(lines.length, start + (window ?? 80)); i++) {
    out.push(lines[i]);
    if (!window && i > start + 3 && /^[\s©*®•\-]*(Automatic )?Languages?\s*[:;]/.test(lines[i])) { out.push(lines[i + 1] ?? '', lines[i + 2] ?? ''); break; }
  }
  return flat(out.join(' '));
}

assert.equal(Object.keys(fx).length, 15, 'every audited snapshot of the seven multi-publication species is covered');
const tally = { automated: 0, partial: 0, 'display-only': 0 };

for (const [vid, e] of Object.entries(fx)) {
  const variant = recs[e.species].variants.find(v => v.id === vid);
  assert.ok(variant?.completeSnapshot === true, `${vid}: complete snapshot`);
  const block = printedBlock(e.book, e.line, e.window);

  assert.deepEqual((variant.traits ?? []).map(t => flat(t.name)).sort(), e.traits.map(t => flat(t.name)).sort(), `${vid}: snapshot traits must be exactly the printed traits`);
  assert.deepEqual(mods(variant.abilities), mods(e.mods), `${vid}: ability modifiers as printed`);
  assert.deepEqual([...variant.languages].sort(), [...e.langs].sort(), `${vid}: automatic languages as printed`);

  const obs = await observeSpecies(e.species, vid);
  for (const t of e.traits) {
    assert.ok(block.includes(flat((t.printedAs ?? t.name).replace(/^Grasping /, ''))) || t.name === 'Skills', `${vid}: printed name "${t.name}" must appear in the printed block of ${e.book}`);
    const text = flat((variant.traits ?? []).filter(x => flat(x.name) === flat(t.name)).map(x => x.description).join(' '));
    for (const w of t.tokens ?? []) {
      assert.ok(block.includes(flat(w)), `${vid} / ${t.name}: "${w}" must appear in the printed block of ${e.book}`);
      assert.ok(text.includes(flat(w)), `${vid} / ${t.name}: "${w}" must appear in the snapshot text`);
    }
    tally[t.automation]++;
    if (t.automation === 'display-only') assert.ok(!hasAnyEffect(obs, t.mechanic), `${vid} / ${t.name}: declared display-only but the engine applies it (update the fixture)`);
    else assert.ok(isApplied(obs, t.mechanic), `${vid} / ${t.name}: declared ${t.automation} but not applied`);
  }
}

// ---- Publication independence: different printed mechanics never cross-contaminate ----
const O = (n, v) => observeSpecies(n, v);
{ // Yuuzhan Vong: Core Technophobic is a -5 penalty; Legacy Era Technophobic is starting-proficiency suppression
  const core = await O('Yuuzhan Vong', 'yuuzhan-vong-core-2a-21'), leg = await O('Yuuzhan Vong', 'yuuzhan-vong-leg-2c-07');
  assert.deepEqual([core.suppressedProficiencies.length, core.primitive], [0, false]);
  assert.deepEqual([leg.suppressedProficiencies.length, leg.primitive], [3, true]);
}
{ // Chagrian: "can't drown" (Legacy) vs "breathe normally in water" (Clone Wars)
  assert.ok((await O('Chagrian', 'chagrian-leg-2c-01')).immunities.includes('drowning'));
  assert.ok(!(await O('Chagrian', 'chagrian-cw-2h-11')).immunities.includes('drowning'));
}
{ // Bith: only the Threats of the Galaxy version carries Heightened Awareness
  assert.ok((await O('Bith', 'bith-tog-2k-01')).rerolls.some(r => r.target === 'perception'));
  assert.ok(!(await O('Bith', 'bith-goi-2g-01')).rerolls.some(r => r.target === 'perception'));
}
{ // Chadra-Fan: only the Unknown Regions version prints Heightened Awareness
  assert.ok((await O('Chadra-Fan', 'chadra-fan-ur-2b-02')).rerolls.some(r => r.target === 'perception'));
  assert.ok(!(await O('Chadra-Fan', 'chadra-fan-leg-2c-12')).rerolls.some(r => r.target === 'perception'));
}
{ // Neimoidian: the Core version grants Deception Skill Focus conditionally and prints no Persuasion feat
  const c = await O('Neimoidian', 'neimoidian-core-2a-20');
  assert.deepEqual(c.deferredFeats.map(g => g.name), ['Skill Focus (Deception)']);
}
// Evolved Intellect differs between the two Bith publications
{
  const goi = recs.Bith.variants.find(v => v.id === 'bith-goi-2g-01').traits.find(t => t.name === 'Evolved Intellect').description;
  const tog = recs.Bith.variants.find(v => v.id === 'bith-tog-2k-01').traits.find(t => t.name === 'Evolved Intellect').description;
  assert.notEqual(flat(goi), flat(tog));
  assert.match(goi, /force point/i); assert.doesNotMatch(tog, /force point/i);
}

console.log('species-multi-publication-trait-verification:', JSON.stringify(tally));
